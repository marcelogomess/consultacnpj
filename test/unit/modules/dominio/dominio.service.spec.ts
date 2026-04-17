import { Test, TestingModule } from '@nestjs/testing';
import { DominioService } from '../../../../src/modules/dominio/dominio.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

const mockPrismaService = {
  pais: { findMany: jest.fn() },
  municipio: { findMany: jest.fn() },
  cnae: { findMany: jest.fn() },
  naturezaJuridica: { findMany: jest.fn() },
  qualificacaoSocio: { findMany: jest.fn() },
  motivoSituacaoCadastral: { findMany: jest.fn() },
  estabelecimento: {
    findMany: jest.fn(),
  },
};

describe('DominioService', () => {
  let service: DominioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DominioService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DominioService>(DominioService);
    jest.clearAllMocks();
  });

  describe('listarPaises', () => {
    it('deve retornar lista de países ordenada por descrição', async () => {
      const paises = [{ codigo: '105', descricao: 'BRASIL' }];
      mockPrismaService.pais.findMany.mockResolvedValue(paises);

      const result = await service.listarPaises();

      expect(mockPrismaService.pais.findMany).toHaveBeenCalledWith({
        orderBy: { descricao: 'asc' },
      });
      expect(result).toEqual(paises);
    });

    it('deve retornar lista vazia quando não há países', async () => {
      mockPrismaService.pais.findMany.mockResolvedValue([]);

      const result = await service.listarPaises();

      expect(result).toEqual([]);
    });
  });

  describe('listarMunicipios', () => {
    it('deve retornar todos os municípios sem filtro de UF', async () => {
      const municipios = [{ codigo: '7107', descricao: 'BELO HORIZONTE' }];
      mockPrismaService.municipio.findMany.mockResolvedValue(municipios);

      const result = await service.listarMunicipios();

      expect(mockPrismaService.municipio.findMany).toHaveBeenCalledWith({
        orderBy: { descricao: 'asc' },
      });
      expect(result).toEqual(municipios);
    });

    it('deve filtrar municípios por UF via join com estabelecimentos', async () => {
      const estabelecimentos = [
        { municipioCodigo: '7107' },
        { municipioCodigo: '7108' },
        { municipioCodigo: null },
      ];
      const municipiosFiltrados = [{ codigo: '7107', descricao: 'BELO HORIZONTE' }];

      mockPrismaService.estabelecimento.findMany.mockResolvedValue(estabelecimentos);
      mockPrismaService.municipio.findMany.mockResolvedValue(municipiosFiltrados);

      const result = await service.listarMunicipios('MG');

      expect(mockPrismaService.estabelecimento.findMany).toHaveBeenCalledWith({
        where: { uf: 'MG', municipioCodigo: { not: null } },
        select: { municipioCodigo: true },
        distinct: ['municipioCodigo'],
      });
      expect(mockPrismaService.municipio.findMany).toHaveBeenCalledWith({
        where: { codigo: { in: ['7107', '7108'] } },
        orderBy: { descricao: 'asc' },
      });
      expect(result).toEqual(municipiosFiltrados);
    });

    it('deve converter UF para maiúsculas antes de filtrar', async () => {
      mockPrismaService.estabelecimento.findMany.mockResolvedValue([]);
      mockPrismaService.municipio.findMany.mockResolvedValue([]);

      await service.listarMunicipios('mg');

      expect(mockPrismaService.estabelecimento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ uf: 'MG' }) }),
      );
    });

    it('deve ignorar estabelecimentos com municipioCodigo nulo ao filtrar por UF', async () => {
      mockPrismaService.estabelecimento.findMany.mockResolvedValue([
        { municipioCodigo: null },
        { municipioCodigo: null },
      ]);
      mockPrismaService.municipio.findMany.mockResolvedValue([]);

      const result = await service.listarMunicipios('SP');

      expect(mockPrismaService.municipio.findMany).toHaveBeenCalledWith({
        where: { codigo: { in: [] } },
        orderBy: { descricao: 'asc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('listarCnaes', () => {
    it('deve retornar todos os CNAEs sem filtro', async () => {
      const cnaes = [{ codigo: '6201501', descricao: 'DESENVOLVIMENTO SOB ENCOMENDA' }];
      mockPrismaService.cnae.findMany.mockResolvedValue(cnaes);

      const result = await service.listarCnaes();

      expect(mockPrismaService.cnae.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { codigo: 'asc' },
      });
      expect(result).toEqual(cnaes);
    });

    it('deve filtrar CNAEs por busca textual case-insensitive', async () => {
      mockPrismaService.cnae.findMany.mockResolvedValue([]);

      await service.listarCnaes('software');

      expect(mockPrismaService.cnae.findMany).toHaveBeenCalledWith({
        where: { descricao: { contains: 'software', mode: 'insensitive' } },
        orderBy: { codigo: 'asc' },
      });
    });

    it('deve tratar string de busca vazia como ausência de filtro', async () => {
      mockPrismaService.cnae.findMany.mockResolvedValue([]);

      await service.listarCnaes('');

      // string vazia é falsy, where deve ser undefined
      expect(mockPrismaService.cnae.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { codigo: 'asc' },
      });
    });
  });

  describe('listarNaturezasJuridicas', () => {
    it('deve retornar naturezas jurídicas ordenadas por código', async () => {
      const naturezas = [{ codigo: '2062', descricao: 'SOCIEDADE EMPRESARIA LIMITADA' }];
      mockPrismaService.naturezaJuridica.findMany.mockResolvedValue(naturezas);

      const result = await service.listarNaturezasJuridicas();

      expect(mockPrismaService.naturezaJuridica.findMany).toHaveBeenCalledWith({
        orderBy: { codigo: 'asc' },
      });
      expect(result).toEqual(naturezas);
    });
  });

  describe('listarQualificacoes', () => {
    it('deve retornar qualificações ordenadas por código', async () => {
      const qualificacoes = [{ codigo: '49', descricao: 'SÓCIO-ADMINISTRADOR' }];
      mockPrismaService.qualificacaoSocio.findMany.mockResolvedValue(qualificacoes);

      const result = await service.listarQualificacoes();

      expect(mockPrismaService.qualificacaoSocio.findMany).toHaveBeenCalledWith({
        orderBy: { codigo: 'asc' },
      });
      expect(result).toEqual(qualificacoes);
    });
  });

  describe('listarMotivosSituacao', () => {
    it('deve retornar motivos de situação cadastral ordenados por código', async () => {
      const motivos = [{ codigo: '01', descricao: 'EXTINÇÃO POR ENCERRAMENTO' }];
      mockPrismaService.motivoSituacaoCadastral.findMany.mockResolvedValue(motivos);

      const result = await service.listarMotivosSituacao();

      expect(mockPrismaService.motivoSituacaoCadastral.findMany).toHaveBeenCalledWith({
        orderBy: { codigo: 'asc' },
      });
      expect(result).toEqual(motivos);
    });
  });
});
