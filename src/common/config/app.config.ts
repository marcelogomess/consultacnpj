import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  logFormat: process.env.LOG_FORMAT ?? 'json',
  receitaBaseUrl: process.env.RECEITA_BASE_URL ?? 'https://dados.rfb.gov.br/CNPJ/',
  downloadDir: process.env.DOWNLOAD_DIR ?? '/data/downloads',
  importBatchSize: parseInt(process.env.IMPORT_BATCH_SIZE ?? '5000', 10),
}));
