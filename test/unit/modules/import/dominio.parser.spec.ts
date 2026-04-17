import { PaisParser } from '../../../../src/modules/import/parsers/pais.parser';
import { MunicipioParser } from '../../../../src/modules/import/parsers/municipio.parser';
import { QualificacaoParser } from '../../../../src/modules/import/parsers/qualificacao.parser';
import { NaturezaJuridicaParser } from '../../../../src/modules/import/parsers/natureza-juridica.parser';
import { CnaeParser } from '../../../../src/modules/import/parsers/cnae.parser';
import { MotivoParser } from '../../../../src/modules/import/parsers/motivo.parser';
import { SimplesParser } from '../../../../src/modules/import/parsers/simples.parser';

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

  describe('MotivoParser', () => {
    let parser: MotivoParser;
    beforeEach(() => {
      parser = new MotivoParser();
    });

    it('deve parsear linha com código e descrição', () => {
      const result = parser.parseLine(['01', 'EXTINÇÃO POR ENCERRAMENTO LIQUIDAÇÃO VOLUNTÁRIA']);
      expect(result).not.toBeNull();
      expect(result!.codigo).toBe('01');
      expect(result!.descricao).toBe('EXTINÇÃO POR ENCERRAMENTO LIQUIDAÇÃO VOLUNTÁRIA');
    });

    it('deve preencher código com zeros à esquerda até 2 dígitos', () => {
      const result = parser.parseLine(['1', 'ALGUM MOTIVO']);
      expect(result!.codigo).toBe('01');
    });

    it('deve retornar null quando código está vazio', () => {
      const result = parser.parseLine(['', 'SEM CODIGO']);
      expect(result).toBeNull();
    });

    it('deve retornar null quando há menos de 2 campos', () => {
      const result = parser.parseLine(['01']);
      expect(result).toBeNull();
    });

    it('deve usar string vazia quando descrição está ausente', () => {
      const result = parser.parseLine(['05', '']);
      expect(result).not.toBeNull();
      expect(result!.descricao).toBe('');
    });
  });

  describe('SimplesParser', () => {
    let parser: SimplesParser;
    beforeEach(() => {
      parser = new SimplesParser();
    });

    it('deve parsear linha completa com todos os campos do Simples Nacional', () => {
      const result = parser.parseLine([
        '00000000',
        'S',
        '20200101',
        '',
        'N',
        '',
        '',
      ]);
      expect(result).not.toBeNull();
      expect(result!.cnpjBasico).toBe('00000000');
      expect(result!.opcaoSimples).toBe('S');
      expect(result!.dataOpcaoSimples).toBe('20200101');
      expect(result!.dataExclusaoSimples).toBeNull();
      expect(result!.opcaoMei).toBe('N');
      expect(result!.dataOpcaoMei).toBeNull();
      expect(result!.dataExclusaoMei).toBeNull();
    });

    it('deve retornar null quando cnpj_basico está vazio', () => {
      const result = parser.parseLine(['', 'S', '20200101', '', 'N', '', '']);
      expect(result).toBeNull();
    });

    it('deve retornar null quando há menos de 7 campos', () => {
      const result = parser.parseLine(['00000000', 'S', '20200101']);
      expect(result).toBeNull();
    });

    it('deve mapear campos vazios para null', () => {
      const result = parser.parseLine([
        '12345678',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      expect(result).not.toBeNull();
      expect(result!.opcaoSimples).toBeNull();
      expect(result!.dataOpcaoSimples).toBeNull();
      expect(result!.opcaoMei).toBeNull();
    });

    it('deve parsear empresa optante pelo MEI', () => {
      const result = parser.parseLine([
        '87654321',
        'S',
        '20190601',
        '',
        'S',
        '20190601',
        '',
      ]);
      expect(result!.opcaoMei).toBe('S');
      expect(result!.dataOpcaoMei).toBe('20190601');
      expect(result!.dataExclusaoMei).toBeNull();
    });
  });
});
