# cnpj-api — Guia para Claude Code

## O que é este projeto

API REST em NestJS 10 que consome os dados públicos de CNPJ da Receita Federal do Brasil. Três responsabilidades:

1. **Job de Download** (`scripts/run-download.ts`) — baixa os .zip mensais do site da Receita
2. **Job de Importação** (`scripts/run-import.ts`) — descompacta, parseia CSVs e grava no PostgreSQL
3. **API REST** (`src/modules/cnpj/`) — expõe consulta por CNPJ e filtros paginados

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 24 |
| Framework | NestJS 10 + Express |
| Linguagem | TypeScript strict |
| ORM | Prisma 5 |
| Banco | PostgreSQL 16 |
| Validação | class-validator + class-transformer |
| Testes | Jest + Supertest |
| Container | Docker multi-stage |
| Orquestração | Kubernetes (Kustomize) |

## Metodologia: TDD

**Regra inviolável**: vermelho → verde → refatorar.

- Escreva o teste primeiro, confirme que falha, depois implemente o mínimo para passar
- Testes unitários rodam sem banco (tudo mockado) e devem completar em < 10s
- Testes e2e usam banco PostgreSQL real via `docker-compose.yml`
- Nomeie testes em português descrevendo comportamento: `deve retornar 404 quando CNPJ não existe`

## Comandos essenciais

```bash
# Ambiente de desenvolvimento
docker compose -f docker/docker-compose.yml up postgres -d
npx prisma migrate dev

# Testes unitários (rápidos, sem banco)
npm test                    # jest unitário
npm run test:watch          # modo watch
npm run test:cov            # com cobertura (mínimo 80%)

# Testes e2e (requer banco postgres-test na porta 5433)
docker compose -f docker/docker-compose.yml up postgres-test -d
DATABASE_URL="postgresql://cnpj_user:cnpj_pass@localhost:5433/cnpj_test?schema=public" npx prisma migrate deploy
npm run test:e2e

# Dev com hot-reload
npm run start:dev

# Build e imagem Docker
npm run build
docker build -f docker/Dockerfile -t cnpj-api .

# Kubernetes (dev)
kubectl apply -k k8s/overlays/dev/
```

## Estrutura de pastas

```
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── config/          # app.config.ts, database.config.ts
│   ├── errors/          # AppError + ErrorCode enum
│   ├── filters/         # HttpExceptionFilter (global)
│   ├── interceptors/    # LoggingInterceptor
│   └── utils/           # cnpj.util.ts (validar, formatar, extrair partes)
├── domain/              # Interfaces TypeScript + enums com descricao
│   └── enums/           # situacao-cadastral, porte-empresa, faixa-etaria, etc.
├── modules/
│   ├── cnpj/            # Controller + Service + DTOs da API pública
│   ├── health/          # /health/live e /health/ready (Kubernetes probes)
│   └── import/
│       ├── parsers/     # BaseParser (stream CSV latin1) + parsers por entidade
│       └── repositories/ # Upsert em batch via Prisma
└── prisma/              # PrismaModule + PrismaService (global)

test/
├── unit/                # Jest sem banco; imports diretos dos arquivos src/
├── integration/         # Jest com banco real; usa factories.ts para seed
└── fixtures/            # CSVs de amostra (latin1-safe, 3-6 linhas)
```

## Regras de parsing dos CSVs da Receita

- Delimitador: `;`
- Encoding: `latin1` → converter para UTF-8 com `iconv-lite`
- Sem cabeçalho — posição da coluna define o campo (ver dicionário em cada parser)
- Campo vazio (`""`) → `null` no banco
- Capital social: `"1.500.000,00"` → remover `.`, trocar `,` por `.`, parsear como float
- CPF do sócio vem **descaracterizado** (`***456789**`) — armazenar como string exata
- CNAE secundário: múltiplos códigos separados por `,` dentro do mesmo campo CSV → armazenar como TEXT
- Arquivos são multi-GB → usar streams, **nunca** carregar inteiro em memória
- Importar em batches de `IMPORT_BATCH_SIZE` (default 5000) com transações Prisma

## Ordem de importação (respeitar FKs)

1. Países → Municípios → Qualificações → Naturezas Jurídicas → CNAEs → Motivos
2. Empresas
3. Estabelecimentos
4. Sócios
5. Simples Nacional

## Variáveis de ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `DATABASE_URL` | URL completa do PostgreSQL | — |
| `PORT` | Porta HTTP da API | `3000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `RECEITA_BASE_URL` | URL base do servidor Nextcloud da Receita | `https://arquivos.receitafederal.gov.br` |
| `RECEITA_SHARE_TOKEN` | Token do compartilhamento público (Basic auth username) | `YggdBLfdninEJX9` |
| `RECEITA_PERIODO` | Período a baixar (`yyyy-MM`); vazio = mês corrente | `` |
| `DOWNLOAD_DIR` | Diretório para salvar .zip e CSVs | `/data/downloads` |
| `IMPORT_BATCH_SIZE` | Registros lidos do CSV por iteração (chunking SQL interno respeita limite do PostgreSQL) | `5000` |
| `RATE_LIMIT_TTL` | Janela de tempo do rate limiting em segundos | `60` |
| `RATE_LIMIT_MAX` | Máximo de requisições por IP na janela definida por `RATE_LIMIT_TTL`; `0` desativa o controle | `100` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` | `info` |
| `LOG_FORMAT` | `json` (prod) / `text` (dev) | `json` |

Ver `.env.example` para template completo.

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health/live` | Liveness probe (sempre 200) |
| GET | `/api/health/ready` | Readiness probe (verifica banco) |
| GET | `/api/cnpj/:cnpj` | Busca completa por CNPJ (exatamente 14 dígitos numéricos, sem pontuação) |
| GET | `/api/cnpj` | Lista paginada com filtros (`uf`, `situacao_cadastral`, `cnae`, `porte`, etc.) |
| GET | `/api/dominio/paises` | Lista todos os países |
| GET | `/api/dominio/municipios?uf=MG` | Lista municípios (filtro por UF) |
| GET | `/api/dominio/cnaes?q=software` | Lista CNAEs (busca textual) |
| GET | `/api/dominio/naturezas-juridicas` | Lista naturezas jurídicas |
| GET | `/api/dominio/qualificacoes` | Lista qualificações de sócios |
| GET | `/api/dominio/motivos-situacao` | Lista motivos de situação cadastral |

Rate limiting (aplicado a `/api/cnpj` e `/api/dominio`): configurável via `RATE_LIMIT_MAX` req / `RATE_LIMIT_TTL` s por IP (via `@nestjs/throttler`). Defina `RATE_LIMIT_MAX=0` para desativar.

Rate limiting: 100 req/min por IP (via `@nestjs/throttler`).

## Kubernetes

- **API**: Deployment com 2–10 réplicas (HPA por CPU 70%), liveness + readiness probes
- **Download**: CronJob dia 15/mês — baixa os .zip, descompacta, grava log
- **Import**: CronJob dia 16/mês — parseia CSVs e importa no banco (`concurrencyPolicy: Forbid`)
- **PVC**: compartilhado entre download e import (`/data/downloads`)
- Overlays: `k8s/overlays/dev/` (1 réplica, log debug) e `k8s/overlays/prod/`

## Schema do banco (resumo)

Tabelas de domínio: `paises`, `municipios`, `qualificacoes_socios`, `naturezas_juridicas`, `cnaes`, `motivos_situacao_cadastral`

Tabelas principais: `empresas` (PK: `cnpj_basico` CHAR(8)), `estabelecimentos` (PK: autoincrement + unique cnpj completo), `socios`, `simples_nacional`, `import_logs`

Ver `prisma/schema.prisma` para o schema completo.

## Convenções de código

- Respostas JSON em camelCase
- Códigos de erro em português maiúsculo: `CNPJ_INVALIDO`, `CNPJ_NAO_ENCONTRADO`
- Logs estruturados com `Logger` do NestJS; em produção saem em JSON
- Graceful shutdown em SIGTERM (30s de tolerância)
- Sem estado em memória entre requests — a API é stateless
