import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularMd5Arquivo } from '../../common/utils/md5.util';
import { EmpresaParser } from './parsers/empresa.parser';
import { EstabelecimentoParser } from './parsers/estabelecimento.parser';
import { SocioParser } from './parsers/socio.parser';
import { SimplesParser } from './parsers/simples.parser';
import { PaisParser } from './parsers/pais.parser';
import { MunicipioParser } from './parsers/municipio.parser';
import { QualificacaoParser } from './parsers/qualificacao.parser';
import { NaturezaJuridicaParser } from './parsers/natureza-juridica.parser';
import { CnaeParser } from './parsers/cnae.parser';
import { MotivoParser } from './parsers/motivo.parser';
import { DominioRepository } from './repositories/dominio.repository';
import { EmpresaRepository } from './repositories/empresa.repository';
import { EstabelecimentoRepository } from './repositories/estabelecimento.repository';
import { SocioRepository } from './repositories/socio.repository';

export interface ImportacaoResultado {
  arquivo: string;
  registros: number;
  sucesso: boolean;
  ignorado?: boolean;
  md5?: string;
  erro?: string;
}

// Número máximo de arquivos processados em paralelo (EMPRECSV0-9, ESTABELE0-9, etc.)
const CONCORRENCIA_ARQUIVOS = 2;

// Simples tem 7 bind params por linha (NOW() não conta como parâmetro).
// Limite Prisma: 32.767 bind variables → usamos 32.000 com margem.
const SIMPLES_BIND_PARAMS = 7;
const SIMPLES_MAX_ROWS = Math.floor(32000 / SIMPLES_BIND_PARAMS); // 4.571

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly batchSize: number;
  private readonly downloadDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dominioRepo: DominioRepository,
    private readonly empresaRepo: EmpresaRepository,
    private readonly estabelecimentoRepo: EstabelecimentoRepository,
    private readonly socioRepo: SocioRepository,
  ) {
    this.batchSize = this.config.get<number>('app.importBatchSize') ?? 5000;
    this.downloadDir = this.config.get<string>('app.downloadDir') ?? '/data/downloads';
  }

  async importarTudo(): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    // ORDEM OBRIGATÓRIA: domínio primeiro (FKs), depois principais
    resultados.push(...(await this.importarDominios()));
    resultados.push(...(await this.importarPrincipais()));

    return resultados;
  }

  // ---------------------------------------------------------------------------
  // Controle de deduplicação por MD5
  // ---------------------------------------------------------------------------

  /**
   * Verifica se um arquivo com este MD5 já foi importado com sucesso.
   */
  private async jaFoiImportadoComSucesso(md5: string): Promise<boolean> {
    const log = await this.prisma.importLog.findFirst({
      where: { md5, status: 'SUCESSO' },
    });
    return log !== null;
  }

  /**
   * Registra o resultado de uma importação na tabela import_logs.
   */
  private async gravarImportLog(
    tipo: string,
    arquivo: string,
    md5: string,
    status: string,
    registros: number,
    iniciadoEm: Date,
    erro?: string,
  ): Promise<void> {
    await this.prisma.importLog.create({
      data: {
        tipo,
        arquivo,
        md5,
        status,
        registros,
        erro: erro ?? null,
        iniciadoEm,
        finalizadoEm: new Date(),
      },
    });
  }

  /**
   * Processa um único arquivo com controle de MD5:
   * - Calcula o MD5 do arquivo
   * - Se já foi importado com sucesso, ignora
   * - Caso contrário, executa a importação e registra o log
   * - Re-lança erros para que o chamador possa capturá-los via allSettled
   */
  private async processarArquivo(
    arquivo: string,
    tipo: string,
    fn: (arquivo: string) => Promise<number>,
  ): Promise<ImportacaoResultado> {
    const nome = path.basename(arquivo);
    const md5 = await calcularMd5Arquivo(arquivo);

    if (await this.jaFoiImportadoComSucesso(md5)) {
      this.logger.log(`[${nome}] Ignorado — já importado com sucesso (MD5: ${md5})`);
      return { arquivo, registros: 0, sucesso: true, ignorado: true, md5 };
    }

    const iniciadoEm = new Date();
    try {
      const registros = await fn(arquivo);
      await this.gravarImportLog(tipo, nome, md5, 'SUCESSO', registros, iniciadoEm);
      return { arquivo, registros, sucesso: true, md5 };
    } catch (err) {
      const erro = err instanceof Error ? err.message : String(err);
      await this.gravarImportLog(tipo, nome, md5, 'ERRO', 0, iniciadoEm, erro);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Orquestradores de arquivos
  // ---------------------------------------------------------------------------

  /**
   * Processa arquivos com concorrência limitada.
   * Cada arquivo é verificado individualmente pelo MD5 antes de ser processado.
   */
  private async processarEmParalelo(
    arquivos: string[],
    tipo: string,
    fn: (arquivo: string) => Promise<number>,
  ): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    for (let i = 0; i < arquivos.length; i += CONCORRENCIA_ARQUIVOS) {
      const lote = arquivos.slice(i, i + CONCORRENCIA_ARQUIVOS);
      const settled = await Promise.allSettled(
        lote.map((f) => this.processarArquivo(f, tipo, fn)),
      );

      settled.forEach((resultado, idx) => {
        const arquivo = lote[idx];
        if (resultado.status === 'fulfilled') {
          resultados.push(resultado.value);
        } else {
          const erro =
            resultado.reason instanceof Error
              ? resultado.reason.message
              : String(resultado.reason);
          this.logger.error(`Falha em ${path.basename(arquivo)}: ${erro}`);
          resultados.push({ arquivo, registros: 0, sucesso: false, erro });
        }
      });
    }

    return resultados;
  }

  // ---------------------------------------------------------------------------
  // Importações de domínio (upsert — verificação individual por MD5)
  // ---------------------------------------------------------------------------

  private async importarDominios(): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    const dominioTarefas = [
      { padrao: /PAISCSV/i, tipo: 'PAIS', fn: this.importarPaises.bind(this) },
      { padrao: /MUNICCSV/i, tipo: 'MUNICIPIO', fn: this.importarMunicipios.bind(this) },
      { padrao: /QUALSCSV/i, tipo: 'QUALIFICACAO', fn: this.importarQualificacoes.bind(this) },
      { padrao: /NATJUCSV/i, tipo: 'NATUREZA', fn: this.importarNaturezasJuridicas.bind(this) },
      { padrao: /CNAECSV/i, tipo: 'CNAE', fn: this.importarCnaes.bind(this) },
      { padrao: /MOTICSV/i, tipo: 'MOTIVO', fn: this.importarMotivos.bind(this) },
    ];

    for (const tarefa of dominioTarefas) {
      const arquivo = this.encontrarArquivo(tarefa.padrao);
      if (!arquivo) {
        this.logger.warn(`Arquivo não encontrado para ${tarefa.tipo}`);
        continue;
      }
      try {
        resultados.push(await this.processarArquivo(arquivo, tarefa.tipo, tarefa.fn));
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao importar ${tarefa.tipo}: ${erro}`);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    return resultados;
  }

  // ---------------------------------------------------------------------------
  // Importações principais
  // ---------------------------------------------------------------------------

  private async importarPrincipais(): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    // Empresas — upsert, verificação individual por MD5
    const arquivosEmpresa = this.encontrarArquivos(/EMPRECSV/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosEmpresa, 'EMPRESA', (f) =>
        this.importarEmpresas(f),
      )),
    );

    // Estabelecimentos — pré-carrega FKs em memória antes do loop (elimina subqueries por linha)
    const arquivosEstab = this.encontrarArquivos(/ESTABELE/i);
    if (arquivosEstab.length > 0) {
      await this.estabelecimentoRepo.inicializar();
    }
    resultados.push(
      ...(await this.processarEmParalelo(arquivosEstab, 'ESTABELECIMENTO', (f) =>
        this.importarEstabelecimentos(f),
      )),
    );

    // Sócios — upsert por empresa: delete+insert por cnpj_basico, verificação
    // individual de MD5. Preserva sócios de empresas não presentes no arquivo.
    const arquivosSocio = this.encontrarArquivos(/SOCIOCSV/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosSocio, 'SOCIO', (f) => this.importarSocios(f))),
    );

    // Simples Nacional — upsert: ON CONFLICT DO UPDATE SET, verificação individual de MD5
    const arquivosSimples = this.encontrarArquivos(/SIMPLES/i);
    resultados.push(
      ...(await this.processarEmParalelo(
        arquivosSimples,
        'SIMPLES',
        (f) => this.importarSimples(f),
      )),
    );

    return resultados;
  }

  private encontrarArquivo(padrao: RegExp): string | null {
    return this.encontrarArquivos(padrao)[0] ?? null;
  }

  private encontrarArquivos(padrao: RegExp): string[] {
    if (!fs.existsSync(this.downloadDir)) return [];
    return fs
      .readdirSync(this.downloadDir)
      .filter((f) => padrao.test(f) && !f.toLowerCase().endsWith('.zip'))
      .map((f) => path.join(this.downloadDir, f));
  }

  // ---------------------------------------------------------------------------
  // Parsers de domínio
  // ---------------------------------------------------------------------------

  async importarPaises(arquivo: string): Promise<number> {
    const parser = new PaisParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertPaises(batch);
    }
    this.logger.log(`Países importados: ${total}`);
    return total;
  }

  async importarMunicipios(arquivo: string): Promise<number> {
    const parser = new MunicipioParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertMunicipios(batch);
    }
    this.logger.log(`Municípios importados: ${total}`);
    return total;
  }

  async importarQualificacoes(arquivo: string): Promise<number> {
    const parser = new QualificacaoParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertQualificacoes(batch);
    }
    return total;
  }

  async importarNaturezasJuridicas(arquivo: string): Promise<number> {
    const parser = new NaturezaJuridicaParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertNaturezasJuridicas(batch);
    }
    return total;
  }

  async importarCnaes(arquivo: string): Promise<number> {
    const parser = new CnaeParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertCnaes(batch);
    }
    return total;
  }

  async importarMotivos(arquivo: string): Promise<number> {
    const parser = new MotivoParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.dominioRepo.upsertMotivos(batch);
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // Parsers principais — com log de progresso por batch
  // ---------------------------------------------------------------------------

  async importarEmpresas(arquivo: string): Promise<number> {
    const parser = new EmpresaParser();
    const nome = path.basename(arquivo);
    let total = 0;
    let batch = 0;
    for await (const records of parser.stream(arquivo, this.batchSize)) {
      total += await this.empresaRepo.upsertBatch(records);
      batch++;
      if (batch % 10 === 0) {
        this.logger.log(`[${nome}] ${total.toLocaleString()} empresas inseridas...`);
      }
    }
    this.logger.log(`[${nome}] Concluído: ${total.toLocaleString()} empresas`);
    return total;
  }

  async importarEstabelecimentos(arquivo: string): Promise<number> {
    const parser = new EstabelecimentoParser();
    const nome = path.basename(arquivo);
    let total = 0;
    let batch = 0;
    for await (const records of parser.stream(arquivo, this.batchSize)) {
      total += await this.estabelecimentoRepo.upsertBatch(records);
      batch++;
      if (batch % 10 === 0) {
        this.logger.log(`[${nome}] ${total.toLocaleString()} estabelecimentos inseridos...`);
      }
    }
    this.logger.log(`[${nome}] Concluído: ${total.toLocaleString()} estabelecimentos`);
    return total;
  }

  async importarSocios(arquivo: string): Promise<number> {
    const parser = new SocioParser();
    const nome = path.basename(arquivo);
    let total = 0;
    let batch = 0;
    for await (const records of parser.stream(arquivo, this.batchSize)) {
      total += await this.socioRepo.insertBatch(records);
      batch++;
      if (batch % 10 === 0) {
        this.logger.log(`[${nome}] ${total.toLocaleString()} sócios inseridos...`);
      }
    }
    this.logger.log(`[${nome}] Concluído: ${total.toLocaleString()} sócios`);
    return total;
  }

  async importarSimples(arquivo: string): Promise<number> {
    const parser = new SimplesParser();
    const nome = path.basename(arquivo);
    let total = 0;
    let batch = 0;

    for await (const records of parser.stream(arquivo, this.batchSize)) {
      // Uma única query IN por batch identifica quais cnpj_basico existem em empresas.
      // Substitui o WHERE EXISTS por linha (correlated subquery), eliminando N lookups
      // individuais e substituindo por uma única operação de conjunto no PostgreSQL.
      const allCnpjs = [...new Set(records.map((r) => r.cnpjBasico))];
      const validRows = await this.prisma.$queryRaw<{ cnpj_basico: string }[]>`
        SELECT cnpj_basico FROM empresas
        WHERE cnpj_basico IN (${Prisma.join(allCnpjs.map((c) => Prisma.sql`${c}`))})
      `;
      const validSet = new Set(validRows.map((r) => r.cnpj_basico));
      const filtered = records.filter((r) => validSet.has(r.cnpjBasico));

      for (let i = 0; i < filtered.length; i += SIMPLES_MAX_ROWS) {
        const chunk = filtered.slice(i, i + SIMPLES_MAX_ROWS);
        await this.prisma.$executeRaw`
          INSERT INTO simples_nacional
            (cnpj_basico, opcao_simples, data_opcao_simples, data_exclusao_simples,
             opcao_mei, data_opcao_mei, data_exclusao_mei, updated_at)
          VALUES ${Prisma.join(
            chunk.map(
              (r) =>
                Prisma.sql`(${r.cnpjBasico}, ${r.opcaoSimples}, ${r.dataOpcaoSimples}, ${r.dataExclusaoSimples},
                 ${r.opcaoMei}, ${r.dataOpcaoMei}, ${r.dataExclusaoMei}, NOW())`,
            ),
          )}
          ON CONFLICT (cnpj_basico) DO UPDATE SET
            opcao_simples         = EXCLUDED.opcao_simples,
            data_opcao_simples    = EXCLUDED.data_opcao_simples,
            data_exclusao_simples = EXCLUDED.data_exclusao_simples,
            opcao_mei             = EXCLUDED.opcao_mei,
            data_opcao_mei        = EXCLUDED.data_opcao_mei,
            data_exclusao_mei     = EXCLUDED.data_exclusao_mei,
            updated_at            = NOW()
        `;
        total += chunk.length;
      }

      batch++;
      if (batch % 10 === 0) {
        this.logger.log(`[${nome}] ${total.toLocaleString()} registros Simples inseridos...`);
      }
    }

    this.logger.log(`[${nome}] Concluído: ${total.toLocaleString()} registros Simples`);
    return total;
  }
}
