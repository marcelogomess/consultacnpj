import { BaseParser } from './base.parser';

export interface NaturezaJuridicaData {
  codigo: string;
  descricao: string;
}

export class NaturezaJuridicaParser extends BaseParser<NaturezaJuridicaData> {
  parseLine(fields: string[]): NaturezaJuridicaData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(4, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
