/**
 * Utilitários para validação, formatação e parse de CNPJ.
 *
 * CNPJ = 14 dígitos: 8 (base) + 4 (ordem) + 2 (dígitos verificadores)
 * Formato visual: XX.XXX.XXX/XXXX-XX
 */

/**
 * Remove todos os caracteres não numéricos de um CNPJ.
 */
export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata um CNPJ com a pontuação padrão (XX.XXX.XXX/XXXX-XX).
 * Assume que o CNPJ já está limpo (14 dígitos numéricos).
 */
export function formatarCnpj(cnpj: string): string {
  const c = limparCnpj(cnpj);
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
}

/**
 * Extrai as partes de um CNPJ completo (14 dígitos limpos).
 */
export function extrairPartesCnpj(cnpj: string): {
  basico: string;
  ordem: string;
  dv: string;
} {
  const c = limparCnpj(cnpj);
  return {
    basico: c.slice(0, 8),
    ordem: c.slice(8, 12),
    dv: c.slice(12, 14),
  };
}

/**
 * Valida os dígitos verificadores de um CNPJ.
 * Retorna true se o CNPJ é válido, false caso contrário.
 */
export function validarCnpj(cnpj: string): boolean {
  const c = limparCnpj(cnpj);

  if (c.length !== 14) return false;

  // Rejeita sequências com todos dígitos iguais
  if (/^(\d)\1{13}$/.test(c)) return false;

  // Validação do primeiro dígito verificador
  const calcDv = (digits: string, weights: number[]): number => {
    const sum = digits
      .split('')
      .reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dv1 = calcDv(c.slice(0, 12), weights1);
  if (dv1 !== parseInt(c[12], 10)) return false;

  const dv2 = calcDv(c.slice(0, 13), weights2);
  if (dv2 !== parseInt(c[13], 10)) return false;

  return true;
}
