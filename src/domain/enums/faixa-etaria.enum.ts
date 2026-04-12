export enum FaixaEtaria {
  NAO_SE_APLICA = '0',
  ATE_12 = '1',
  DE_13_A_20 = '2',
  DE_21_A_30 = '3',
  DE_31_A_40 = '4',
  DE_41_A_50 = '5',
  DE_51_A_60 = '6',
  DE_61_A_70 = '7',
  DE_71_A_80 = '8',
  MAIOR_80 = '9',
}

export const FAIXA_ETARIA_DESCRICAO: Record<string, string> = {
  '0': 'Não se aplica',
  '1': '0 a 12 anos',
  '2': '13 a 20 anos',
  '3': '21 a 30 anos',
  '4': '31 a 40 anos',
  '5': '41 a 50 anos',
  '6': '51 a 60 anos',
  '7': '61 a 70 anos',
  '8': '71 a 80 anos',
  '9': 'Maior de 80 anos',
};

export function descricaoFaixaEtaria(codigo: string): string {
  return FAIXA_ETARIA_DESCRICAO[codigo] ?? 'DESCONHECIDA';
}
