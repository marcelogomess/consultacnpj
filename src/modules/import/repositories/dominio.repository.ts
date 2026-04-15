import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaisData } from '../parsers/pais.parser';
import { MunicipioData } from '../parsers/municipio.parser';
import { QualificacaoData } from '../parsers/qualificacao.parser';
import { NaturezaJuridicaData } from '../parsers/natureza-juridica.parser';
import { CnaeData } from '../parsers/cnae.parser';
import { MotivoData } from '../parsers/motivo.parser';

@Injectable()
export class DominioRepository {
  private readonly logger = new Logger(DominioRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertPaises(records: PaisData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO paises (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }

  async upsertMunicipios(records: MunicipioData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO municipios (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }

  async upsertQualificacoes(records: QualificacaoData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO qualificacoes_socios (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }

  async upsertNaturezasJuridicas(records: NaturezaJuridicaData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO naturezas_juridicas (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }

  async upsertCnaes(records: CnaeData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO cnaes (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }

  async upsertMotivos(records: MotivoData[]): Promise<number> {
    if (records.length === 0) return 0;
    await this.prisma.$executeRaw`
      INSERT INTO motivos_situacao_cadastral (codigo, descricao)
      VALUES ${Prisma.join(records.map((r) => Prisma.sql`(${r.codigo}, ${r.descricao})`))}
      ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    `;
    return records.length;
  }
}
