import { Injectable, Logger } from '@nestjs/common';
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
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.pais.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }

  async upsertMunicipios(records: MunicipioData[]): Promise<number> {
    if (records.length === 0) return 0;
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.municipio.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }

  async upsertQualificacoes(records: QualificacaoData[]): Promise<number> {
    if (records.length === 0) return 0;
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.qualificacaoSocio.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }

  async upsertNaturezasJuridicas(records: NaturezaJuridicaData[]): Promise<number> {
    if (records.length === 0) return 0;
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.naturezaJuridica.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }

  async upsertCnaes(records: CnaeData[]): Promise<number> {
    if (records.length === 0) return 0;
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.cnae.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }

  async upsertMotivos(records: MotivoData[]): Promise<number> {
    if (records.length === 0) return 0;
    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.motivoSituacaoCadastral.upsert({
          where: { codigo: r.codigo },
          create: r,
          update: { descricao: r.descricao },
        }),
      ),
    );
    return result.length;
  }
}
