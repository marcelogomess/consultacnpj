import { Estabelecimento } from '../../../domain/estabelecimento';
import { BaseParser } from './base.parser';

/**
 * ESTABELE layout (30 campos posicionais, sem cabeçalho):
 * 0:  CNPJ_BASICO
 * 1:  CNPJ_ORDEM
 * 2:  CNPJ_DV
 * 3:  IDENTIFICADOR_MATRIZ_FILIAL
 * 4:  NOME_FANTASIA
 * 5:  SITUACAO_CADASTRAL
 * 6:  DATA_SITUACAO_CADASTRAL
 * 7:  MOTIVO_SITUACAO_CADASTRAL
 * 8:  NOME_CIDADE_EXTERIOR
 * 9:  PAIS
 * 10: DATA_INICIO_ATIVIDADE
 * 11: CNAE_FISCAL_PRINCIPAL
 * 12: CNAE_FISCAL_SECUNDARIA (múltiplos separados por vírgula)
 * 13: TIPO_LOGRADOURO
 * 14: LOGRADOURO
 * 15: NUMERO
 * 16: COMPLEMENTO
 * 17: BAIRRO
 * 18: CEP
 * 19: UF
 * 20: MUNICIPIO
 * 21: DDD_1
 * 22: TELEFONE_1
 * 23: DDD_2
 * 24: TELEFONE_2
 * 25: DDD_FAX
 * 26: FAX
 * 27: CORREIO_ELETRONICO
 * 28: SITUACAO_ESPECIAL
 * 29: DATA_SITUACAO_ESPECIAL
 */
export class EstabelecimentoParser extends BaseParser<Estabelecimento> {
  parseLine(fields: string[]): Estabelecimento | null {
    if (fields.length < 29) return null;
    const cnpjBasico = this.emptyToNull(fields[0]);
    if (!cnpjBasico) return null;

    return {
      cnpjBasico,
      cnpjOrdem: this.emptyToNull(fields[1]) ?? '0000',
      cnpjDv: this.emptyToNull(fields[2]) ?? '00',
      identificadorMatrizFilial: this.emptyToNull(fields[3]) ?? '1',
      nomeFantasia: this.emptyToNull(fields[4]),
      situacaoCadastral: this.emptyToNull(fields[5]) ?? '02',
      dataSituacaoCadastral: this.emptyToNull(fields[6]),
      motivoSituacaoCadastralCodigo: this.emptyToNull(fields[7]),
      nomeCidadeExterior: this.emptyToNull(fields[8]),
      paisCodigo: this.emptyToNull(fields[9]),
      dataInicioAtividade: this.emptyToNull(fields[10]),
      cnaeFiscalPrincipal: this.emptyToNull(fields[11]),
      cnaeFiscalSecundaria: this.emptyToNull(fields[12]),
      tipoLogradouro: this.emptyToNull(fields[13]),
      logradouro: this.emptyToNull(fields[14]),
      numero: this.emptyToNull(fields[15]),
      complemento: this.emptyToNull(fields[16]),
      bairro: this.emptyToNull(fields[17]),
      cep: this.emptyToNull(fields[18]),
      uf: this.emptyToNull(fields[19]),
      municipioCodigo: this.emptyToNull(fields[20]),
      ddd1: this.emptyToNull(fields[21]),
      telefone1: this.emptyToNull(fields[22]),
      ddd2: this.emptyToNull(fields[23]),
      telefone2: this.emptyToNull(fields[24]),
      dddFax: this.emptyToNull(fields[25]),
      fax: this.emptyToNull(fields[26]),
      correioEletronico: this.emptyToNull(fields[27]),
      situacaoEspecial: this.emptyToNull(fields[28]),
      dataSituacaoEspecial: fields.length > 29 ? this.emptyToNull(fields[29]) : null,
    };
  }
}
