import { BaseParser } from './base.parser';

export interface MotivoData {
  codigo: string;
  descricao: string;
}

export class MotivoParser extends BaseParser<MotivoData> {
  parseLine(fields: string[]): MotivoData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(2, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
