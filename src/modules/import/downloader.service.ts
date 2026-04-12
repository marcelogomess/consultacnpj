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
  private readonly downloadDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl =
      this.config.get<string>('app.receitaBaseUrl') ?? 'https://dados.rfb.gov.br/CNPJ/';
    this.downloadDir = this.config.get<string>('app.downloadDir') ?? '/data/downloads';
  }

  async listarArquivosDisponiveis(): Promise<ArquivoDisponivel[]> {
    this.logger.log(`Listando arquivos em ${this.baseUrl}`);
    const response = await axios.get<string>(this.baseUrl, {
      timeout: 30000,
      headers: { 'User-Agent': 'cnpj-api/1.0' },
    });

    const html = response.data;
    const arquivos: ArquivoDisponivel[] = [];

    // Extrai links .zip da página HTML
    const regex = /href="([^"]*\.zip)"/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const nome = path.basename(match[1]);
      const url = match[1].startsWith('http') ? match[1] : `${this.baseUrl}${match[1]}`;
      arquivos.push({ nome, url });
    }

    this.logger.log(`Encontrados ${arquivos.length} arquivos`);
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
      headers: { 'User-Agent': 'cnpj-api/1.0' },
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
