export enum PorteEmpresa {
  NAO_INFORMADO = '00',
  MICRO_EMPRESA = '01',
  PEQUENO_PORTE = '03',
  DEMAIS = '05',
}

export const PORTE_EMPRESA_DESCRICAO: Record<string, string> = {
  '00': 'NÃO INFORMADO',
  '01': 'MICRO EMPRESA',
  '03': 'EMPRESA DE PEQUENO PORTE',
  '05': 'DEMAIS',
};

export function descricaoPorteEmpresa(codigo: string): string {
  return PORTE_EMPRESA_DESCRICAO[codigo] ?? 'DESCONHECIDO';
}
