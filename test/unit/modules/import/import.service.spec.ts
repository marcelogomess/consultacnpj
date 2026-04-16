import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { ImportService } from '../../../../src/modules/import/import.service';
import { DominioRepository } from '../../../../src/modules/import/repositories/dominio.repository';
import { EmpresaRepository } from '../../../../src/modules/import/repositories/empresa.repository';
import { EstabelecimentoRepository } from '../../../../src/modules/import/repositories/estabelecimento.repository';
import { SocioRepository } from '../../../../src/modules/import/repositories/socio.repository';
import { PrismaService } from '../../../../src/prisma/prisma.service';

const FIXTURES_DIR = path.join(__dirname, '../../../fixtures');

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      'app.importBatchSize': 100,
      'app.downloadDir': FIXTURES_DIR,
    };
    return map[key];
  }),
};

const mockDominioRepo = {
  upsertPaises: jest.fn().mockResolvedValue(3),
  upsertMunicipios: jest.fn().mockResolvedValue(4),
  upsertQualificacoes: jest.fn().mockResolvedValue(5),
  upsertNaturezasJuridicas: jest.fn().mockResolvedValue(4),
  upsertCnaes: jest.fn().mockResolvedValue(4),
  upsertMotivos: jest.fn().mockResolvedValue(4),
};
const mockEmpresaRepo = { upsertBatch: jest.fn().mockResolvedValue(3) };
const mockEstabRepo = {
  inicializar: jest.fn().mockResolvedValue(undefined),
  upsertBatch: jest.fn().mockResolvedValue(2),
};
const mockSocioRepo = {
  insertBatch: jest.fn().mockResolvedValue(3),
  truncate: jest.fn().mockResolvedValue(undefined),
};
const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(0),
  $queryRaw: jest.fn().mockResolvedValue([]), // retorna array vazio = nenhum cnpj_basico válido
  $transaction: jest.fn().mockResolvedValue([]),
  importLog: {
    findFirst: jest.fn().mockResolvedValue(null), // null = ainda não importado
    create: jest.fn().mockResolvedValue({}),
  },
};

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DominioRepository, useValue: mockDominioRepo },
        { provide: EmpresaRepository, useValue: mockEmpresaRepo },
        { provide: EstabelecimentoRepository, useValue: mockEstabRepo },
        { provide: SocioRepository, useValue: mockSocioRepo },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    jest.clearAllMocks();
    // Restaura os mocks padrão após clearAllMocks
    mockDominioRepo.upsertPaises.mockResolvedValue(3);
    mockDominioRepo.upsertMunicipios.mockResolvedValue(4);
    mockDominioRepo.upsertQualificacoes.mockResolvedValue(5);
    mockDominioRepo.upsertNaturezasJuridicas.mockResolvedValue(4);
    mockDominioRepo.upsertCnaes.mockResolvedValue(4);
    mockDominioRepo.upsertMotivos.mockResolvedValue(4);
    mockEmpresaRepo.upsertBatch.mockResolvedValue(3);
    mockEstabRepo.inicializar.mockResolvedValue(undefined);
    mockEstabRepo.upsertBatch.mockResolvedValue(2);
    mockSocioRepo.insertBatch.mockResolvedValue(3);
    mockSocioRepo.truncate.mockResolvedValue(undefined);
    mockPrisma.$executeRaw.mockResolvedValue(0);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$transaction.mockResolvedValue([]);
    mockPrisma.importLog.findFirst.mockResolvedValue(null);
    mockPrisma.importLog.create.mockResolvedValue({});
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('importarPaises', () => {
    it('deve importar países usando fixture CSV', async () => {
      const fixture = path.join(FIXTURES_DIR, 'pais-sample.csv');
      const total = await service.importarPaises(fixture);
      expect(total).toBeGreaterThan(0);
      expect(mockDominioRepo.upsertPaises).toHaveBeenCalled();
    });
  });

  describe('importarMunicipios', () => {
    it('deve importar municípios usando fixture CSV', async () => {
      const fixture = path.join(FIXTURES_DIR, 'municipio-sample.csv');
      const total = await service.importarMunicipios(fixture);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('importarEmpresas', () => {
    it('deve importar empresas usando fixture CSV', async () => {
      const fixture = path.join(FIXTURES_DIR, 'empresa-sample.csv');
      const total = await service.importarEmpresas(fixture);
      expect(total).toBeGreaterThan(0);
      expect(mockEmpresaRepo.upsertBatch).toHaveBeenCalled();
    });
  });

  describe('importarEstabelecimentos', () => {
    it('deve importar estabelecimentos usando fixture CSV', async () => {
      const fixture = path.join(FIXTURES_DIR, 'estabelecimento-sample.csv');
      const total = await service.importarEstabelecimentos(fixture);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('importarSocios', () => {
    it('deve importar sócios usando fixture CSV', async () => {
      const fixture = path.join(FIXTURES_DIR, 'socio-sample.csv');
      const total = await service.importarSocios(fixture);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('importarTudo', () => {
    it('deve continuar importação mesmo se um arquivo não for encontrado', async () => {
      // downloadDir contém fixtures que não batem com todos os padrões
      const resultados = await service.importarTudo();
      // Não deve lançar exceção
      expect(Array.isArray(resultados)).toBe(true);
    });

    it('deve retornar array de resultados com propriedades sucesso e registros', async () => {
      const resultados = await service.importarTudo();
      for (const r of resultados) {
        expect(r).toHaveProperty('arquivo');
        expect(r).toHaveProperty('sucesso');
        expect(r).toHaveProperty('registros');
      }
    });
  });
});
