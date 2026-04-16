import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Calcula o hash MD5 de um arquivo usando stream.
 * Adequado para arquivos grandes (multi-GB) sem consumir memória excessiva.
 */
export function calcularMd5Arquivo(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
