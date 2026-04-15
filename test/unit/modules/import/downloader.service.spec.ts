import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DownloaderService } from '../../../../src/modules/import/downloader.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const SHARE_TOKEN = 'YggdBLfdninEJX9';
const BASE_URL = 'https://arquivos.receitafederal.gov.br';

const propfindXml = (periodo: string, arquivos: string[]) => `
<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/public.php/webdav/${periodo}/</d:href>
    <d:propstat>
      <d:prop><d:displayname>${periodo}</d:displayname><d:resourcetype><d:collection/></d:resourcetype></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  ${arquivos
    .map(
      f => `
  <d:response>
    <d:href>/public.php/webdav/${periodo}/${f}</d:href>
    <d:propstat>
      <d:prop><d:displayname>${f}</d:displayname><d:resourcetype/></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`,
    )
    .join('')}
</d:multistatus>`;

function buildConfig(overrides: Record<string, unknown> = {}) {
  const map: Record<string, unknown> = {
    'app.receitaBaseUrl': BASE_URL,
    'app.receitaShareToken': SHARE_TOKEN,
    'app.receitaPeriodo': '',
    'app.downloadDir': '/tmp/cnpj-test',
    ...overrides,
  };
  return { get: jest.fn((key: string) => map[key]) };
}

const mockPrisma = {
  importLog: { create: jest.fn().mockResolvedValue({}) },
};

async function criarServico(configOverrides: Record<string, unknown> = {}): Promise<DownloaderService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DownloaderService,
      { provide: ConfigService, useValue: buildConfig(configOverrides) },
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();
  return module.get<DownloaderService>(DownloaderService);
}

describe('DownloaderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.importLog.create.mockResolvedValue({});
  });

  describe('periodoAtual', () => {
    it('deve retornar o mês atual no formato yyyy-MM', () => {
      const service = new DownloaderService(
        { get: jest.fn(() => '') } as unknown as ConfigService,
        mockPrisma as unknown as PrismaService,
      );
      const periodo = service.periodoAtual();
      expect(periodo).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('periodo configurado', () => {
    it('deve usar RECEITA_PERIODO quando definido', async () => {
      const service = await criarServico({ 'app.receitaPeriodo': '2026-04' });
      expect(service.periodo).toBe('2026-04');
    });

    it('deve usar o mês atual quando RECEITA_PERIODO está vazio', async () => {
      const service = await criarServico({ 'app.receitaPeriodo': '' });
      expect(service.periodo).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('listarArquivosDisponiveis', () => {
    it('deve fazer PROPFIND com autenticação Basic e retornar apenas .zip', async () => {
      const service = await criarServico({ 'app.receitaPeriodo': '2026-04' });
      const xmlResp = propfindXml('2026-04', ['Empresas0.zip', 'Estabelecimentos0.zip', 'readme.txt']);

      mockedAxios.request = jest.fn().mockResolvedValue({ data: xmlResp });

      const arquivos = await service.listarArquivosDisponiveis();

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PROPFIND',
          url: `${BASE_URL}/public.php/webdav/2026-04/`,
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
            Depth: '1',
          }),
        }),
      );
      expect(arquivos).toHaveLength(2);
      expect(arquivos[0].nome).toBe('Empresas0.zip');
      expect(arquivos[0].url).toBe(
        `${BASE_URL}/public.php/webdav/2026-04/Empresas0.zip`,
      );
    });

    it('deve retornar lista vazia quando não há .zip no período', async () => {
      const service = await criarServico({ 'app.receitaPeriodo': '2026-04' });
      mockedAxios.request = jest.fn().mockResolvedValue({
        data: propfindXml('2026-04', []),
      });

      const arquivos = await service.listarArquivosDisponiveis();
      expect(arquivos).toHaveLength(0);
    });

    it('deve incluir Authorization corretamente codificado em Base64', async () => {
      const service = await criarServico({ 'app.receitaPeriodo': '2026-04' });
      mockedAxios.request = jest.fn().mockResolvedValue({ data: propfindXml('2026-04', []) });

      await service.listarArquivosDisponiveis();

      const chamada = (mockedAxios.request as jest.Mock).mock.calls[0][0] as {
        headers: Record<string, string>;
      };
      const expectedBasic = Buffer.from(`${SHARE_TOKEN}:`).toString('base64');
      expect(chamada.headers.Authorization).toBe(`Basic ${expectedBasic}`);
    });

    it('deve omitir Authorization quando shareToken está vazio', async () => {
      const service = await criarServico({
        'app.receitaShareToken': '',
        'app.receitaPeriodo': '2026-04',
      });
      mockedAxios.request = jest.fn().mockResolvedValue({ data: propfindXml('2026-04', []) });

      await service.listarArquivosDisponiveis();

      const chamada = (mockedAxios.request as jest.Mock).mock.calls[0][0] as {
        headers: Record<string, string>;
      };
      expect(chamada.headers.Authorization).toBeUndefined();
    });
  });

  describe('registrarLogDownload', () => {
    it('deve registrar log com status started', async () => {
      const service = await criarServico();
      await service.registrarLogDownload('Empresas0.zip', 'started');
      expect(mockPrisma.importLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'download',
            arquivo: 'Empresas0.zip',
            status: 'started',
            finalizadoEm: null,
          }),
        }),
      );
    });

    it('deve registrar log com status completed e finalizadoEm preenchido', async () => {
      const service = await criarServico();
      await service.registrarLogDownload('Empresas0.zip', 'completed');
      expect(mockPrisma.importLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
            finalizadoEm: expect.any(Date),
          }),
        }),
      );
    });

    it('deve registrar log com status failed e mensagem de erro', async () => {
      const service = await criarServico();
      await service.registrarLogDownload('Empresas0.zip', 'failed', 'timeout');
      expect(mockPrisma.importLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            erro: 'timeout',
          }),
        }),
      );
    });
  });
});
