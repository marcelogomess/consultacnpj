import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Socio } from '../../../domain/socio';

// Socio tem 11 bind params por linha.
// Limite Prisma: 32.767 bind variables → usamos 32.000 com margem.
const SOCIO_BIND_PARAMS = 11;
const SOCIO_MAX_ROWS = Math.floor(32000 / SOCIO_BIND_PARAMS); // 2.909

@Injectable()
export class SocioRepository {
  private readonly logger = new Logger(SocioRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async insertBatch(records: Socio[]): Promise<number> {
    if (records.length === 0) return 0;

    const n = (v: string | null | undefined): string | null => v ?? null;

    // Remove socios existentes para as empresas deste batch antes de reinserir.
    // Substitui o TRUNCATE, preservando socios de empresas não contidas no
    // arquivo atual (importação incremental).
    const uniqueCnpjs = [...new Set(records.map((r) => r.cnpjBasico))];
    await this.prisma.$executeRaw`
      DELETE FROM socios
      WHERE cnpj_basico IN (${Prisma.join(uniqueCnpjs.map((c) => Prisma.sql`${c}`))})
    `;

    let total = 0;
    for (let i = 0; i < records.length; i += SOCIO_MAX_ROWS) {
      const chunk = records.slice(i, i + SOCIO_MAX_ROWS);
      // WHERE EXISTS filtra registros cujo cnpj_basico não existe em empresas,
      // evitando FK violation "socios_cnpj_basico_fkey".
      // paisCodigo é gravado como veio do CSV — a FK socios_pais_fkey foi
      // removida para preservar códigos que não constam na tabela paises.
      const result = await this.prisma.$executeRaw`
        INSERT INTO socios
          (cnpj_basico, identificador_socio, nome_socio, cpf_cnpj_socio,
           qualificacao_socio, data_entrada_sociedade, pais,
           representante_legal, nome_representante, qualificacao_representante,
           faixa_etaria)
        SELECT v.cnpj_basico, v.identificador_socio, v.nome_socio, v.cpf_cnpj_socio,
               v.qualificacao_socio, v.data_entrada_sociedade, v.pais,
               v.representante_legal, v.nome_representante, v.qualificacao_representante,
               v.faixa_etaria
        FROM (
          VALUES ${Prisma.join(
            chunk.map(
              (r) =>
                Prisma.sql`(${r.cnpjBasico}, ${r.identificadorSocio}, ${r.nomeSocio}, ${n(r.cpfCnpjSocio)},
                 ${r.qualificacaoSocioCodigo}, ${n(r.dataEntradaSociedade)}, ${n(r.paisCodigo)},
                 ${n(r.representanteLegal)}, ${n(r.nomeRepresentante)}, ${n(r.qualificacaoRepresentante)},
                 ${n(r.faixaEtaria)})`,
            ),
          )}
        ) AS v(cnpj_basico, identificador_socio, nome_socio, cpf_cnpj_socio,
               qualificacao_socio, data_entrada_sociedade, pais,
               representante_legal, nome_representante, qualificacao_representante,
               faixa_etaria)
        WHERE EXISTS (SELECT 1 FROM empresas WHERE cnpj_basico = v.cnpj_basico)
      `;
      total += Number(result);
    }
    return total;
  }

  /** Limpa toda a tabela. Útil para resets de ambiente. */
  async truncate(): Promise<void> {
    await this.prisma.$executeRaw`TRUNCATE TABLE socios RESTART IDENTITY`;
  }

  async deleteByCnpjBasico(cnpjBasico: string): Promise<void> {
    await this.prisma.socio.deleteMany({ where: { cnpjBasico } });
  }
}
