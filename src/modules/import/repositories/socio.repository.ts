import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Socio } from '../../../domain/socio';

@Injectable()
export class SocioRepository {
  private readonly logger = new Logger(SocioRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async insertBatch(records: Socio[]): Promise<number> {
    if (records.length === 0) return 0;
    // createMany é suficiente: sócios são truncados antes de cada importação completa,
    // por isso não há risco de duplicatas e não precisamos de upsert.
    const result = await this.prisma.socio.createMany({
      data: records.map((r) => ({
        cnpjBasico: r.cnpjBasico,
        identificadorSocio: r.identificadorSocio,
        nomeSocio: r.nomeSocio,
        cpfCnpjSocio: r.cpfCnpjSocio,
        qualificacaoSocioCodigo: r.qualificacaoSocioCodigo,
        dataEntradaSociedade: r.dataEntradaSociedade,
        paisCodigo: r.paisCodigo,
        representanteLegal: r.representanteLegal,
        nomeRepresentante: r.nomeRepresentante,
        qualificacaoRepresentante: r.qualificacaoRepresentante,
        faixaEtaria: r.faixaEtaria,
      })),
    });
    return result.count;
  }

  /** Limpa toda a tabela antes de uma importação completa. */
  async truncate(): Promise<void> {
    await this.prisma.$executeRaw`TRUNCATE TABLE socios RESTART IDENTITY`;
  }

  async deleteByCnpjBasico(cnpjBasico: string): Promise<void> {
    await this.prisma.socio.deleteMany({ where: { cnpjBasico } });
  }
}
