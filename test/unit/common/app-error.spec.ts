import { AppError } from '../../../src/common/errors/app-error';
import { ErrorCode } from '../../../src/common/errors/error-codes';

describe('AppError', () => {
  it('deve criar instância com code e message', () => {
    const error = new AppError(ErrorCode.CNPJ_INVALIDO, 'CNPJ com formato inválido');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ErrorCode.CNPJ_INVALIDO);
    expect(error.message).toBe('CNPJ com formato inválido');
    expect(error.name).toBe('AppError');
  });

  it('deve aceitar details como terceiro parâmetro opcional', () => {
    const details = { cnpj: '00000000000000', motivo: 'dígito verificador inválido' };
    const error = new AppError(ErrorCode.CNPJ_INVALIDO, 'CNPJ inválido', details);

    expect(error.details).toEqual(details);
  });

  it('deve ter details undefined quando não informado', () => {
    const error = new AppError(ErrorCode.CNPJ_NAO_ENCONTRADO, 'Não encontrado');

    expect(error.details).toBeUndefined();
  });

  it('deve preservar cadeia de protótipos corretamente (instanceof)', () => {
    const error = new AppError(ErrorCode.BANCO_INDISPONIVEL, 'Banco fora do ar');

    // Garante que Object.setPrototypeOf(this, new.target.prototype) funcionou
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('deve suportar todos os ErrorCodes disponíveis', () => {
    const codes = [
      ErrorCode.CNPJ_INVALIDO,
      ErrorCode.CNPJ_NAO_ENCONTRADO,
      ErrorCode.BANCO_INDISPONIVEL,
      ErrorCode.DOWNLOAD_FALHOU,
      ErrorCode.IMPORTACAO_FALHOU,
      ErrorCode.PARAMETROS_INVALIDOS,
    ];

    codes.forEach((code) => {
      const error = new AppError(code, `Erro ${code}`);
      expect(error.code).toBe(code);
    });
  });
});
