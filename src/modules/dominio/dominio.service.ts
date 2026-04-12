import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DominioService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPaises() {
    return this.prisma.pais.findMany({ orderBy: { descricao: 'asc' } });
  }

  async listarMunicipios(uf?: string) {
    // A tabela de municípios não tem coluna UF direta; filtramos pelos estabelecimentos
    // Para filtro por UF, retornamos todos e deixamos o caller filtrar, ou buscamos
    // municípios que aparecem em estabelecimentos da UF informada.
    if (uf) {
      const municipiosCodes = await this.prisma.estabelecimento.findMany({
        where: {
          uf: uf.toUpperCase(),
          municipioCodigo: { not: null },
        },
        select: { municipioCodigo: true },
        distinct: ['municipioCodigo'],
      });
      const codes = municipiosCodes
        .map((e) => e.municipioCodigo)
        .filter((c): c is string => c !== null);
      return this.prisma.municipio.findMany({
        where: { codigo: { in: codes } },
        orderBy: { descricao: 'asc' },
      });
    }
    return this.prisma.municipio.findMany({ orderBy: { descricao: 'asc' } });
  }

  async listarCnaes(q?: string) {
    return this.prisma.cnae.findMany({
      where: q
        ? { descricao: { contains: q, mode: 'insensitive' } }
        : undefined,
      orderBy: { codigo: 'asc' },
    });
  }

  async listarNaturezasJuridicas() {
    return this.prisma.naturezaJuridica.findMany({ orderBy: { codigo: 'asc' } });
  }

  async listarQualificacoes() {
    return this.prisma.qualificacaoSocio.findMany({ orderBy: { codigo: 'asc' } });
  }

  async listarMotivosSituacao() {
    return this.prisma.motivoSituacaoCadastral.findMany({ orderBy: { codigo: 'asc' } });
  }
}
