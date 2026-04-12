import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Empresa } from '../../../domain/empresa';

@Injectable()
export class EmpresaRepository {
  private readonly logger = new Logger(EmpresaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertBatch(records: Empresa[]): Promise<number> {
    if (records.length === 0) return 0;

    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.empresa.upsert({
          where: { cnpjBasico: r.cnpjBasico },
          create: {
            cnpjBasico: r.cnpjBasico,
            razaoSocial: r.razaoSocial,
            naturezaJuridicaCodigo: r.naturezaJuridicaCodigo,
            qualificacaoResponsavel: r.qualificacaoResponsavel,
            capitalSocial: r.capitalSocial,
            porteEmpresa: r.porteEmpresa,
            enteFederativoResponsavel: r.enteFederativoResponsavel,
          },
          update: {
            razaoSocial: r.razaoSocial,
            naturezaJuridicaCodigo: r.naturezaJuridicaCodigo,
            qualificacaoResponsavel: r.qualificacaoResponsavel,
            capitalSocial: r.capitalSocial,
            porteEmpresa: r.porteEmpresa,
            enteFederativoResponsavel: r.enteFederativoResponsavel,
          },
        }),
      ),
    );
    return result.length;
  }
}
