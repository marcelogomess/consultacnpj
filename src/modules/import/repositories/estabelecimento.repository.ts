import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Estabelecimento } from '../../../domain/estabelecimento';

@Injectable()
export class EstabelecimentoRepository {
  private readonly logger = new Logger(EstabelecimentoRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertBatch(records: Estabelecimento[]): Promise<number> {
    if (records.length === 0) return 0;

    const result = await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.estabelecimento.upsert({
          where: {
            cnpjBasico_cnpjOrdem_cnpjDv: {
              cnpjBasico: r.cnpjBasico,
              cnpjOrdem: r.cnpjOrdem,
              cnpjDv: r.cnpjDv,
            },
          },
          create: {
            cnpjBasico: r.cnpjBasico,
            cnpjOrdem: r.cnpjOrdem,
            cnpjDv: r.cnpjDv,
            identificadorMatrizFilial: r.identificadorMatrizFilial,
            nomeFantasia: r.nomeFantasia,
            situacaoCadastral: r.situacaoCadastral,
            dataSituacaoCadastral: r.dataSituacaoCadastral,
            motivoSituacaoCadastralCodigo: r.motivoSituacaoCadastralCodigo,
            nomeCidadeExterior: r.nomeCidadeExterior,
            paisCodigo: r.paisCodigo,
            dataInicioAtividade: r.dataInicioAtividade,
            cnaeFiscalPrincipal: r.cnaeFiscalPrincipal,
            cnaeFiscalSecundaria: r.cnaeFiscalSecundaria,
            tipoLogradouro: r.tipoLogradouro,
            logradouro: r.logradouro,
            numero: r.numero,
            complemento: r.complemento,
            bairro: r.bairro,
            cep: r.cep,
            uf: r.uf,
            municipioCodigo: r.municipioCodigo,
            ddd1: r.ddd1,
            telefone1: r.telefone1,
            ddd2: r.ddd2,
            telefone2: r.telefone2,
            dddFax: r.dddFax,
            fax: r.fax,
            correioEletronico: r.correioEletronico,
            situacaoEspecial: r.situacaoEspecial,
            dataSituacaoEspecial: r.dataSituacaoEspecial,
          },
          update: {
            identificadorMatrizFilial: r.identificadorMatrizFilial,
            nomeFantasia: r.nomeFantasia,
            situacaoCadastral: r.situacaoCadastral,
            dataSituacaoCadastral: r.dataSituacaoCadastral,
            motivoSituacaoCadastralCodigo: r.motivoSituacaoCadastralCodigo,
            nomeCidadeExterior: r.nomeCidadeExterior,
            paisCodigo: r.paisCodigo,
            dataInicioAtividade: r.dataInicioAtividade,
            cnaeFiscalPrincipal: r.cnaeFiscalPrincipal,
            cnaeFiscalSecundaria: r.cnaeFiscalSecundaria,
            tipoLogradouro: r.tipoLogradouro,
            logradouro: r.logradouro,
            numero: r.numero,
            complemento: r.complemento,
            bairro: r.bairro,
            cep: r.cep,
            uf: r.uf,
            municipioCodigo: r.municipioCodigo,
            ddd1: r.ddd1,
            telefone1: r.telefone1,
            ddd2: r.ddd2,
            telefone2: r.telefone2,
            dddFax: r.dddFax,
            fax: r.fax,
            correioEletronico: r.correioEletronico,
            situacaoEspecial: r.situacaoEspecial,
            dataSituacaoEspecial: r.dataSituacaoEspecial,
          },
        }),
      ),
    );
    return result.length;
  }
}
