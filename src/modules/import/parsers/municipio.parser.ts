import { BaseParser } from './base.parser';

export interface MunicipioData {
  codigo: string;
  descricao: string;
}

export class MunicipioParser extends BaseParser<MunicipioData> {
  parseLine(fields: string[]): MunicipioData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(4, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
