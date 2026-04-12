import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ImportService } from '../src/modules/import/import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const importService = app.get(ImportService);

  try {
    console.log('Iniciando importação de dados da Receita Federal...');
    const resultados = await importService.importarTudo();

    let sucesso = 0;
    let falhas = 0;
    for (const r of resultados) {
      if (r.sucesso) {
        sucesso++;
        console.log(`✓ ${r.arquivo}: ${r.registros} registros`);
      } else {
        falhas++;
        console.error(`✗ ${r.arquivo}: ${r.erro}`);
      }
    }

    console.log(`\nImportação concluída: ${sucesso} sucessos, ${falhas} falhas`);
    await app.close();
    process.exit(falhas > 0 ? 1 : 0);
  } catch (err) {
    console.error('Importação falhou:', err);
    await app.close();
    process.exit(1);
  }
}

main();
