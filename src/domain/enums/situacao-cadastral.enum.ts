export enum SituacaoCadastral {
  NULA = '01',
  ATIVA = '02',
  SUSPENSA = '03',
  INAPTA = '04',
  BAIXADA = '08',
}

export const SITUACAO_CADASTRAL_DESCRICAO: Record<string, string> = {
  '01': 'NULA',
  '02': 'ATIVA',
  '03': 'SUSPENSA',
  '04': 'INAPTA',
  '08': 'BAIXADA',
};

export function descricaoSituacaoCadastral(codigo: string): string {
  return SITUACAO_CADASTRAL_DESCRICAO[codigo] ?? 'DESCONHECIDA';
}
