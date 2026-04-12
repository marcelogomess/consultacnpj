import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Socio } from '../../../domain/socio';

@Injectable()
export class SocioRepository {
  private readonly logger = new Logger(SocioRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async insertBatch(records: Socio[]): Promise<number> {
    if (records.length === 0) return 0;
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
      skipDuplicates: true,
    });
    return result.count;
  }

  async deleteByCnpjBasico(cnpjBasico: string): Promise<void> {
    await this.prisma.socio.deleteMany({ where: { cnpjBasico } });
  }

  async deleteAll(): Promise<void> {
    await this.prisma.socio.deleteMany({});
  }
}
