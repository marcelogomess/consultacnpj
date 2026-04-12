import { createReadStream } from 'fs';
import * as iconv from 'iconv-lite';
import { parse } from 'csv-parse';
import { Logger } from '@nestjs/common';

export abstract class BaseParser<T> {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Implementação específica: converter array de strings em objeto do domínio.
   * Retorna null para linhas que devem ser ignoradas.
   */
  abstract parseLine(fields: string[]): T | null;

  /**
   * Converte campo vazio ("" ou espaços) em null.
   */
  protected emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * Converte capital social no formato "100000,00" (vírgula decimal) para número.
   */
  protected parseCapitalSocial(value: string): number {
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Lê um arquivo CSV com encoding latin1, delimitador ponto-e-vírgula e aspas duplas,
   * gerando batches de registros parsed.
   */
  async *stream(filePath: string, batchSize: number = 5000): AsyncGenerator<T[]> {
    let batch: T[] = [];
    let lineCount = 0;
    let errorCount = 0;

    const fileStream = createReadStream(filePath);
    const decodedStream = fileStream.pipe(iconv.decodeStream('latin1'));

    const parser = decodedStream.pipe(
      parse({
        delimiter: ';',
        quote: '"',
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
        trim: true,
      }),
    );

    for await (const record of parser) {
      lineCount++;
      try {
        const parsed = this.parseLine(record as string[]);
        if (parsed !== null) {
          batch.push(parsed);
          if (batch.length >= batchSize) {
            yield batch;
            batch = [];
          }
        }
      } catch (err) {
        errorCount++;
        this.logger.warn(
          `Erro ao parsear linha ${lineCount}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (batch.length > 0) {
      yield batch;
    }

    this.logger.log(
      `Arquivo processado: ${lineCount} linhas, ${errorCount} erros`,
    );
  }
}
