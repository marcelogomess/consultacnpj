-- CreateTable
CREATE TABLE "paises" (
    "codigo" CHAR(3) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "paises_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "municipios" (
    "codigo" CHAR(4) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "qualificacoes_socios" (
    "codigo" CHAR(2) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "qualificacoes_socios_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "naturezas_juridicas" (
    "codigo" CHAR(4) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "naturezas_juridicas_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "cnaes" (
    "codigo" CHAR(7) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "cnaes_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "motivos_situacao_cadastral" (
    "codigo" CHAR(2) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,

    CONSTRAINT "motivos_situacao_cadastral_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "empresas" (
    "cnpj_basico" CHAR(8) NOT NULL,
    "razao_social" VARCHAR(255) NOT NULL,
    "natureza_juridica" CHAR(4) NOT NULL,
    "qualificacao_responsavel" CHAR(2) NOT NULL,
    "capital_social" DECIMAL(14,2) NOT NULL,
    "porte_empresa" CHAR(2) NOT NULL,
    "ente_federativo_responsavel" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("cnpj_basico")
);

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "id" SERIAL NOT NULL,
    "cnpj_basico" CHAR(8) NOT NULL,
    "cnpj_ordem" CHAR(4) NOT NULL,
    "cnpj_dv" CHAR(2) NOT NULL,
    "identificador_matriz_filial" CHAR(1) NOT NULL,
    "nome_fantasia" VARCHAR(255),
    "situacao_cadastral" CHAR(2) NOT NULL,
    "data_situacao_cadastral" CHAR(8),
    "motivo_situacao_cadastral" CHAR(2),
    "nome_cidade_exterior" VARCHAR(255),
    "pais" CHAR(3),
    "data_inicio_atividade" CHAR(8),
    "cnae_fiscal_principal" CHAR(7),
    "cnae_fiscal_secundaria" TEXT,
    "tipo_logradouro" VARCHAR(50),
    "logradouro" VARCHAR(255),
    "numero" VARCHAR(10),
    "complemento" VARCHAR(255),
    "bairro" VARCHAR(100),
    "cep" CHAR(8),
    "uf" CHAR(2),
    "municipio" CHAR(4),
    "ddd1" CHAR(4),
    "telefone1" VARCHAR(8),
    "ddd2" CHAR(4),
    "telefone2" VARCHAR(8),
    "ddd_fax" CHAR(4),
    "fax" VARCHAR(8),
    "correio_eletronico" VARCHAR(255),
    "situacao_especial" VARCHAR(255),
    "data_situacao_especial" CHAR(8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socios" (
    "id" SERIAL NOT NULL,
    "cnpj_basico" CHAR(8) NOT NULL,
    "identificador_socio" CHAR(1) NOT NULL,
    "nome_socio" VARCHAR(255) NOT NULL,
    "cpf_cnpj_socio" VARCHAR(14),
    "qualificacao_socio" CHAR(2) NOT NULL,
    "data_entrada_sociedade" CHAR(8),
    "pais" CHAR(3),
    "representante_legal" VARCHAR(11),
    "nome_representante" VARCHAR(255),
    "qualificacao_representante" CHAR(2),
    "faixa_etaria" CHAR(1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simples_nacional" (
    "cnpj_basico" CHAR(8) NOT NULL,
    "opcao_simples" CHAR(1),
    "data_opcao_simples" CHAR(8),
    "data_exclusao_simples" CHAR(8),
    "opcao_mei" CHAR(1),
    "data_opcao_mei" CHAR(8),
    "data_exclusao_mei" CHAR(8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simples_nacional_pkey" PRIMARY KEY ("cnpj_basico")
);

-- CreateTable: coluna md5 incluída desde a criação para controle de deduplicação
CREATE TABLE "import_logs" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "arquivo" VARCHAR(255) NOT NULL,
    "md5" CHAR(32),
    "status" VARCHAR(20) NOT NULL,
    "registros" INTEGER,
    "erro" TEXT,
    "iniciado_em" TIMESTAMP(3) NOT NULL,
    "finalizado_em" TIMESTAMP(3),

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estabelecimentos_situacao_cadastral_idx" ON "estabelecimentos"("situacao_cadastral");

-- CreateIndex
CREATE INDEX "estabelecimentos_cnae_fiscal_principal_idx" ON "estabelecimentos"("cnae_fiscal_principal");

-- CreateIndex
CREATE INDEX "estabelecimentos_uf_idx" ON "estabelecimentos"("uf");

-- CreateIndex
CREATE INDEX "estabelecimentos_municipio_idx" ON "estabelecimentos"("municipio");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_cnpj_basico_cnpj_ordem_cnpj_dv_key" ON "estabelecimentos"("cnpj_basico", "cnpj_ordem", "cnpj_dv");

-- CreateIndex
CREATE INDEX "socios_cnpj_basico_idx" ON "socios"("cnpj_basico");

-- CreateIndex
CREATE INDEX "socios_cpf_cnpj_socio_idx" ON "socios"("cpf_cnpj_socio");

-- CreateIndex
CREATE INDEX "import_logs_tipo_status_idx" ON "import_logs"("tipo", "status");

-- CreateIndex
CREATE INDEX "import_logs_md5_idx" ON "import_logs"("md5");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_natureza_juridica_fkey" FOREIGN KEY ("natureza_juridica") REFERENCES "naturezas_juridicas"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_pais_fkey" FOREIGN KEY ("pais") REFERENCES "paises"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_municipio_fkey" FOREIGN KEY ("municipio") REFERENCES "municipios"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: socios_pais_fkey omitida intencionalmente — CSVs da Receita Federal
-- usam códigos de país em SOCIOCSV que não constam em PAISCSV. O código é gravado
-- como está no CSV e a descrição é resolvida via JOIN em tempo de consulta.
ALTER TABLE "socios" ADD CONSTRAINT "socios_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simples_nacional" ADD CONSTRAINT "simples_nacional_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;
