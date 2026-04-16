/**
 * Utilitários para validação, formatação e parse de CNPJ.
 *
 * CNPJ = 14 dígitos numéricos: 8 (base) + 4 (ordem) + 2 (dígitos verificadores)
 * A API aceita APENAS os 14 dígitos numéricos sem qualquer formatação.
 * O formato visual XX.XXX.XXX/XXXX-XX é usado somente nas respostas JSON.
 */

/**
 * Remove todos os caracteres não numéricos de um CNPJ.
 * Uso interno: formatação de respostas. NÃO use para sanitizar entrada da API.
 */
export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata 14 dígitos numéricos no padrão visual XX.XXX.XXX/XXXX-XX.
 * Uso interno: geração de respostas JSON. A API não aceita este formato como entrada.
 */
export function formatarCnpj(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
}

/**
 * Extrai as partes de um CNPJ (deve ser exatamente 14 dígitos numéricos).
 */
export function extrairPartesCnpj(cnpj: string): {
  basico: string;
  ordem: string;
  dv: string;
} {
  return {
    basico: cnpj.slice(0, 8),
    ordem: cnpj.slice(8, 12),
    dv: cnpj.slice(12, 14),
  };
}

/**
 * Valida os dígitos verificadores de um CNPJ.
 * Aceita SOMENTE 14 dígitos numéricos sem formatação.
 * Retorna false para qualquer entrada com pontuação, barras ou outros caracteres.
 */
export function validarCnpj(cnpj: string): boolean {
  // Exige exatamente 14 dígitos numéricos — rejeita qualquer formatação
  if (!/^\d{14}$/.test(cnpj)) return false;

  // Rejeita sequências com todos dígitos iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDv = (digits: string, weights: number[]): number => {
    const sum = digits.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dv1 = calcDv(cnpj.slice(0, 12), weights1);
  if (dv1 !== parseInt(cnpj[12], 10)) return false;

  const dv2 = calcDv(cnpj.slice(0, 13), weights2);
  if (dv2 !== parseInt(cnpj[13], 10)) return false;

  return true;
}
