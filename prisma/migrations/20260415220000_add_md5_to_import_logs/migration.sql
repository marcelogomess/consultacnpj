-- AlterTable: adiciona coluna md5 para controle de deduplicação por checksum
ALTER TABLE "import_logs" ADD COLUMN "md5" CHAR(32);

-- CreateIndex: índice para buscas rápidas por hash
CREATE INDEX "import_logs_md5_idx" ON "import_logs"("md5");
