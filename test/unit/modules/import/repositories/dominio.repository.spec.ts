import { Test, TestingModule } from '@nestjs/testing';
import { DominioRepository } from '../../../../../src/modules/import/repositories/dominio.repository';
import { PrismaService } from '../../../../../src/prisma/prisma.service';

const mockPrismaService = {
  $executeRaw: jest.fn(),
};

describe('DominioRepository', () => {
  let repository: DominioRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DominioRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<DominioRepository>(DominioRepository);
    jest.clearAllMocks();
    mockPrismaService.$executeRaw.mockResolvedValue(1);
  });

  describe('upsertPaises', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      const result = await repository.upsertPaises([]);

      expect(result).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [
        { codigo: '105', descricao: 'BRASIL' },
        { codigo: '001', descricao: 'AFEGANISTÃO' },
      ];

      const result = await repository.upsertPaises(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(2);
    });
  });

  describe('upsertMunicipios', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      const result = await repository.upsertMunicipios([]);

      expect(result).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [{ codigo: '7107', descricao: 'BELO HORIZONTE' }];

      const result = await repository.upsertMunicipios(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });
  });

  describe('upsertQualificacoes', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      expect(await repository.upsertQualificacoes([])).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [{ codigo: '49', descricao: 'SÓCIO-ADMINISTRADOR' }];
      expect(await repository.upsertQualificacoes(records)).toBe(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertNaturezasJuridicas', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      expect(await repository.upsertNaturezasJuridicas([])).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [{ codigo: '2062', descricao: 'SOCIEDADE EMPRESARIA LIMITADA' }];
      expect(await repository.upsertNaturezasJuridicas(records)).toBe(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertCnaes', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      expect(await repository.upsertCnaes([])).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [{ codigo: '6201501', descricao: 'DESENVOLVIMENTO SOB ENCOMENDA' }];
      expect(await repository.upsertCnaes(records)).toBe(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertMotivos', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      expect(await repository.upsertMotivos([])).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar upsert e retornar quantidade de registros', async () => {
      const records = [{ codigo: '01', descricao: 'EXTINÇÃO POR ENCERRAMENTO' }];
      expect(await repository.upsertMotivos(records)).toBe(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
