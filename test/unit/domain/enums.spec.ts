import {
  descricaoSituacaoCadastral,
  SituacaoCadastral,
} from '../../../src/domain/enums/situacao-cadastral.enum';
import {
  descricaoPorteEmpresa,
  PorteEmpresa,
} from '../../../src/domain/enums/porte-empresa.enum';
import {
  descricaoIdentificadorSocio,
  IdentificadorSocio,
} from '../../../src/domain/enums/identificador-socio.enum';
import {
  descricaoMatrizFilial,
  MatrizFilial,
} from '../../../src/domain/enums/matriz-filial.enum';
import {
  descricaoFaixaEtaria,
  FaixaEtaria,
} from '../../../src/domain/enums/faixa-etaria.enum';

describe('Domain Enums', () => {
  describe('SituacaoCadastral', () => {
    it('deve mapear código 01 para NULA', () => {
      expect(descricaoSituacaoCadastral('01')).toBe('NULA');
    });

    it('deve mapear código 02 para ATIVA (sem zero à esquerda no valor)', () => {
      expect(descricaoSituacaoCadastral('02')).toBe('ATIVA');
    });

    it('deve mapear código 03 para SUSPENSA', () => {
      expect(descricaoSituacaoCadastral('03')).toBe('SUSPENSA');
    });

    it('deve mapear código 04 para INAPTA', () => {
      expect(descricaoSituacaoCadastral('04')).toBe('INAPTA');
    });

    it('deve mapear código 08 para BAIXADA', () => {
      expect(descricaoSituacaoCadastral('08')).toBe('BAIXADA');
    });

    it('deve ter valores de enum corretos para os códigos não sequenciais', () => {
      expect(SituacaoCadastral.NULA).toBe('01');
      expect(SituacaoCadastral.ATIVA).toBe('02');
      expect(SituacaoCadastral.BAIXADA).toBe('08');
    });

    it('deve retornar DESCONHECIDA para código inválido', () => {
      expect(descricaoSituacaoCadastral('99')).toBe('DESCONHECIDA');
    });
  });

  describe('PorteEmpresa', () => {
    it('deve mapear código 00 para NÃO INFORMADO', () => {
      expect(descricaoPorteEmpresa('00')).toBe('NÃO INFORMADO');
    });

    it('deve mapear código 01 para MICRO EMPRESA', () => {
      expect(descricaoPorteEmpresa('01')).toBe('MICRO EMPRESA');
    });

    it('deve mapear código 03 para EMPRESA DE PEQUENO PORTE', () => {
      expect(descricaoPorteEmpresa('03')).toBe('EMPRESA DE PEQUENO PORTE');
    });

    it('deve mapear código 05 para DEMAIS', () => {
      expect(descricaoPorteEmpresa('05')).toBe('DEMAIS');
    });

    it('deve ter códigos não sequenciais (00, 01, 03, 05)', () => {
      expect(PorteEmpresa.NAO_INFORMADO).toBe('00');
      expect(PorteEmpresa.PEQUENO_PORTE).toBe('03');
      expect(PorteEmpresa.DEMAIS).toBe('05');
    });
  });

  describe('IdentificadorSocio', () => {
    it('deve mapear código 1 para PESSOA JURÍDICA', () => {
      expect(descricaoIdentificadorSocio('1')).toBe('PESSOA JURÍDICA');
    });

    it('deve mapear código 2 para PESSOA FÍSICA', () => {
      expect(descricaoIdentificadorSocio('2')).toBe('PESSOA FÍSICA');
    });

    it('deve mapear código 3 para ESTRANGEIRO', () => {
      expect(descricaoIdentificadorSocio('3')).toBe('ESTRANGEIRO');
    });
  });

  describe('MatrizFilial', () => {
    it('deve mapear código 1 para MATRIZ', () => {
      expect(descricaoMatrizFilial('1')).toBe('MATRIZ');
    });

    it('deve mapear código 2 para FILIAL', () => {
      expect(descricaoMatrizFilial('2')).toBe('FILIAL');
    });

    it('deve ter valores de enum corretos', () => {
      expect(MatrizFilial.MATRIZ).toBe('1');
      expect(MatrizFilial.FILIAL).toBe('2');
    });
  });

  describe('FaixaEtaria', () => {
    it('deve mapear código 0 para Não se aplica', () => {
      expect(descricaoFaixaEtaria('0')).toBe('Não se aplica');
    });

    it('deve mapear código 1 para 0 a 12 anos', () => {
      expect(descricaoFaixaEtaria('1')).toBe('0 a 12 anos');
    });

    it('deve mapear código 4 para 31 a 40 anos', () => {
      expect(descricaoFaixaEtaria('4')).toBe('31 a 40 anos');
    });

    it('deve mapear código 9 para Maior de 80 anos', () => {
      expect(descricaoFaixaEtaria('9')).toBe('Maior de 80 anos');
    });

    it('deve ter 10 faixas etárias definidas (0 a 9)', () => {
      for (let i = 0; i <= 9; i++) {
        expect(descricaoFaixaEtaria(String(i))).not.toBe('DESCONHECIDA');
      }
    });
  });
});
