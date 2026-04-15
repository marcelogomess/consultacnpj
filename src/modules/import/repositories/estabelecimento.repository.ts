import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Estabelecimento } from '../../../domain/estabelecimento';

// Estabelecimento tem 30 bind params por linha (NOW() não conta como parâmetro).
// Limite Prisma: 32.767 bind variables → máx 1.092 linhas, usamos 1.000 com margem.
const ESTABELECIMENTO_BIND_PARAMS = 30;
const MAX_ROWS = Math.floor(32000 / ESTABELECIMENTO_BIND_PARAMS); // 1.066

@Injectable()
export class EstabelecimentoRepository {
  private readonly logger = new Logger(EstabelecimentoRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertBatch(records: Estabelecimento[]): Promise<number> {
    if (records.length === 0) return 0;

    let total = 0;
    for (let i = 0; i < records.length; i += MAX_ROWS) {
      const chunk = records.slice(i, i + MAX_ROWS);

      await this.prisma.$executeRaw`
        INSERT INTO estabelecimentos
          (cnpj_basico, cnpj_ordem, cnpj_dv,
           identificador_matriz_filial, nome_fantasia, situacao_cadastral,
           data_situacao_cadastral, motivo_situacao_cadastral, nome_cidade_exterior,
           pais, data_inicio_atividade, cnae_fiscal_principal, cnae_fiscal_secundaria,
           tipo_logradouro, logradouro, numero, complemento, bairro, cep, uf,
           municipio, ddd1, telefone1, ddd2, telefone2, ddd_fax, fax,
           correio_eletronico, situacao_especial, data_situacao_especial,
           updated_at)
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(
                ${r.cnpjBasico}, ${r.cnpjOrdem}, ${r.cnpjDv},
                ${r.identificadorMatrizFilial}, ${r.nomeFantasia}, ${r.situacaoCadastral},
                ${r.dataSituacaoCadastral}, ${r.motivoSituacaoCadastralCodigo}, ${r.nomeCidadeExterior},
                ${r.paisCodigo}, ${r.dataInicioAtividade}, ${r.cnaeFiscalPrincipal}, ${r.cnaeFiscalSecundaria},
                ${r.tipoLogradouro}, ${r.logradouro}, ${r.numero}, ${r.complemento}, ${r.bairro}, ${r.cep}, ${r.uf},
                ${r.municipioCodigo}, ${r.ddd1}, ${r.telefone1}, ${r.ddd2}, ${r.telefone2}, ${r.dddFax}, ${r.fax},
                ${r.correioEletronico}, ${r.situacaoEspecial}, ${r.dataSituacaoEspecial},
                NOW()
              )`,
          ),
        )}
        ON CONFLICT (cnpj_basico, cnpj_ordem, cnpj_dv) DO UPDATE SET
          identificador_matriz_filial = EXCLUDED.identificador_matriz_filial,
          nome_fantasia               = EXCLUDED.nome_fantasia,
          situacao_cadastral          = EXCLUDED.situacao_cadastral,
          data_situacao_cadastral     = EXCLUDED.data_situacao_cadastral,
          motivo_situacao_cadastral   = EXCLUDED.motivo_situacao_cadastral,
          nome_cidade_exterior        = EXCLUDED.nome_cidade_exterior,
          pais                        = EXCLUDED.pais,
          data_inicio_atividade       = EXCLUDED.data_inicio_atividade,
          cnae_fiscal_principal       = EXCLUDED.cnae_fiscal_principal,
          cnae_fiscal_secundaria      = EXCLUDED.cnae_fiscal_secundaria,
          tipo_logradouro             = EXCLUDED.tipo_logradouro,
          logradouro                  = EXCLUDED.logradouro,
          numero                      = EXCLUDED.numero,
          complemento                 = EXCLUDED.complemento,
          bairro                      = EXCLUDED.bairro,
          cep                         = EXCLUDED.cep,
          uf                          = EXCLUDED.uf,
          municipio                   = EXCLUDED.municipio,
          ddd1                        = EXCLUDED.ddd1,
          telefone1                   = EXCLUDED.telefone1,
          ddd2                        = EXCLUDED.ddd2,
          telefone2                   = EXCLUDED.telefone2,
          ddd_fax                     = EXCLUDED.ddd_fax,
          fax                         = EXCLUDED.fax,
          correio_eletronico          = EXCLUDED.correio_eletronico,
          situacao_especial           = EXCLUDED.situacao_especial,
          data_situacao_especial      = EXCLUDED.data_situacao_especial,
          updated_at                  = NOW()
      `;

      total += chunk.length;
    }
    return total;
  }
}
