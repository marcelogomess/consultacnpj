import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CnpjService } from '../../../../src/modules/cnpj/cnpj.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

const mockPrismaService = {
  empresa: {
    findUnique: jest.fn(),
  },
  qualificacaoSocio: {
    findMany: jest.fn(),
  },
  cnae: {
    findMany: jest.fn(),
  },
  motivoSituacaoCadastral: {
    findMany: jest.fn(),
  },
  estabelecimento: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const buildEmpresaMock = (overrides = {}) => ({
  cnpjBasico: '00000000',
  razaoSocial: 'EMPRESA TESTE LTDA',
  naturezaJuridicaCodigo: '2062',
  qualificacaoResponsavel: '49',
  capitalSocial: { toNumber: () => 100000 },
  porteEmpresa: '01',
  enteFederativoResponsavel: null,
  naturezaJuridica: { codigo: '2062', descricao: 'SOCIEDADE EMPRESARIA LIMITADA' },
  estabelecimentos: [],
  socios: [],
  simplesNacional: null,
  ...overrides,
});

describe('CnpjService', () => {
  let service: CnpjService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CnpjService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<CnpjService>(CnpjService);
    jest.clearAllMocks();

    // Defaults para queries de lookup
    mockPrismaService.qualificacaoSocio.findMany.mockResolvedValue([]);
    mockPrismaService.cnae.findMany.mockResolvedValue([]);
    mockPrismaService.motivoSituacaoCadastral.findMany.mockResolvedValue([]);
  });

  describe('buscarPorCnpj', () => {
    it('deve lançar BadRequestException para CNPJ com todos os dígitos iguais', async () => {
      await expect(service.buscarPorCnpj('00000000000000')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CNPJ com formato inválido', async () => {
      await expect(service.buscarPorCnpj('invalido')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para CNPJ com dígito verificador errado', async () => {
      await expect(service.buscarPorCnpj('11222333000199')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando CNPJ não existe no banco', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(null);
      await expect(service.buscarPorCnpj('00000000000191')).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar CNPJ formatado com pontuação como entrada inválida', async () => {
      await expect(service.buscarPorCnpj('00.000.000/0001-91')).rejects.toThrow(BadRequestException);
    });

    it('deve retornar empresa completa com simplesNacional quando presente', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(
        buildEmpresaMock({
          simplesNacional: {
            opcaoSimples: 'S',
            dataOpcaoSimples: '20200101',
            dataExclusaoSimples: null,
            opcaoMei: 'N',
            dataOpcaoMei: null,
            dataExclusaoMei: null,
          },
        }),
      );

      const result = await service.buscarPorCnpj('00000000000191');

      expect(result.simplesNacional).not.toBeNull();
      expect(result.simplesNacional!.descricaoOpcaoSimples).toBe('SIM');
      expect(result.simplesNacional!.descricaoOpcaoMei).toBe('NÃO');
    });

    it('deve retornar simplesNacional null quando empresa não tem dados do simples', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(buildEmpresaMock());

      const result = await service.buscarPorCnpj('00000000000191');

      expect(result.simplesNacional).toBeNull();
    });

    it('deve incluir estabelecimentos com endereço completo', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(
        buildEmpresaMock({
          estabelecimentos: [
            {
              cnpjBasico: '00000000',
              cnpjOrdem: '0001',
              cnpjDv: '91',
              identificadorMatrizFilial: '1',
              nomeFantasia: 'FANTASIA TESTE',
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
              correioEletronico: 'test@test.com',
              situacaoEspecial: null,
              dataSituacaoEspecial: null,
              pais: null,
              municipio: { codigo: '7107', descricao: 'BELO HORIZONTE' },
            },
          ],
        }),
      );

      const result = await service.buscarPorCnpj('00000000000191');

      expect(result.estabelecimentos).toHaveLength(1);
      const est = result.estabelecimentos[0];
      expect(est.nomeFantasia).toBe('FANTASIA TESTE');
      expect(est.situacaoCadastral.descricao).toBe('ATIVA');
      expect(est.tipo.descricao).toBe('MATRIZ');
      expect(est.endereco.municipio?.descricao).toBe('BELO HORIZONTE');
      expect(est.telefones).toHaveLength(1);
      expect(est.telefones[0].ddd).toBe('31');
    });

    it('deve incluir sócios com faixa etária traduzida', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(
        buildEmpresaMock({
          socios: [
            {
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
              pais: null,
            },
          ],
        }),
      );
      mockPrismaService.qualificacaoSocio.findMany.mockResolvedValue([
        { codigo: '49', descricao: 'SÓCIO-ADMINISTRADOR' },
      ]);

      const result = await service.buscarPorCnpj('00000000000191');

      expect(result.socios).toHaveLength(1);
      expect(result.socios[0].faixaEtaria?.descricao).toBe('31 a 40 anos');
      expect(result.socios[0].cpfCnpj).toBe('***456789**');
    });

    it('deve resolver CNAEs secundários para lista de objetos com descricao', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(
        buildEmpresaMock({
          estabelecimentos: [
            {
              cnpjBasico: '00000000',
              cnpjOrdem: '0001',
              cnpjDv: '91',
              identificadorMatrizFilial: '1',
              nomeFantasia: null,
              situacaoCadastral: '02',
              dataSituacaoCadastral: null,
              motivoSituacaoCadastralCodigo: null,
              nomeCidadeExterior: null,
              paisCodigo: null,
              dataInicioAtividade: null,
              cnaeFiscalPrincipal: null,
              cnaeFiscalSecundaria: '6201501,6202300',
              tipoLogradouro: null,
              logradouro: null,
              numero: null,
              complemento: null,
              bairro: null,
              cep: null,
              uf: null,
              municipioCodigo: null,
              ddd1: null,
              telefone1: null,
              ddd2: null,
              telefone2: null,
              dddFax: null,
              fax: null,
              correioEletronico: null,
              situacaoEspecial: null,
              dataSituacaoEspecial: null,
              pais: null,
              municipio: null,
            },
          ],
        }),
      );
      mockPrismaService.cnae.findMany.mockResolvedValue([
        { codigo: '6201501', descricao: 'DESENVOLVIMENTO SOB ENCOMENDA' },
        { codigo: '6202300', descricao: 'DESENVOLVIMENTO CUSTOMIZÁVEL' },
      ]);

      const result = await service.buscarPorCnpj('00000000000191');

      expect(result.estabelecimentos[0].cnaeSecundario).toHaveLength(2);
      expect(result.estabelecimentos[0].cnaeSecundario[0].codigo).toBe('6201501');
    });

    it('deve retornar capitalSocial como número', async () => {
      mockPrismaService.empresa.findUnique.mockResolvedValue(buildEmpresaMock());

      const result = await service.buscarPorCnpj('00000000000191');

      expect(typeof result.capitalSocial).toBe('number');
    });
  });

  describe('listar', () => {
    it('deve retornar lista paginada com meta', async () => {
      mockPrismaService.$transaction.mockResolvedValue([0, []]);

      const result = await service.listar({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.pages).toBe(0);
    });

    it('deve calcular pages corretamente', async () => {
      mockPrismaService.$transaction.mockResolvedValue([45, []]);

      const result = await service.listar({ page: 1, limit: 20 });

      expect(result.meta.pages).toBe(3);
    });

    it('deve aplicar filtro de situação cadastral', async () => {
      mockPrismaService.$transaction.mockResolvedValue([0, []]);

      await service.listar({ situacao_cadastral: '02' });

      const call = mockPrismaService.$transaction.mock.calls[0][0];
      // a transação recebe dois argumentos (count + findMany)
      expect(call).toHaveLength(2);
    });
  });
});
