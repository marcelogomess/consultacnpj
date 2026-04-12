/**
 * Global setup para testes de integração (e2e).
 *
 * Pré-requisito: banco PostgreSQL de teste já rodando.
 * O docker-compose.yml define o serviço `postgres-test` na porta 5433.
 *
 * Para subir o banco de teste:
 *   docker compose -f docker/docker-compose.yml up postgres-test -d
 *
 * As migrations são aplicadas via:
 *   DATABASE_URL=... npx prisma migrate deploy
 */
export default async function globalSetup() {
  console.log('[e2e] Iniciando configuração do banco de teste...');
  // Banco já deve estar disponível via docker-compose
  // Prisma usará DATABASE_URL do .env.test automaticamente
}
