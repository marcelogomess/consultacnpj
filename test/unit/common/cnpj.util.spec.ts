import {
  validarCnpj,
  limparCnpj,
  formatarCnpj,
  extrairPartesCnpj,
} from '../../../src/common/utils/cnpj.util';

describe('cnpj.util', () => {
  describe('limparCnpj', () => {
    it('deve remover pontos, barras e hífens', () => {
      expect(limparCnpj('11.222.333/0001-81')).toBe('11222333000181');
    });

    it('deve manter CNPJ já limpo intacto', () => {
      expect(limparCnpj('11222333000181')).toBe('11222333000181');
    });

    it('deve remover espaços e outros caracteres não numéricos', () => {
      expect(limparCnpj('11 222 333 0001 81')).toBe('11222333000181');
    });
  });

  describe('formatarCnpj', () => {
    it('deve formatar CNPJ com pontuação padrão', () => {
      expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('deve formatar CNPJ já com pontuação (limpando primeiro)', () => {
      expect(formatarCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
    });
  });

  describe('extrairPartesCnpj', () => {
    it('deve extrair cnpj_basico, ordem e dv de um CNPJ completo', () => {
      const partes = extrairPartesCnpj('11222333000181');
      expect(partes.basico).toBe('11222333');
      expect(partes.ordem).toBe('0001');
      expect(partes.dv).toBe('81');
    });

    it('deve funcionar com CNPJ formatado', () => {
      const partes = extrairPartesCnpj('11.222.333/0001-81');
      expect(partes.basico).toBe('11222333');
      expect(partes.ordem).toBe('0001');
      expect(partes.dv).toBe('81');
    });
  });

  describe('validarCnpj', () => {
    it('deve validar CNPJ com 14 dígitos válidos', () => {
      // CNPJ da Receita Federal
      expect(validarCnpj('11222333000181')).toBe(true);
    });

    it('deve aceitar CNPJ formatado', () => {
      expect(validarCnpj('11.222.333/0001-81')).toBe(true);
    });

    it('deve rejeitar CNPJ com dígitos verificadores inválidos', () => {
      expect(validarCnpj('11222333000199')).toBe(false);
    });

    it('deve rejeitar CNPJ com menos de 14 dígitos', () => {
      expect(validarCnpj('1122233300018')).toBe(false);
    });

    it('deve rejeitar CNPJ com mais de 14 dígitos', () => {
      expect(validarCnpj('112223330001812')).toBe(false);
    });

    it('deve rejeitar CNPJ com todos os dígitos iguais (00000000000000)', () => {
      expect(validarCnpj('00000000000000')).toBe(false);
    });

    it('deve rejeitar CNPJ com todos os dígitos iguais (11111111111111)', () => {
      expect(validarCnpj('11111111111111')).toBe(false);
    });

    it('deve validar CNPJ real da Receita Federal 00000000000191', () => {
      expect(validarCnpj('00000000000191')).toBe(true);
    });
  });
});
