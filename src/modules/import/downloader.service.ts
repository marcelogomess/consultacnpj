import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

export interface ArquivoDisponivel {
  nome: string;
  url: string;
}

@Injectable()
export class DownloaderService {
  private readonly logger = new Logger(DownloaderService.name);
  private readonly baseUrl: string;
  private readonly shareToken: string;
  private readonly downloadDir: string;
  readonly periodo: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl =
      this.config.get<string>('app.receitaBaseUrl') ??
      'https://arquivos.receitafederal.gov.br';
    this.shareToken = this.config.get<string>('app.receitaShareToken') ?? '';
    this.downloadDir = this.config.get<string>('app.downloadDir') ?? '/data/downloads';
    this.periodo =
      this.config.get<string>('app.receitaPeriodo') || this.periodoAtual();
  }

  periodoAtual(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private authHeader(): Record<string, string> {
    if (!this.shareToken) return {};
    const basic = Buffer.from(`${this.shareToken}:`).toString('base64');
    return { Authorization: `Basic ${basic}` };
  }

  async listarArquivosDisponiveis(): Promise<ArquivoDisponivel[]> {
    const webdavUrl = `${this.baseUrl}/public.php/webdav/${this.periodo}/`;
    this.logger.log(`Listando arquivos WebDAV: ${webdavUrl} (período: ${this.periodo})`);

    const response = await axios.request<string>({
      method: 'PROPFIND',
      url: webdavUrl,
      headers: {
        ...this.authHeader(),
        Depth: '1',
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'cnpj-api/1.0',
      },
      data: `<?xml version="1.0" encoding="utf-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop><d:displayname/><d:resourcetype/></d:prop>
        </d:propfind>`,
      timeout: 30000,
    });

    const xml = response.data as string;

    // Extrai <d:href> (qualquer prefixo de namespace) filtrando apenas .zip
    const hrefs = [...xml.matchAll(/<[a-zA-Z]+:href[^>]*>([^<]+)<\/[a-zA-Z]+:href>/gi)]
      .map(m => m[1].trim())
      .filter(href => href.toLowerCase().endsWith('.zip'));

    const arquivos: ArquivoDisponivel[] = hrefs.map(href => {
      const nome = path.basename(decodeURIComponent(href));
      const url = `${this.baseUrl}/public.php/webdav/${this.periodo}/${encodeURIComponent(nome)}`;
      return { nome, url };
    });

    this.logger.log(`Encontrados ${arquivos.length} arquivos para ${this.periodo}`);
    return arquivos;
  }

  async baixarArquivo(arquivo: ArquivoDisponivel): Promise<string> {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }

    const destPath = path.join(this.downloadDir, arquivo.nome);
    this.logger.log(`Baixando ${arquivo.url} -> ${destPath}`);

    const response = await axios.get(arquivo.url, {
      responseType: 'stream',
      timeout: 300000,
      headers: {
        'User-Agent': 'cnpj-api/1.0',
        ...this.authHeader(),
      },
    });

    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      (response.data as NodeJS.ReadableStream).pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    this.logger.log(`Download concluído: ${destPath}`);
    return destPath;
  }

  async descompactarArquivo(zipPath: string): Promise<string[]> {
    const outputDir = path.dirname(zipPath);
    const arquivosExtraidos: string[] = [];

    this.logger.log(`Descompactando ${zipPath}`);

    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', (entry: unzipper.Entry) => {
        const filePath = path.join(outputDir, entry.path);
        arquivosExtraidos.push(filePath);
        entry.pipe(fs.createWriteStream(filePath));
      })
      .promise();

    this.logger.log(`Extraídos ${arquivosExtraidos.length} arquivos`);
    return arquivosExtraidos;
  }

  async registrarLogDownload(
    arquivo: string,
    status: 'started' | 'completed' | 'failed',
    erro?: string,
  ): Promise<void> {
    await this.prisma.importLog.create({
      data: {
        tipo: 'download',
        arquivo,
        status,
        iniciadoEm: new Date(),
        finalizadoEm: status !== 'started' ? new Date() : null,
        erro: erro ?? null,
      },
    });
  }
}
