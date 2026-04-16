-- Remove FK constraint socios → paises.
-- Motivo: os CSVs da Receita Federal (SOCIOCSV) contêm códigos de país que não
-- estão presentes no arquivo de referência (PAISCSV). A FK obrigava a API a
-- gravar NULL no campo, perdendo a informação de país do sócio. Sem a FK, o
-- código é armazenado como veio do CSV e a descrição é buscada em tempo de
-- consulta via JOIN; se o código não existir na tabela paises, a API retorna
-- o código sem descrição em vez de retornar null.
ALTER TABLE "socios" DROP CONSTRAINT IF EXISTS "socios_pais_fkey";
