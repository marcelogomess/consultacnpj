import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaRepository } from '../../../../../src/modules/import/repositories/empresa.repository';
import { PrismaService } from '../../../../../src/prisma/prisma.service';
import { Empresa } from '../../../../../src/domain/empresa';

const mockPrismaService = {
  $executeRaw: jest.fn(),
};

const buildEmpresa = (cnpjBasico: string): Empresa => ({
  cnpjBasico,
  razaoSocial: `EMPRESA ${cnpjBasico} LTDA`,
  naturezaJuridicaCodigo: '2062',
  qualificacaoResponsavel: '49',
  capitalSocial: 100000,
  porteEmpresa: '01',
  enteFederativoResponsavel: null,
});

describe('EmpresaRepository', () => {
  let repository: EmpresaRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<EmpresaRepository>(EmpresaRepository);
    jest.clearAllMocks();
    mockPrismaService.$executeRaw.mockResolvedValue(1);
  });

  describe('upsertBatch', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      const result = await repository.upsertBatch([]);

      expect(result).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar um único INSERT para lote pequeno e retornar total', async () => {
      const records = [buildEmpresa('00000001'), buildEmpresa('00000002')];

      const result = await repository.upsertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(2);
    });

    it('deve dividir em múltiplos chunks quando lote supera MAX_ROWS', async () => {
      // MAX_ROWS = floor(32000 / 7) = 4571
      // Criamos 4572 registros para forçar 2 chunks
      const MAX_ROWS = Math.floor(32000 / 7);
      const records = Array.from({ length: MAX_ROWS + 1 }, (_, i) =>
        buildEmpresa(String(i).padStart(8, '0')),
      );

      const result = await repository.upsertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
      expect(result).toBe(MAX_ROWS + 1);
    });

    it('deve acumular corretamente o total de múltiplos chunks', async () => {
      const MAX_ROWS = Math.floor(32000 / 7);
      // 3 chunks: MAX_ROWS + MAX_ROWS + 5
      const records = Array.from({ length: MAX_ROWS * 2 + 5 }, (_, i) =>
        buildEmpresa(String(i).padStart(8, '0')),
      );

      const result = await repository.upsertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(3);
      expect(result).toBe(MAX_ROWS * 2 + 5);
    });
  });
});
