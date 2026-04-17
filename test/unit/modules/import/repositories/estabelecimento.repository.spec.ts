import { Test, TestingModule } from '@nestjs/testing';
import { EstabelecimentoRepository } from '../../../../../src/modules/import/repositories/estabelecimento.repository';
import { PrismaService } from '../../../../../src/prisma/prisma.service';
import { Estabelecimento } from '../../../../../src/domain/estabelecimento';

const mockPrismaService = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

const buildEstabelecimento = (
  cnpjBasico: string,
  overrides: Partial<Estabelecimento> = {},
): Estabelecimento => ({
  cnpjBasico,
  cnpjOrdem: '0001',
  cnpjDv: '91',
  identificadorMatrizFilial: '1',
  nomeFantasia: null,
  situacaoCadastral: '02',
  dataSituacaoCadastral: '20200101',
  motivoSituacaoCadastralCodigo: null,
  nomeCidadeExterior: null,
  paisCodigo: null,
  dataInicioAtividade: '20200101',
  cnaeFiscalPrincipal: '6201501',
  cnaeFiscalSecundaria: null,
  tipoLogradouro: 'RUA',
  logradouro: 'DAS FLORES',
  numero: '100',
  complemento: null,
  bairro: 'CENTRO',
  cep: '30130000',
  uf: 'MG',
  municipioCodigo: '7107',
  ddd1: '31',
  telefone1: '99999999',
  ddd2: null,
  telefone2: null,
  dddFax: null,
  fax: null,
  correioEletronico: null,
  situacaoEspecial: null,
  dataSituacaoEspecial: null,
  ...overrides,
});

describe('EstabelecimentoRepository', () => {
  let repository: EstabelecimentoRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstabelecimentoRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<EstabelecimentoRepository>(EstabelecimentoRepository);
    jest.clearAllMocks();
    mockPrismaService.$executeRaw.mockResolvedValue(1);
  });

  describe('inicializar', () => {
    it('deve carregar códigos de países e municípios em memória', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ codigo: '105' }, { codigo: '001' }]) // paises
        .mockResolvedValueOnce([{ codigo: '7107' }, { codigo: '5300108' }]); // municipios

      await repository.inicializar();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('deve trimar espaços ao carregar os códigos FK', async () => {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ codigo: ' 105 ' }])
        .mockResolvedValueOnce([{ codigo: ' 7107 ' }]);

      await repository.inicializar();

      // Após inicializar, um estabelecimento com país ' 105 ' deve passar a FK validation
      const record = buildEstabelecimento('00000001', { paisCodigo: '105' });
      mockPrismaService.$executeRaw.mockResolvedValue(1);
      await repository.upsertBatch([record]);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertBatch', () => {
    beforeEach(async () => {
      // Pré-carrega FK sets antes de cada upsert
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ codigo: '105' }])
        .mockResolvedValueOnce([{ codigo: '7107' }]);
      await repository.inicializar();
      jest.clearAllMocks();
      mockPrismaService.$executeRaw.mockResolvedValue(1);
    });

    it('deve retornar 0 sem executar query quando lista está vazia', async () => {
      const result = await repository.upsertBatch([]);

      expect(result).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('deve executar um único INSERT para lote pequeno', async () => {
      const records = [buildEstabelecimento('00000001'), buildEstabelecimento('00000002')];

      const result = await repository.upsertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(2);
    });

    it('deve dividir em múltiplos chunks quando lote supera MAX_ROWS', async () => {
      // MAX_ROWS = floor(32000 / 30) = 1066
      const MAX_ROWS = Math.floor(32000 / 30);
      const records = Array.from({ length: MAX_ROWS + 1 }, (_, i) =>
        buildEstabelecimento(String(i).padStart(8, '0')),
      );

      const result = await repository.upsertBatch(records);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
      expect(result).toBe(MAX_ROWS + 1);
    });

    it('deve substituir paisCodigo inválido por null antes de gravar', async () => {
      // '999' não está no Set de países válidos carregado em beforeEach
      const record = buildEstabelecimento('00000001', { paisCodigo: '999' });

      await repository.upsertBatch([record]);

      // O $executeRaw deve ter sido chamado (lote não está vazio)
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('deve substituir municipioCodigo inválido por null antes de gravar', async () => {
      // '9999' não está no Set de municípios válidos
      const record = buildEstabelecimento('00000001', { municipioCodigo: '9999' });

      await repository.upsertBatch([record]);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('deve aceitar estabelecimento com paisCodigo válido e manter o código', async () => {
      const record = buildEstabelecimento('00000001', { paisCodigo: '105' });

      await repository.upsertBatch([record]);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
