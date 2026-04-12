import { Socio } from '../../../domain/socio';
import { BaseParser } from './base.parser';

/**
 * SOCIOCSV layout (11 campos posicionais, sem cabeçalho):
 * 0:  CNPJ_BASICO
 * 1:  IDENTIFICADOR_SOCIO (1=PJ, 2=PF, 3=Estrangeiro)
 * 2:  NOME_SOCIO
 * 3:  CNPJ_CPF_SOCIO (CPF descaracterizado: ***456789**)
 * 4:  QUALIFICACAO_SOCIO
 * 5:  DATA_ENTRADA_SOCIEDADE
 * 6:  PAIS
 * 7:  REPRESENTANTE_LEGAL
 * 8:  NOME_REPRESENTANTE
 * 9:  QUALIFICACAO_REPRESENTANTE
 * 10: FAIXA_ETARIA (0-9)
 */
export class SocioParser extends BaseParser<Socio> {
  parseLine(fields: string[]): Socio | null {
    if (fields.length < 10) return null;
    const cnpjBasico = this.emptyToNull(fields[0]);
    if (!cnpjBasico) return null;

    return {
      cnpjBasico,
      identificadorSocio: this.emptyToNull(fields[1]) ?? '2',
      nomeSocio: this.emptyToNull(fields[2]) ?? '',
      cpfCnpjSocio: this.emptyToNull(fields[3]),
      qualificacaoSocioCodigo: this.emptyToNull(fields[4]) ?? '00',
      dataEntradaSociedade: this.emptyToNull(fields[5]),
      paisCodigo: this.emptyToNull(fields[6]),
      representanteLegal: this.emptyToNull(fields[7]),
      nomeRepresentante: this.emptyToNull(fields[8]),
      qualificacaoRepresentante: this.emptyToNull(fields[9]),
      faixaEtaria: fields.length > 10 ? this.emptyToNull(fields[10]) : null,
    };
  }
}
