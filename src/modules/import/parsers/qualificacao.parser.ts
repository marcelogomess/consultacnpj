import { BaseParser } from './base.parser';

export interface QualificacaoData {
  codigo: string;
  descricao: string;
}

export class QualificacaoParser extends BaseParser<QualificacaoData> {
  parseLine(fields: string[]): QualificacaoData | null {
    if (fields.length < 2) return null;
    const codigo = this.emptyToNull(fields[0]);
    if (!codigo) return null;
    return {
      codigo: codigo.padStart(2, '0'),
      descricao: this.emptyToNull(fields[1]) ?? '',
    };
  }
}
