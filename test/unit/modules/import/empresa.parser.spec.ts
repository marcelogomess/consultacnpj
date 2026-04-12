import { EmpresaParser } from '../../../../src/modules/import/parsers/empresa.parser';

describe('EmpresaParser', () => {
  let parser: EmpresaParser;

  beforeEach(() => {
    parser = new EmpresaParser();
  });

  describe('parseLine', () => {
    it('deve parsear linha de empresa com todos os 7 campos', () => {
      const fields = [
        '11222333',
        'EMPRESA EXEMPLO LTDA',
        '2062',
        '49',
        '100000,00',
        '01',
        '',
      ];
      const result = parser.parseLine(fields);
      expect(result).not.toBeNull();
      expect(result!.cnpjBasico).toBe('11222333');
      expect(result!.razaoSocial).toBe('EMPRESA EXEMPLO LTDA');
      expect(result!.naturezaJuridicaCodigo).toBe('2062');
      expect(result!.qualificacaoResponsavel).toBe('49');
      expect(result!.capitalSocial).toBe(100000.0);
      expect(result!.porteEmpresa).toBe('01');
      expect(result!.enteFederativoResponsavel).toBeNull();
    });

    it('deve converter capital_social com vírgula para número decimal', () => {
      const fields = ['11222333', 'EMPRESA', '2062', '49', '1500000,50', '03', ''];
      const result = parser.parseLine(fields);
      expect(result!.capitalSocial).toBe(1500000.5);
    });

    it('deve converter capital_social com ponto de milhar e vírgula decimal', () => {
      const fields = ['11222333', 'EMPRESA', '2062', '49', '1.500.000,00', '03', ''];
      const result = parser.parseLine(fields);
      expect(result!.capitalSocial).toBe(1500000.0);
    });

    it('deve tratar ente federativo vazio como null', () => {
      const fields = ['11222333', 'EMPRESA', '2062', '49', '0,00', '00', ''];
      const result = parser.parseLine(fields);
      expect(result!.enteFederativoResponsavel).toBeNull();
    });

    it('deve preencher ente federativo quando presente', () => {
      const fields = ['11222333', 'EMPRESA', '1000', '49', '0,00', '00', 'UNIÃO'];
      const result = parser.parseLine(fields);
      expect(result!.enteFederativoResponsavel).toBe('UNIÃO');
    });

    it('deve retornar null quando cnpjBasico está vazio', () => {
      const fields = ['', 'EMPRESA', '2062', '49', '0,00', '01', ''];
      const result = parser.parseLine(fields);
      expect(result).toBeNull();
    });

    it('deve retornar null quando há menos de 7 campos', () => {
      const fields = ['11222333', 'EMPRESA'];
      const result = parser.parseLine(fields);
      expect(result).toBeNull();
    });
  });
});
