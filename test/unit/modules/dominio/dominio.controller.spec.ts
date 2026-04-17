import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { DominioController } from '../../../../src/modules/dominio/dominio.controller';
import { DominioService } from '../../../../src/modules/dominio/dominio.service';

const mockDominioService = {
  listarPaises: jest.fn(),
  listarMunicipios: jest.fn(),
  listarCnaes: jest.fn(),
  listarNaturezasJuridicas: jest.fn(),
  listarQualificacoes: jest.fn(),
  listarMotivosSituacao: jest.fn(),
};

describe('DominioController', () => {
  let controller: DominioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [DominioController],
      providers: [{ provide: DominioService, useValue: mockDominioService }],
    }).compile();

    controller = module.get<DominioController>(DominioController);
    jest.clearAllMocks();
  });

  describe('listarPaises', () => {
    it('deve chamar service.listarPaises e retornar resultado', async () => {
      const paises = [{ codigo: '105', descricao: 'BRASIL' }];
      mockDominioService.listarPaises.mockResolvedValue(paises);

      const result = await controller.listarPaises();

      expect(mockDominioService.listarPaises).toHaveBeenCalledTimes(1);
      expect(result).toEqual(paises);
    });
  });

  describe('listarMunicipios', () => {
    it('deve chamar service.listarMunicipios sem UF quando query está vazia', async () => {
      const municipios = [{ codigo: '7107', descricao: 'BELO HORIZONTE' }];
      mockDominioService.listarMunicipios.mockResolvedValue(municipios);

      const result = await controller.listarMunicipios({});

      expect(mockDominioService.listarMunicipios).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(municipios);
    });

    it('deve repassar UF ao service quando fornecida na query', async () => {
      mockDominioService.listarMunicipios.mockResolvedValue([]);

      await controller.listarMunicipios({ uf: 'MG' });

      expect(mockDominioService.listarMunicipios).toHaveBeenCalledWith('MG');
    });
  });

  describe('listarCnaes', () => {
    it('deve chamar service.listarCnaes sem filtro quando query está vazia', async () => {
      mockDominioService.listarCnaes.mockResolvedValue([]);

      await controller.listarCnaes({});

      expect(mockDominioService.listarCnaes).toHaveBeenCalledWith(undefined);
    });

    it('deve repassar termo de busca ao service quando fornecido', async () => {
      const cnaes = [{ codigo: '6201501', descricao: 'DESENVOLVIMENTO SOB ENCOMENDA' }];
      mockDominioService.listarCnaes.mockResolvedValue(cnaes);

      const result = await controller.listarCnaes({ q: 'software' });

      expect(mockDominioService.listarCnaes).toHaveBeenCalledWith('software');
      expect(result).toEqual(cnaes);
    });
  });

  describe('listarNaturezasJuridicas', () => {
    it('deve chamar service.listarNaturezasJuridicas e retornar resultado', async () => {
      const naturezas = [{ codigo: '2062', descricao: 'SOCIEDADE EMPRESARIA LIMITADA' }];
      mockDominioService.listarNaturezasJuridicas.mockResolvedValue(naturezas);

      const result = await controller.listarNaturezasJuridicas();

      expect(mockDominioService.listarNaturezasJuridicas).toHaveBeenCalledTimes(1);
      expect(result).toEqual(naturezas);
    });
  });

  describe('listarQualificacoes', () => {
    it('deve chamar service.listarQualificacoes e retornar resultado', async () => {
      const qualificacoes = [{ codigo: '49', descricao: 'SÓCIO-ADMINISTRADOR' }];
      mockDominioService.listarQualificacoes.mockResolvedValue(qualificacoes);

      const result = await controller.listarQualificacoes();

      expect(mockDominioService.listarQualificacoes).toHaveBeenCalledTimes(1);
      expect(result).toEqual(qualificacoes);
    });
  });

  describe('listarMotivosSituacao', () => {
    it('deve chamar service.listarMotivosSituacao e retornar resultado', async () => {
      const motivos = [{ codigo: '01', descricao: 'EXTINÇÃO POR ENCERRAMENTO' }];
      mockDominioService.listarMotivosSituacao.mockResolvedValue(motivos);

      const result = await controller.listarMotivosSituacao();

      expect(mockDominioService.listarMotivosSituacao).toHaveBeenCalledTimes(1);
      expect(result).toEqual(motivos);
    });
  });
});
