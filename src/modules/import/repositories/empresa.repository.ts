import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Empresa } from '../../../domain/empresa';

// Empresa tem 7 bind params por linha (NOW() não conta como parâmetro).
// Limite Prisma: 32.767 bind variables → máx 4.681 linhas, usamos 4.500 com margem.
const EMPRESA_BIND_PARAMS = 7;
const MAX_ROWS = Math.floor(32000 / EMPRESA_BIND_PARAMS); // 4.571

@Injectable()
export class EmpresaRepository {
  private readonly logger = new Logger(EmpresaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertBatch(records: Empresa[]): Promise<number> {
    if (records.length === 0) return 0;

    let total = 0;
    // Chunking garante que não ultrapassa o limite de parâmetros do PostgreSQL
    for (let i = 0; i < records.length; i += MAX_ROWS) {
      const chunk = records.slice(i, i + MAX_ROWS);

      await this.prisma.$executeRaw`
        INSERT INTO empresas
          (cnpj_basico, razao_social, natureza_juridica, qualificacao_responsavel,
           capital_social, porte_empresa, ente_federativo_responsavel, updated_at)
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.cnpjBasico}, ${r.razaoSocial}, ${r.naturezaJuridicaCodigo},
               ${r.qualificacaoResponsavel}, ${r.capitalSocial}, ${r.porteEmpresa},
               ${r.enteFederativoResponsavel}, NOW())`,
          ),
        )}
        ON CONFLICT (cnpj_basico) DO UPDATE SET
          razao_social                = EXCLUDED.razao_social,
          natureza_juridica           = EXCLUDED.natureza_juridica,
          qualificacao_responsavel    = EXCLUDED.qualificacao_responsavel,
          capital_social              = EXCLUDED.capital_social,
          porte_empresa               = EXCLUDED.porte_empresa,
          ente_federativo_responsavel = EXCLUDED.ente_federativo_responsavel,
          updated_at                  = NOW()
      `;

      total += chunk.length;
    }
    return total;
  }
}
