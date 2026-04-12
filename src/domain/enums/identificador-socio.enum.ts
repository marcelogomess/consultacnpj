export enum IdentificadorSocio {
  PESSOA_JURIDICA = '1',
  PESSOA_FISICA = '2',
  ESTRANGEIRO = '3',
}

export const IDENTIFICADOR_SOCIO_DESCRICAO: Record<string, string> = {
  '1': 'PESSOA JURÍDICA',
  '2': 'PESSOA FÍSICA',
  '3': 'ESTRANGEIRO',
};

export function descricaoIdentificadorSocio(codigo: string): string {
  return IDENTIFICADOR_SOCIO_DESCRICAO[codigo] ?? 'DESCONHECIDO';
}
