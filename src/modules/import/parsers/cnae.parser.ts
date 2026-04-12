import { BaseParser } from './base.parser';

export interface CnaeData {
  codigo: string;
  descricao: string;
}

export class CnaeParser extends BaseParser<CnaeData> {
  parseLine(fields: string[]): CnaeData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(7, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
