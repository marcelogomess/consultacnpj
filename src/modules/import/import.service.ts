import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
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

  private async importarDominios(): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    const dominioTarefas = [
      { padrao: /PAISCSV/i, nome: 'Países', fn: this.importarPaises.bind(this) },
      { padrao: /MUNICCSV/i, nome: 'Municípios', fn: this.importarMunicipios.bind(this) },
      { padrao: /QUALSCSV/i, nome: 'Qualificações', fn: this.importarQualificacoes.bind(this) },
      {
        padrao: /NATJUCSV/i,
        nome: 'Naturezas Jurídicas',
        fn: this.importarNaturezasJuridicas.bind(this),
      },
      { padrao: /CNAECSV/i, nome: 'CNAEs', fn: this.importarCnaes.bind(this) },
      { padrao: /MOTICSV/i, nome: 'Motivos', fn: this.importarMotivos.bind(this) },
    ];

    for (const tarefa of dominioTarefas) {
      const arquivo = this.encontrarArquivo(tarefa.padrao);
      if (!arquivo) {
        this.logger.warn(`Arquivo não encontrado para ${tarefa.nome}`);
        continue;
      }
      try {
        const registros = await tarefa.fn(arquivo);
        resultados.push({ arquivo, registros, sucesso: true });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao importar ${tarefa.nome}: ${erro}`);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    return resultados;
  }

  private async importarPrincipais(): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    // Empresas — múltiplos arquivos em paralelo controlado
    const arquivosEmpresa = this.encontrarArquivos(/EMPRECSV/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosEmpresa, (f) => this.importarEmpresas(f))),
    );

    // Estabelecimentos — múltiplos arquivos em paralelo controlado
    const arquivosEstab = this.encontrarArquivos(/ESTABELE/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosEstab, (f) => this.importarEstabelecimentos(f))),
    );

    // Sócios — trunca antes de importar (sem chave natural, substituição completa)
    this.logger.log('Limpando tabela socios para reimportação...');
    await this.socioRepo.truncate();
    const arquivosSocio = this.encontrarArquivos(/SOCIOCSV/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosSocio, (f) => this.importarSocios(f))),
    );

    // Simples Nacional — trunca antes de importar (substituição completa)
    this.logger.log('Limpando tabela simples_nacional para reimportação...');
    await this.prisma.$executeRaw`TRUNCATE TABLE simples_nacional`;
    const arquivosSimples = this.encontrarArquivos(/SIMPLES/i);
    resultados.push(
      ...(await this.processarEmParalelo(arquivosSimples, (f) => this.importarSimples(f))),
    );

    return resultados;
  }

  /**
   * Processa uma lista de arquivos com concorrência limitada.
   * Evita sobrecarregar o banco com muitas conexões paralelas.
   */
  private async processarEmParalelo(
    arquivos: string[],
    fn: (arquivo: string) => Promise<number>,
  ): Promise<ImportacaoResultado[]> {
    const resultados: ImportacaoResultado[] = [];

    for (let i = 0; i < arquivos.length; i += CONCORRENCIA_ARQUIVOS) {
      const lote = arquivos.slice(i, i + CONCORRENCIA_ARQUIVOS);
      const settled = await Promise.allSettled(lote.map((f) => fn(f)));

      settled.forEach((resultado, idx) => {
        const arquivo = lote[idx];
        if (resultado.status === 'fulfilled') {
          resultados.push({ arquivo, registros: resultado.value, sucesso: true });
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

  private encontrarArquivo(padrao: RegExp): string | null {
    return this.encontrarArquivos(padrao)[0] ?? null;
  }

  private encontrarArquivos(padrao: RegExp): string[] {
    if (!fs.existsSync(this.downloadDir)) return [];
    return fs
      .readdirSync(this.downloadDir)
      .filter((f) => padrao.test(f))
      .map((f) => path.join(this.downloadDir, f));
  }

  // ---------------------------------------------------------------------------
  // Importações de domínio
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
  // Importações principais — com log de progresso por batch
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
      // Chunking interno para respeitar limite de parâmetros do PostgreSQL
      for (let i = 0; i < records.length; i += SIMPLES_MAX_ROWS) {
        const chunk = records.slice(i, i + SIMPLES_MAX_ROWS);
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
            opcao_simples        = EXCLUDED.opcao_simples,
            data_opcao_simples   = EXCLUDED.data_opcao_simples,
            data_exclusao_simples = EXCLUDED.data_exclusao_simples,
            opcao_mei            = EXCLUDED.opcao_mei,
            data_opcao_mei       = EXCLUDED.data_opcao_mei,
            data_exclusao_mei    = EXCLUDED.data_exclusao_mei,
            updated_at           = NOW()
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
