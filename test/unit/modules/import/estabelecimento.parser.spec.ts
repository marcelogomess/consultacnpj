import { EstabelecimentoParser } from '../../../../src/modules/import/parsers/estabelecimento.parser';

describe('EstabelecimentoParser', () => {
  let parser: EstabelecimentoParser;

  beforeEach(() => {
    parser = new EstabelecimentoParser();
  });

  const buildFields = (overrides: Partial<Record<number, string>> = {}): string[] => {
    const defaults: string[] = [
      '11222333', // 0: cnpjBasico
      '0001',     // 1: cnpjOrdem
      '81',       // 2: cnpjDv
      '1',        // 3: matrizFilial
      'EXEMPLO',  // 4: nomeFantasia
      '02',       // 5: situacaoCadastral
      '20200115', // 6: dataSituacaoCadastral
      '',         // 7: motivoSituacaoCadastral
      '',         // 8: nomeCidadeExterior
      '',         // 9: pais
      '20200101', // 10: dataInicioAtividade
      '6201501',  // 11: cnaeFiscalPrincipal
      '6202300,6204000', // 12: cnaeFiscalSecundaria
      'RUA',      // 13: tipoLogradouro
      'DAS FLORES', // 14: logradouro
      '100',      // 15: numero
      'SALA 1',   // 16: complemento
      'CENTRO',   // 17: bairro
      '30130000', // 18: cep
      'MG',       // 19: uf
      '7107',     // 20: municipio
      '31',       // 21: ddd1
      '99999999', // 22: telefone1
      '',         // 23: ddd2
      '',         // 24: telefone2
      '',         // 25: dddFax
      '',         // 26: fax
      'contato@exemplo.com', // 27: email
      '',         // 28: situacaoEspecial
      '',         // 29: dataSituacaoEspecial
    ];
    Object.entries(overrides).forEach(([i, v]) => { defaults[Number(i)] = v; });
    return defaults;
  };

  it('deve parsear linha com todos os 30 campos', () => {
    const result = parser.parseLine(buildFields());
    expect(result).not.toBeNull();
    expect(result!.cnpjBasico).toBe('11222333');
    expect(result!.cnpjOrdem).toBe('0001');
    expect(result!.cnpjDv).toBe('81');
    expect(result!.situacaoCadastral).toBe('02');
    expect(result!.cnaeFiscalPrincipal).toBe('6201501');
  });

  it('deve tratar cnae_fiscal_secundaria com múltiplos códigos separados por vírgula', () => {
    const result = parser.parseLine(buildFields({ 12: '6201501,6202300,6204000' }));
    expect(result!.cnaeFiscalSecundaria).toBe('6201501,6202300,6204000');
  });

  it('deve tratar cnae_fiscal_secundaria vazio como null', () => {
    const result = parser.parseLine(buildFields({ 12: '' }));
    expect(result!.cnaeFiscalSecundaria).toBeNull();
  });

  it('deve tratar campos de telefone vazios como null', () => {
    const result = parser.parseLine(buildFields({ 23: '', 24: '' }));
    expect(result!.ddd2).toBeNull();
    expect(result!.telefone2).toBeNull();
  });

  it('deve retornar null quando cnpjBasico está vazio', () => {
    const result = parser.parseLine(buildFields({ 0: '' }));
    expect(result).toBeNull();
  });

  it('deve tratar situação especial e data da situação especial', () => {
    const result = parser.parseLine(buildFields({ 28: 'EM LIQUIDAÇÃO', 29: '20230101' }));
    expect(result!.situacaoEspecial).toBe('EM LIQUIDAÇÃO');
    expect(result!.dataSituacaoEspecial).toBe('20230101');
  });
});
