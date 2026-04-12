import { PaisParser } from '../../../../src/modules/import/parsers/pais.parser';
import { MunicipioParser } from '../../../../src/modules/import/parsers/municipio.parser';
import { QualificacaoParser } from '../../../../src/modules/import/parsers/qualificacao.parser';
import { NaturezaJuridicaParser } from '../../../../src/modules/import/parsers/natureza-juridica.parser';
import { CnaeParser } from '../../../../src/modules/import/parsers/cnae.parser';

describe('Parsers de Domínio', () => {
  describe('PaisParser', () => {
    let parser: PaisParser;
    beforeEach(() => {
      parser = new PaisParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine(['105', 'BRASIL']);
      expect(result).not.toBeNull();
      expect(result!.codigo).toBe('105');
      expect(result!.descricao).toBe('BRASIL');
    });

    it('deve preencher código com zeros à esquerda até 3 dígitos', () => {
      const result = parser.parseLine(['1', 'AFEGANISTÃO']);
      expect(result!.codigo).toBe('001');
    });

    it('deve retornar null quando código está vazio', () => {
      const result = parser.parseLine(['', 'SEM CODIGO']);
      expect(result).toBeNull();
    });

    it('deve tratar campos com caracteres acentuados', () => {
      const result = parser.parseLine(['032', 'ALEMANHA']);
      expect(result!.descricao).toBe('ALEMANHA');
    });
  });

  describe('MunicipioParser', () => {
    let parser: MunicipioParser;
    beforeEach(() => {
      parser = new MunicipioParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine(['7107', 'BELO HORIZONTE']);
      expect(result!.codigo).toBe('7107');
      expect(result!.descricao).toBe('BELO HORIZONTE');
    });

    it('deve preencher código com zeros à esquerda até 4 dígitos', () => {
      const result = parser.parseLine(['107', 'MUNICIPIO']);
      expect(result!.codigo).toBe('0107');
    });
  });

  describe('QualificacaoParser', () => {
    let parser: QualificacaoParser;
    beforeEach(() => {
      parser = new QualificacaoParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine(['49', 'SÓCIO-ADMINISTRADOR']);
      expect(result!.codigo).toBe('49');
      expect(result!.descricao).toBe('SÓCIO-ADMINISTRADOR');
    });

    it('deve preencher código com zeros à esquerda até 2 dígitos', () => {
      const result = parser.parseLine(['5', 'ADMINISTRADOR']);
      expect(result!.codigo).toBe('05');
    });
  });

  describe('NaturezaJuridicaParser', () => {
    let parser: NaturezaJuridicaParser;
    beforeEach(() => {
      parser = new NaturezaJuridicaParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine(['2062', 'SOCIEDADE EMPRESARIA LIMITADA']);
      expect(result!.codigo).toBe('2062');
      expect(result!.descricao).toBe('SOCIEDADE EMPRESARIA LIMITADA');
    });
  });

  describe('CnaeParser', () => {
    let parser: CnaeParser;
    beforeEach(() => {
      parser = new CnaeParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine([
        '6201501',
        'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA',
      ]);
      expect(result!.codigo).toBe('6201501');
      expect(result!.descricao).toBe('DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA');
    });

    it('deve preencher código com zeros à esquerda até 7 dígitos', () => {
      const result = parser.parseLine(['620150', 'DESCRICAO']);
      expect(result!.codigo).toBe('0620150');
    });
  });
});
