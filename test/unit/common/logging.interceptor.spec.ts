import { of } from 'rxjs';
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor';

const buildContext = (method = 'GET', url = '/api/cnpj/00000000000191') => ({
  switchToHttp: () => ({
    getRequest: () => ({ method, url }),
  }),
});

const buildCallHandler = (value: unknown = {}) => ({
  handle: () => of(value),
});

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => undefined);
  });

  it('deve registrar método, URL e tempo de resposta ao concluir a requisição', (done) => {
    const context = buildContext('GET', '/api/cnpj/00000000000191');
    const next = buildCallHandler({ cnpjBasico: '00000000' });

    interceptor.intercept(context as any, next as any).subscribe({
      next: () => {},
      complete: () => {
        expect(interceptor['logger'].log).toHaveBeenCalledTimes(1);
        const logMessage = (interceptor['logger'].log as jest.Mock).mock.calls[0][0] as string;
        expect(logMessage).toMatch(/GET \/api\/cnpj\/00000000000191 - \d+ms/);
        done();
      },
    });
  });

  it('deve repassar o valor original retornado pelo handler', (done) => {
    const payload = [{ id: 1 }, { id: 2 }];
    const context = buildContext('GET', '/api/dominio/paises');
    const next = buildCallHandler(payload);

    interceptor.intercept(context as any, next as any).subscribe({
      next: (value) => {
        expect(value).toEqual(payload);
      },
      complete: done,
    });
  });

  it('deve registrar requisiões POST corretamente', (done) => {
    const context = buildContext('POST', '/api/cnpj');
    const next = buildCallHandler({});

    interceptor.intercept(context as any, next as any).subscribe({
      complete: () => {
        const logMessage = (interceptor['logger'].log as jest.Mock).mock.calls[0][0] as string;
        expect(logMessage).toMatch(/^POST \/api\/cnpj - /);
        done();
      },
    });
  });
});
