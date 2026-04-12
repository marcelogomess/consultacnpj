import { Empresa } from '../../../domain/empresa';
import { BaseParser } from './base.parser';

/**
 * EMPRECSV layout (7 campos posicionais, sem cabeçalho):
 * 0: CNPJ_BASICO
 * 1: RAZAO_SOCIAL
 * 2: NATUREZA_JURIDICA
 * 3: QUALIFICACAO_RESPONSAVEL
 * 4: CAPITAL_SOCIAL (vírgula como decimal)
 * 5: PORTE_EMPRESA
 * 6: ENTE_FEDERATIVO_RESPONSAVEL
 */
export class EmpresaParser extends BaseParser<Empresa> {
  parseLine(fields: string[]): Empresa | null {
    if (fields.length < 7) return null;
    const cnpjBasico = this.emptyToNull(fields[0]);
    if (!cnpjBasico) return null;

    return {
      cnpjBasico,
      razaoSocial: this.emptyToNull(fields[1]) ?? '',
      naturezaJuridicaCodigo: this.emptyToNull(fields[2]) ?? '0000',
      qualificacaoResponsavel: this.emptyToNull(fields[3]) ?? '00',
      capitalSocial: this.parseCapitalSocial(fields[4] ?? ''),
      porteEmpresa: this.emptyToNull(fields[5]) ?? '00',
      enteFederativoResponsavel: this.emptyToNull(fields[6]),
    };
  }
}
