import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Estabelecimento } from '../../../domain/estabelecimento';

// Estabelecimento tem 30 bind params por linha (NOW() não conta como parâmetro).
// Limite Prisma: 32.767 bind variables → usamos 32.000 com margem.
const ESTABELECIMENTO_BIND_PARAMS = 30;
const MAX_ROWS = Math.floor(32000 / ESTABELECIMENTO_BIND_PARAMS); // 1.066

@Injectable()
export class EstabelecimentoRepository {
  private readonly logger = new Logger(EstabelecimentoRepository.name);

  // Sets pré-carregados para validação de FK em memória
  private validPaisCodes = new Set<string>();
  private validMunicipioCodes = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pré-carrega os códigos válidos de país e município em memória.
   * Deve ser chamado uma única vez antes do loop de importação.
   *
   * Motivo: sem este método, o INSERT executaria (SELECT codigo FROM paises WHERE codigo = ?)
   * e (SELECT codigo FROM municipios WHERE codigo = ?) para cada linha — cerca de 78 M de
   * avaliações de subquery para 40 M de estabelecimentos. Com os Sets em memória, a
   * validação vira um O(1) no processo Node.js, sem custo no banco.
   */
  async inicializar(): Promise<void> {
    const [paises, municipios] = await Promise.all([
      this.prisma.$queryRaw<{ codigo: string }[]>`SELECT codigo FROM paises`,
      this.prisma.$queryRaw<{ codigo: string }[]>`SELECT codigo FROM municipios`,
    ]);
    this.validPaisCodes = new Set(paises.map((p) => p.codigo.trim()));
    this.validMunicipioCodes = new Set(municipios.map((m) => m.codigo.trim()));
    this.logger.log(
      `Códigos FK carregados: ${this.validPaisCodes.size} países, ${this.validMunicipioCodes.size} municípios`,
    );
  }

  /**
   * Faz upsert de um batch de estabelecimentos.
   *
   * Usa VALUES com tuplas individuais (protocolo de texto) — mais compatível com
   * dados CSV que contêm caracteres latin1 convertidos para UTF-8. A abordagem
   * UNNEST com arrays binários causava erro 22P03 ("improper binary format") para
   * esses dados.
   *
   * A principal melhoria de desempenho vem da validação FK em memória (inicializar()),
   * que elimina as ~78 M de subqueries que a versão anterior executava por linha.
   */
  async upsertBatch(records: Estabelecimento[]): Promise<number> {
    if (records.length === 0) return 0;

    const n = (v: string | null | undefined): string | null => v ?? null;
    const fkPais = (v: string | null | undefined): string | null =>
      v && this.validPaisCodes.has(v.trim()) ? v.trim() : null;
    const fkMun = (v: string | null | undefined): string | null =>
      v && this.validMunicipioCodes.has(v.trim()) ? v.trim() : null;

    let total = 0;
    for (let i = 0; i < records.length; i += MAX_ROWS) {
      const chunk = records.slice(i, i + MAX_ROWS);

      await this.prisma.$executeRaw`
        INSERT INTO estabelecimentos (
          cnpj_basico, cnpj_ordem, cnpj_dv,
          identificador_matriz_filial, nome_fantasia, situacao_cadastral,
          data_situacao_cadastral, motivo_situacao_cadastral, nome_cidade_exterior,
          pais, data_inicio_atividade, cnae_fiscal_principal, cnae_fiscal_secundaria,
          tipo_logradouro, logradouro, numero, complemento, bairro, cep, uf,
          municipio, ddd1, telefone1, ddd2, telefone2, ddd_fax, fax,
          correio_eletronico, situacao_especial, data_situacao_especial, updated_at
        )
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(
                ${r.cnpjBasico}, ${r.cnpjOrdem}, ${r.cnpjDv},
                ${r.identificadorMatrizFilial}, ${n(r.nomeFantasia)}, ${r.situacaoCadastral},
                ${n(r.dataSituacaoCadastral)}, ${n(r.motivoSituacaoCadastralCodigo)}, ${n(r.nomeCidadeExterior)},
                ${fkPais(r.paisCodigo)},
                ${n(r.dataInicioAtividade)}, ${n(r.cnaeFiscalPrincipal)}, ${n(r.cnaeFiscalSecundaria)},
                ${n(r.tipoLogradouro)}, ${n(r.logradouro)}, ${n(r.numero)}, ${n(r.complemento)},
                ${n(r.bairro)}, ${n(r.cep)}, ${n(r.uf)},
                ${fkMun(r.municipioCodigo)},
                ${n(r.ddd1)}, ${n(r.telefone1)}, ${n(r.ddd2)}, ${n(r.telefone2)},
                ${n(r.dddFax)}, ${n(r.fax)},
                ${n(r.correioEletronico)}, ${n(r.situacaoEspecial)}, ${n(r.dataSituacaoEspecial)},
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
