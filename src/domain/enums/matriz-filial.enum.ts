export enum MatrizFilial {
  MATRIZ = '1',
  FILIAL = '2',
}

export const MATRIZ_FILIAL_DESCRICAO: Record<string, string> = {
  '1': 'MATRIZ',
  '2': 'FILIAL',
};

export function descricaoMatrizFilial(codigo: string): string {
  return MATRIZ_FILIAL_DESCRICAO[codigo] ?? 'DESCONHECIDO';
}
