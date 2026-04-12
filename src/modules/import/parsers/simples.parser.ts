import { SimplesNacional } from '../../../domain/simples-nacional';
import { BaseParser } from './base.parser';

/**
 * SIMPLES layout (7 campos posicionais, sem cabeçalho):
 * 0: CNPJ_BASICO
 * 1: OPCAO_SIMPLES (S/N/branco)
 * 2: DATA_OPCAO_SIMPLES
 * 3: DATA_EXCLUSAO_SIMPLES
 * 4: OPCAO_MEI (S/N/branco)
 * 5: DATA_OPCAO_MEI
 * 6: DATA_EXCLUSAO_MEI
 */
export class SimplesParser extends BaseParser<SimplesNacional> {
  parseLine(fields: string[]): SimplesNacional | null {
    if (fields.length < 7) return null;
    const cnpjBasico = this.emptyToNull(fields[0]);
    if (!cnpjBasico) return null;

    return {
      cnpjBasico,
      opcaoSimples: this.emptyToNull(fields[1]),
      dataOpcaoSimples: this.emptyToNull(fields[2]),
      dataExclusaoSimples: this.emptyToNull(fields[3]),
      opcaoMei: this.emptyToNull(fields[4]),
      dataOpcaoMei: this.emptyToNull(fields[5]),
      dataExclusaoMei: this.emptyToNull(fields[6]),
    };
  }
}
