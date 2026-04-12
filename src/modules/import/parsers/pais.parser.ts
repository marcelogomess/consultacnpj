import { BaseParser } from './base.parser';

export interface PaisData {
  codigo: string;
  descricao: string;
}

export class PaisParser extends BaseParser<PaisData> {
  parseLine(fields: string[]): PaisData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(3, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
