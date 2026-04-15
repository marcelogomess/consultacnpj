# cnpj-api

API REST para consulta de dados públicos de CNPJ disponibilizados pela **Receita Federal do Brasil**.

Consome mensalmente os arquivos abertos do [Portal de Dados Abertos da RFB](https://dados.rfb.gov.br/CNPJ/), importa para PostgreSQL via pipeline de streaming e expõe endpoints de consulta por CNPJ e filtros diversos.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Início Rápido](#início-rápido)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Endpoints da API](#endpoints-da-api)
- [Exemplo de Resposta](#exemplo-de-resposta)
- [Pipeline de Importação](#pipeline-de-importação)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Testes](#testes)
- [Docker](#docker)
- [Kubernetes](#kubernetes)
- [Postman](#postman)

---

## Visão Geral

O sistema tem três responsabilidades independentes, cada uma com seu próprio entrypoint:

```
┌─────────────────────────────────────────────────────┐
│                    cnpj-api                         │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  CronJob    │  │   CronJob    │  │  API REST │  │
│  │  Download   │→ │  Importação  │→ │  NestJS   │  │
│  │  (dia 15)   │  │  (dia 16)    │  │  :3000    │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                          │                          │
│                    ┌─────┴─────┐                    │
│                    │ PostgreSQL│                    │
│                    └───────────┘                    │
└─────────────────────────────────────────────────────┘
```

| Componente | Entrypoint | Descrição |
|------------|-----------|-----------|
| **API REST** | `node dist/src/main` | Serve os endpoints de consulta |
| **Job Download** | `node dist/scripts/run-download` | Baixa e descompacta os `.zip` da Receita |
| **Job Importação** | `node dist/scripts/run-import` | Parseia os CSVs e grava no banco |

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | 24 |
| Framework | NestJS | 10+ |
| Linguagem | TypeScript | 5+ (strict) |
| ORM | Prisma | 5+ |
| Banco | PostgreSQL | 16 |
| Validação | class-validator | 0.14+ |
| Testes | Jest + Supertest | 30+ |
| Container | Docker multi-stage | — |
| Orquestração | Kubernetes + Kustomize | — |

---

## Pré-requisitos

- **Node.js** 24 (v24.14.1)
- **Docker** e **Docker Compose** (para banco local)
- **npm** 11+

---

## Início Rápido

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com as configurações desejadas
```

### 3. Subir o banco de dados

```bash
docker compose -f docker/docker-compose.yml up postgres -d
```

### 4. Aplicar as migrations

```bash
npx prisma migrate dev --name init
```

### 5. Iniciar a API em modo desenvolvimento

```bash
npm run start:dev
```

A API estará disponível em `http://localhost:3000`.

Verifique: `curl http://localhost:3000/api/health/live`

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string do PostgreSQL | — |
| `PORT` | Porta HTTP da API | `3000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` | `info` |
| `LOG_FORMAT` | `json` (produção) / `text` (desenvolvimento) | `json` |
| `RECEITA_BASE_URL` | URL base dos arquivos da Receita Federal | `https://dados.rfb.gov.br/CNPJ/` |
| `DOWNLOAD_DIR` | Diretório para salvar `.zip` e CSVs extraídos | `/data/downloads` |
| `IMPORT_BATCH_SIZE` | Registros por transação no banco | `5000` |

Consulte `.env.example` para o template completo.

---

## Endpoints da API

Todos os endpoints estão sob o prefixo `/api`. Rate limiting: **100 req/min por IP**.

### Health

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health/live` | Liveness probe — retorna `200` sempre |
| `GET` | `/api/health/ready` | Readiness probe — retorna `503` se o banco estiver indisponível |

### CNPJ

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/cnpj/:cnpj` | Dados completos do CNPJ (empresa + estabelecimentos + sócios + Simples) |
| `GET` | `/api/cnpj` | Listagem paginada com filtros |

**Parâmetros de busca (`GET /api/cnpj`):**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `situacao_cadastral` | string | `01` Nula · `02` Ativa · `03` Suspensa · `04` Inapta · `08` Baixada |
| `uf` | string | Sigla do estado (ex: `MG`, `SP`) |
| `municipio` | string | Código do município (4 dígitos) |
| `cnae` | string | CNAE principal (7 dígitos) |
| `natureza_juridica` | string | Código de natureza jurídica (4 dígitos) |
| `porte` | string | `00` Não informado · `01` ME · `03` EPP · `05` Demais |
| `razao_social` | string | Busca textual parcial (case-insensitive) |
| `page` | number | Página (default: `1`) |
| `limit` | number | Itens por página (default: `20`, máximo: `100`) |

### Domínio

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/dominio/paises` | Lista todos os países |
| `GET` | `/api/dominio/municipios` | Lista municípios (`?uf=MG` filtra por estado) |
| `GET` | `/api/dominio/cnaes` | Lista CNAEs (`?q=software` busca na descrição) |
| `GET` | `/api/dominio/naturezas-juridicas` | Lista naturezas jurídicas |
| `GET` | `/api/dominio/qualificacoes` | Lista qualificações de sócios |
| `GET` | `/api/dominio/motivos-situacao` | Lista motivos de situação cadastral |

---

## Exemplo de Resposta

### `GET /api/cnpj/00394460000141`

```json
{
  "cnpj": "00.394.460/0001-41",
  "cnpjBasico": "00394460",
  "razaoSocial": "SERVICO FEDERAL DE PROCESSAMENTO DE DADOS",
  "naturezaJuridica": {
    "codigo": "1104",
    "descricao": "EMPRESA PUBLICA"
  },
  "capitalSocial": 0,
  "porteEmpresa": {
    "codigo": "05",
    "descricao": "DEMAIS"
  },
  "enteFederativoResponsavel": "UNIAO",
  "simplesNacional": null,
  "estabelecimentos": [
    {
      "cnpj": "00.394.460/0001-41",
      "tipo": { "codigo": "1", "descricao": "MATRIZ" },
      "nomeFantasia": "SERPRO",
      "situacaoCadastral": { "codigo": "02", "descricao": "ATIVA" },
      "cnaePrincipal": {
        "codigo": "6311900",
        "descricao": "TRATAMENTO DE DADOS, PROVEDORES DE SERVIÇOS DE APLICAÇÃO..."
      },
      "endereco": {
        "tipoLogradouro": "SHN",
        "logradouro": "QUADRA 02",
        "cep": "70702070",
        "uf": "DF",
        "municipio": { "codigo": "9701", "descricao": "BRASILIA" }
      },
      "telefones": [{ "ddd": "61", "numero": "34487000" }]
    }
  ],
  "socios": []
}
```

### `GET /api/cnpj?uf=MG&situacao_cadastral=02&page=1&limit=5`

```json
{
  "data": [ ... ],
  "meta": {
    "total": 1482300,
    "page": 1,
    "limit": 5,
    "pages": 296460
  }
}
```

**Códigos de erro:**

| Status | Código | Quando ocorre |
|--------|--------|---------------|
| `400` | `CNPJ_INVALIDO` | CNPJ com dígito verificador inválido ou formato incorreto |
| `404` | `CNPJ_NAO_ENCONTRADO` | CNPJ válido porém não cadastrado no banco |
| `429` | — | Rate limit excedido (100 req/min) |

---

## Pipeline de Importação

Os arquivos da Receita Federal são disponibilizados mensalmente em formato `.zip` contendo CSVs com as seguintes características:

- **Delimitador:** `;` (ponto e vírgula)
- **Encoding:** `latin1` (ISO-8859-1)
- **Cabeçalho:** ausente — posição da coluna define o campo
- **Campos vazios:** `""` → `null` no banco
- **Tamanho:** múltiplos GB por arquivo (processados via streaming)

### Ordem de importação (respeita FKs)

```
1. Tabelas de domínio
   ├── Países       (PAISCSV)
   ├── Municípios   (MUNICCSV)
   ├── Qualificações (QUALSCSV)
   ├── Naturezas Jurídicas (NATJUCSV)
   ├── CNAEs        (CNAECSV)
   └── Motivos      (MOTICSV)

2. Empresas          (EMPRECSV*)
3. Estabelecimentos  (ESTABELE*)
4. Sócios            (SOCIOCSV*)
5. Simples Nacional  (SIMPLES*)
```

### Executar manualmente

```bash
# 1. Baixar e descompactar arquivos da Receita Federal
node dist/scripts/run-download.js

# 2. Importar dados para o banco
node dist/scripts/run-import.js
```

Ambos os scripts registram progresso na tabela `import_logs` e retornam exit code `0` (sucesso) ou `1` (falha parcial ou total).

---

## Estrutura do Projeto

```
cnpj-api/
├── src/
│   ├── main.ts                        # Bootstrap + graceful shutdown (SIGTERM 30s)
│   ├── app.module.ts
│   │
│   ├── common/
│   │   ├── config/                    # Configuração tipada via @nestjs/config
│   │   ├── errors/                    # AppError + ErrorCode enum
│   │   ├── filters/                   # HttpExceptionFilter (global)
│   │   ├── interceptors/              # LoggingInterceptor (duração de req)
│   │   └── utils/cnpj.util.ts         # Validar, formatar, extrair partes do CNPJ
│   │
│   ├── domain/                        # Interfaces TypeScript + enums com descrição
│   │   └── enums/                     # situacao-cadastral, porte, faixa-etaria…
│   │
│   ├── modules/
│   │   ├── cnpj/                      # GET /cnpj/:cnpj e GET /cnpj (listagem)
│   │   ├── dominio/                   # GET /dominio/* (tabelas de lookup)
│   │   ├── health/                    # GET /health/live e /health/ready
│   │   └── import/
│   │       ├── parsers/               # BaseParser (stream CSV) + 1 parser por entidade
│   │       ├── repositories/          # Upsert em batch via Prisma
│   │       ├── downloader.service.ts  # Download + descompactação
│   │       └── import.service.ts      # Orquestra toda a importação
│   │
│   └── prisma/                        # PrismaModule + PrismaService (global)
│
├── prisma/
│   └── schema.prisma                  # Schema completo do banco
│
├── scripts/
│   ├── run-download.ts                # Entrypoint do CronJob de download
│   ├── run-import.ts                  # Entrypoint do CronJob de importação
│   └── start-api.ts                   # Entrypoint alternativo da API
│
├── test/
│   ├── unit/                          # Testes sem banco (< 10s)
│   ├── integration/                   # Testes com banco PostgreSQL real
│   └── fixtures/                      # CSVs de amostra (3-6 linhas por tipo)
│
├── postman/
│   ├── cnpj-api.postman_collection.json
│   └── cnpj-api.postman_environment.json
│
├── docker/
│   ├── Dockerfile                     # Multi-stage: builder + runtime Alpine
│   └── docker-compose.yml             # postgres (5432) + postgres-test (5433)
│
└── k8s/
    ├── base/                          # Deployment, Service, HPA, CronJobs, PVC
    └── overlays/
        ├── dev/                       # 1 réplica, log debug
        └── prod/                      # Configuração de produção
```

---

## Banco de Dados

### Tabelas de domínio (lookup tables)

| Tabela | Chave | Descrição |
|--------|-------|-----------|
| `paises` | `CHAR(3)` | Países (ex: `105` = Brasil) |
| `municipios` | `CHAR(4)` | Municípios (ex: `7107` = Belo Horizonte) |
| `qualificacoes_socios` | `CHAR(2)` | Qualificações (ex: `49` = Sócio-administrador) |
| `naturezas_juridicas` | `CHAR(4)` | Naturezas jurídicas (ex: `2062` = Ltda) |
| `cnaes` | `CHAR(7)` | CNAEs (ex: `6201501` = Dev. de software) |
| `motivos_situacao_cadastral` | `CHAR(2)` | Motivos de situação cadastral |

### Tabelas principais

| Tabela | PK | Descrição |
|--------|-----|-----------|
| `empresas` | `cnpj_basico CHAR(8)` | Dados da pessoa jurídica |
| `estabelecimentos` | autoincrement + unique(cnpj completo) | Endereço, CNAE, situação |
| `socios` | autoincrement | Sócios e representantes |
| `simples_nacional` | `cnpj_basico CHAR(8)` | Opção pelo Simples/MEI |
| `import_logs` | autoincrement | Histórico de importações |

Para o schema completo, consulte [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Testes

### Unitários

Rodam sem banco de dados. Todas as dependências externas são mockadas. Devem completar em menos de 10 segundos.

```bash
# Executar uma vez
npm test

# Modo watch (TDD)
npm run test:watch

# Com relatório de cobertura (mínimo 80% de linhas)
npm run test:cov
```

### Integração (e2e)

Requerem banco PostgreSQL real. Use o serviço `postgres-test` do docker-compose.

```bash
# 1. Subir banco de teste
docker compose -f docker/docker-compose.yml up postgres-test -d

# 2. Aplicar migrations no banco de teste
DATABASE_URL="postgresql://cnpj_user:cnpj_pass@localhost:5433/cnpj_test?schema=public" \
  npx prisma migrate deploy

# 3. Executar testes e2e
npm run test:e2e
```

### Suítes de teste

| Arquivo | O que testa |
|---------|------------|
| `test/unit/common/cnpj.util.spec.ts` | Validação, formatação e parse de CNPJ |
| `test/unit/domain/enums.spec.ts` | Mapeamento código → descrição dos enums |
| `test/unit/modules/cnpj/cnpj.service.spec.ts` | Lógica de negócio da consulta |
| `test/unit/modules/cnpj/cnpj.controller.spec.ts` | Delegação controller → service |
| `test/unit/modules/import/empresa.parser.spec.ts` | Parser do arquivo EMPRECSV |
| `test/unit/modules/import/estabelecimento.parser.spec.ts` | Parser do arquivo ESTABELE |
| `test/unit/modules/import/socio.parser.spec.ts` | Parser do arquivo SOCIOCSV |
| `test/unit/modules/import/dominio.parser.spec.ts` | Parsers das tabelas de domínio |
| `test/unit/modules/import/import.service.spec.ts` | Orquestração da importação |
| `test/integration/modules/cnpj/cnpj.e2e.spec.ts` | Endpoints HTTP end-to-end |

---

## Docker

### Build da imagem

```bash
docker build -f docker/Dockerfile -t cnpj-api:latest .
```

A imagem usa **multi-stage build** com Node.js 24 Alpine:
- **Stage builder**: compila TypeScript, gera Prisma client
- **Stage runtime**: apenas dependências de produção, usuário não-root

### Docker Compose (desenvolvimento local)

```bash
# Subir banco de dados
docker compose -f docker/docker-compose.yml up postgres -d

# Subir API completa (com build da imagem)
docker compose -f docker/docker-compose.yml up api -d

# Ver logs
docker compose -f docker/docker-compose.yml logs -f api

# Parar tudo
docker compose -f docker/docker-compose.yml down
```

### Executar jobs manualmente via Docker

```bash
# Job de download
docker run --rm \
  --env-file .env \
  -v cnpj_downloads:/data/downloads \
  cnpj-api:latest \
  node dist/scripts/run-download.js

# Job de importação
docker run --rm \
  --env-file .env \
  -v cnpj_downloads:/data/downloads \
  cnpj-api:latest \
  node dist/scripts/run-import.js
```

---

## Kubernetes

O diretório `k8s/` usa **Kustomize** com base + overlays por ambiente.

### Recursos provisionados

| Recurso | Nome | Descrição |
|---------|------|-----------|
| `Namespace` | `cnpj` | Namespace dedicado |
| `Deployment` | `cnpj-api` | API REST — 2 a 10 réplicas |
| `HorizontalPodAutoscaler` | `cnpj-api-hpa` | Escala por CPU (target 70%) |
| `Service` | `cnpj-api` | ClusterIP na porta 80 |
| `CronJob` | `cnpj-download` | Download — dia 15 de cada mês às 02:00 |
| `CronJob` | `cnpj-import` | Importação — dia 16 de cada mês às 02:00 |
| `PersistentVolumeClaim` | `cnpj-downloads-pvc` | Volume compartilhado de 50Gi (ReadWriteMany) |
| `ConfigMap` | `cnpj-api-config` | Variáveis não sensíveis |
| `Secret` | `cnpj-api-secret` | `DATABASE_URL` e outros dados sensíveis |

### Deploy

```bash
# Ambiente de desenvolvimento (1 réplica, log debug)
kubectl apply -k k8s/overlays/dev/

# Produção
kubectl apply -k k8s/overlays/prod/

# Verificar status
kubectl get all -n cnpj

# Logs da API
kubectl logs -n cnpj -l app=cnpj-api -f

# Executar job de importação manualmente
kubectl create job --from=cronjob/cnpj-import cnpj-import-manual -n cnpj
```

### Health checks

| Probe | Rota | Configuração |
|-------|------|-------------|
| Liveness | `/api/health/live` | `initialDelaySeconds: 10`, `periodSeconds: 30` |
| Readiness | `/api/health/ready` | `initialDelaySeconds: 5`, `periodSeconds: 15` |

### Resource limits

| Componente | Memory Request | Memory Limit | CPU Request | CPU Limit |
|-----------|---------------|-------------|------------|----------|
| API | 256Mi | 512Mi | 100m | 500m |
| Job Download | 256Mi | 512Mi | 100m | 500m |
| Job Importação | 1Gi | 2Gi | 500m | 1000m |

> **Importante:** Antes de aplicar em produção, substitua `DATABASE_URL` no `k8s/base/secret.yaml` pelo valor real ou utilize uma solução de gestão de secrets (Vault, Sealed Secrets, External Secrets Operator).

---

## Postman

A pasta `postman/` contém dois arquivos prontos para importar:

| Arquivo | Descrição |
|---------|-----------|
| `cnpj-api.postman_collection.json` | Collection com todos os endpoints organizados em pastas |
| `cnpj-api.postman_environment.json` | Environment com variáveis configuráveis |

### Como usar

1. Abra o Postman → **Import** → selecione os dois arquivos
2. Selecione o environment **"cnpj-api — Local"** no canto superior direito
3. Ajuste a variável `baseUrl` se necessário (padrão: `http://localhost:3000`)
4. Para testar com um CNPJ real, atualize `cnpj_rfb` com um CNPJ válido que esteja no banco

### Pastas da collection

| Pasta | Requisições |
|-------|------------|
| **Health** | Liveness, Readiness |
| **CNPJ** | Busca por CNPJ, listagem com filtros (UF, situação, razão social, CNAE) |
| **Domínio** | Países, Municípios, CNAEs (com busca), Naturezas Jurídicas, Qualificações, Motivos |
| **Cenários de Erro** | 400 CNPJ inválido, 404 não encontrado, 400 query param fora do domínio |

Cada requisição inclui **testes automáticos** (JavaScript) que validam status HTTP e estrutura do JSON. Use o **Collection Runner** para executar todas de uma vez.

---

## Licença

Dados de CNPJ são públicos e disponibilizados pela Receita Federal do Brasil sob licença [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/br/).
