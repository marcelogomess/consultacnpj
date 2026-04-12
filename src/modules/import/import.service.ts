import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    // ORDEM OBRIGATÓRIA: domínio primeiro, depois principais
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
      { padrao: /NATJUCSV/i, nome: 'Naturezas Jurídicas', fn: this.importarNaturezasJuridicas.bind(this) },
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

    // Empresas
    const arquivosEmpresa = this.encontrarArquivos(/EMPRECSV/i);
    for (const arquivo of arquivosEmpresa) {
      try {
        const registros = await this.importarEmpresas(arquivo);
        resultados.push({ arquivo, registros, sucesso: true });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    // Estabelecimentos
    const arquivosEstab = this.encontrarArquivos(/ESTABELE/i);
    for (const arquivo of arquivosEstab) {
      try {
        const registros = await this.importarEstabelecimentos(arquivo);
        resultados.push({ arquivo, registros, sucesso: true });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    // Sócios
    const arquivosSocio = this.encontrarArquivos(/SOCIOCSV/i);
    for (const arquivo of arquivosSocio) {
      try {
        const registros = await this.importarSocios(arquivo);
        resultados.push({ arquivo, registros, sucesso: true });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    // Simples Nacional
    const arquivosSimples = this.encontrarArquivos(/SIMPLES/i);
    for (const arquivo of arquivosSimples) {
      try {
        const registros = await this.importarSimples(arquivo);
        resultados.push({ arquivo, registros, sucesso: true });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        resultados.push({ arquivo, registros: 0, sucesso: false, erro });
      }
    }

    return resultados;
  }

  private encontrarArquivo(padrao: RegExp): string | null {
    const arquivos = this.encontrarArquivos(padrao);
    return arquivos[0] ?? null;
  }

  private encontrarArquivos(padrao: RegExp): string[] {
    if (!fs.existsSync(this.downloadDir)) return [];
    return fs
      .readdirSync(this.downloadDir)
      .filter((f) => padrao.test(f))
      .map((f) => path.join(this.downloadDir, f));
  }

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

  async importarEmpresas(arquivo: string): Promise<number> {
    const parser = new EmpresaParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.empresaRepo.upsertBatch(batch);
    }
    this.logger.log(`Empresas importadas: ${total}`);
    return total;
  }

  async importarEstabelecimentos(arquivo: string): Promise<number> {
    const parser = new EstabelecimentoParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.estabelecimentoRepo.upsertBatch(batch);
    }
    this.logger.log(`Estabelecimentos importados: ${total}`);
    return total;
  }

  async importarSocios(arquivo: string): Promise<number> {
    const parser = new SocioParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      total += await this.socioRepo.insertBatch(batch);
    }
    this.logger.log(`Sócios importados: ${total}`);
    return total;
  }

  async importarSimples(arquivo: string): Promise<number> {
    const parser = new SimplesParser();
    let total = 0;
    for await (const batch of parser.stream(arquivo, this.batchSize)) {
      const result = await this.prisma.$transaction(
        batch.map((r) =>
          this.prisma.simplesNacional.upsert({
            where: { cnpjBasico: r.cnpjBasico },
            create: {
              cnpjBasico: r.cnpjBasico,
              opcaoSimples: r.opcaoSimples,
              dataOpcaoSimples: r.dataOpcaoSimples,
              dataExclusaoSimples: r.dataExclusaoSimples,
              opcaoMei: r.opcaoMei,
              dataOpcaoMei: r.dataOpcaoMei,
              dataExclusaoMei: r.dataExclusaoMei,
            },
            update: {
              opcaoSimples: r.opcaoSimples,
              dataOpcaoSimples: r.dataOpcaoSimples,
              dataExclusaoSimples: r.dataExclusaoSimples,
              opcaoMei: r.opcaoMei,
              dataOpcaoMei: r.dataOpcaoMei,
              dataExclusaoMei: r.dataExclusaoMei,
            },
          }),
        ),
      );
      total += result.length;
    }
    this.logger.log(`Simples Nacional importados: ${total}`);
    return total;
  }
}
