import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DownloaderService } from '../src/modules/import/downloader.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const downloader = app.get(DownloaderService);

  try {
    const arquivos = await downloader.listarArquivosDisponiveis();
    console.log(`Encontrados ${arquivos.length} arquivos para download`);

    for (const arquivo of arquivos) {
      await downloader.registrarLogDownload(arquivo.nome, 'started');
      try {
        const caminho = await downloader.baixarArquivo(arquivo);
        await downloader.descompactarArquivo(caminho);
        await downloader.registrarLogDownload(arquivo.nome, 'completed');
        console.log(`✓ ${arquivo.nome}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await downloader.registrarLogDownload(arquivo.nome, 'failed', msg);
        console.error(`✗ ${arquivo.nome}: ${msg}`);
      }
    }

    await app.close();
    process.exit(0);
  } catch (err) {
    console.error('Download falhou:', err);
    await app.close();
    process.exit(1);
  }
}

main();
