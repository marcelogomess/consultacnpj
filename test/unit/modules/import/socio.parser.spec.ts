import { SocioParser } from '../../../../src/modules/import/parsers/socio.parser';

describe('SocioParser', () => {
  let parser: SocioParser;

  beforeEach(() => {
    parser = new SocioParser();
  });

  const buildFields = (overrides: Record<number, string> = {}): string[] => {
    const defaults = [
      '11222333', // 0: cnpjBasico
      '2', // 1: identificadorSocio (PF)
      'JOAO DA SILVA', // 2: nomeSocio
      '***456789**', // 3: cpfCnpjSocio (descaracterizado)
      '49', // 4: qualificacaoSocio
      '20200101', // 5: dataEntradaSociedade
      '', // 6: pais
      '', // 7: representanteLegal
      '', // 8: nomeRepresentante
      '', // 9: qualificacaoRepresentante
      '4', // 10: faixaEtaria (31-40 anos)
    ];
    Object.entries(overrides).forEach(([i, v]) => {
      defaults[Number(i)] = v;
    });
    return defaults;
  };

  it('deve parsear linha com todos os 11 campos', () => {
    const result = parser.parseLine(buildFields());
    expect(result).not.toBeNull();
    expect(result!.cnpjBasico).toBe('11222333');
    expect(result!.identificadorSocio).toBe('2');
    expect(result!.nomeSocio).toBe('JOAO DA SILVA');
    expect(result!.faixaEtaria).toBe('4');
  });

  it('deve manter cpf descaracterizado como string exatamente como vem', () => {
    const result = parser.parseLine(buildFields({ 3: '***456789**' }));
    expect(result!.cpfCnpjSocio).toBe('***456789**');
  });

  it('deve tratar cpf vazio como null', () => {
    const result = parser.parseLine(buildFields({ 3: '' }));
    expect(result!.cpfCnpjSocio).toBeNull();
  });

  it('deve tratar sócio estrangeiro sem CPF', () => {
    const result = parser.parseLine(buildFields({ 1: '3', 3: '', 6: '105' }));
    expect(result!.identificadorSocio).toBe('3');
    expect(result!.cpfCnpjSocio).toBeNull();
    expect(result!.paisCodigo).toBe('105');
  });

  it('deve tratar faixa etária 0 (não se aplica) como string "0"', () => {
    const result = parser.parseLine(buildFields({ 10: '0' }));
    expect(result!.faixaEtaria).toBe('0');
  });

  it('deve retornar null quando cnpjBasico está vazio', () => {
    const result = parser.parseLine(buildFields({ 0: '' }));
    expect(result).toBeNull();
  });
});
