import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

const buildHost = (url = '/api/test') => {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const mockRequest = { url };
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
    mockResponse,
  };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  describe('HttpException com resposta em objeto', () => {
    it('deve usar status, message e error do objeto de resposta', () => {
      const exception = new HttpException(
        { message: 'CNPJ inválido', error: 'CNPJ_INVALIDO' },
        HttpStatus.BAD_REQUEST,
      );
      const { switchToHttp, mockResponse } = buildHost('/api/cnpj/abc');

      filter.catch(exception, { switchToHttp } as any);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'CNPJ_INVALIDO',
          message: 'CNPJ inválido',
          path: '/api/cnpj/abc',
        }),
      );
    });

    it('deve usar HTTP_<status> como code quando error não está presente na resposta', () => {
      const exception = new HttpException(
        { message: 'Não encontrado' },
        HttpStatus.NOT_FOUND,
      );
      const { switchToHttp, mockResponse } = buildHost();

      filter.catch(exception, { switchToHttp } as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'HTTP_404',
          message: 'Não encontrado',
        }),
      );
    });
  });

  describe('HttpException com resposta em string', () => {
    it('deve usar a string como message e HTTP_<status> como code', () => {
      const exception = new HttpException('Proibido', HttpStatus.FORBIDDEN);
      const { switchToHttp, mockResponse } = buildHost();

      filter.catch(exception, { switchToHttp } as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          code: 'HTTP_403',
          message: 'Proibido',
        }),
      );
    });
  });

  describe('Erro genérico (não-HttpException)', () => {
    it('deve retornar 500 com mensagem padrão e logar o erro', () => {
      const exception = new Error('Falha inesperada');
      const { switchToHttp, mockResponse } = buildHost();

      filter.catch(exception, { switchToHttp } as any);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        }),
      );
      expect(filter['logger'].error).toHaveBeenCalled();
    });

    it('deve retornar 500 para exceções que não são instâncias de Error', () => {
      const { switchToHttp, mockResponse } = buildHost();

      filter.catch('erro desconhecido', { switchToHttp } as any);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_ERROR',
        }),
      );
    });
  });

  describe('Resposta sempre contém timestamp e path', () => {
    it('deve incluir timestamp ISO e path da requisição na resposta', () => {
      const exception = new HttpException('Não autorizado', HttpStatus.UNAUTHORIZED);
      const { switchToHttp, mockResponse } = buildHost('/api/cnpj/00000000000191');

      filter.catch(exception, { switchToHttp } as any);

      const payload = mockResponse.json.mock.calls[0][0];
      expect(payload.path).toBe('/api/cnpj/00000000000191');
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
