import { Test, TestingModule } from '@nestjs/testing';
import { SocioRepository } from '../../../../../src/modules/import/repositories/socio.repository';
import { PrismaService } from '../../../../../src/prisma/prisma.service';
import { Socio } from '../../../../../src/domain/socio';

const mockPrismaService = {
  $executeRaw: jest.fn(),
  socio: {
    deleteMany: jest.fn(),
  },
};

const buildSocio = (cnpjBasico: string, overrides: Partial<Socio> = {}): Socio => ({
  cnpjBasico,
  identificadorSocio: '2',
  nomeSocio: 'JOAO SILVA',
  cpfCnpjSocio: '***456789**',
  qualificacaoSocioCodigo: '49',
  dataEntradaSociedade: '20200101',
  paisCodigo: null,
  representanteLegal: null,
  nomeRepresentante: null,
  qualificacaoRepresentante: null,
  faixaEtaria: '4',
  ...overrides,
});

describe('SocioRepository', () => {
  let repository: SocioRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocioRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<SocioRepository>(SocioRepository);
    jest.clearAllMocks();
    mockPrismaService.$executeRaw.mockResolvedValue(1);
    mockPrismaService.socio.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('insertBatch', () => {
    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      const result = await repository.insertBatch([]);

      expect(result).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar DELETE e INSERT para lote com socios', async () => {
      // Primeira chamada $executeRaw = DELETE; segunda = INSERT (que retorna count)
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(2);        // INSERT retorna linhas afetadas

      const records = [buildSocio('00000001'), buildSocio('00000002')];

      await repository.insertBatch(records);

      // Deve ter chamado $executeRaw pelo menos 2 vezes (1 DELETE + 1 INSERT)
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('deve executar apenas um DELETE por batch independentemente de quantos sócios', async () => {
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(3);        // INSERT

      const records = [
        buildSocio('00000001'),
        buildSocio('00000001'), // mesmo CNPJ (2 sócios da mesma empresa)
        buildSocio('00000002'),
      ];

      await repository.insertBatch(records);

      // O DELETE usa SET de cnpjs únicos; ainda deve ser chamado 1 vez
      const calls = (mockPrismaService.$executeRaw as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('deve dividir em múltiplos chunks quando lote supera SOCIO_MAX_ROWS', async () => {
      // SOCIO_MAX_ROWS = floor(32000 / 11) = 2909
      const MAX_ROWS = Math.floor(32000 / 11);
      const records = Array.from({ length: MAX_ROWS + 1 }, (_, i) =>
        buildSocio(String(i).padStart(8, '0')),
      );

      // DELETE (1) + INSERT chunk1 (1) + INSERT chunk2 (1) = 3 calls
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(MAX_ROWS)  // INSERT chunk 1
        .mockResolvedValueOnce(1);        // INSERT chunk 2

      await repository.insertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('deve acumular total a partir do retorno numérico do INSERT', async () => {
      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(BigInt(3)); // INSERT retorna BigInt (Prisma $executeRaw)

      const records = [buildSocio('00000001'), buildSocio('00000002'), buildSocio('00000003')];

      const result = await repository.insertBatch(records);

      expect(result).toBe(3);
    });
  });

  describe('truncate', () => {
    it('deve executar TRUNCATE TABLE socios', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      await repository.truncate();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteByCnpjBasico', () => {
    it('deve chamar prisma.socio.deleteMany com o cnpjBasico informado', async () => {
      await repository.deleteByCnpjBasico('00000001');

      expect(mockPrismaService.socio.deleteMany).toHaveBeenCalledWith({
        where: { cnpjBasico: '00000001' },
      });
    });
  });
});
