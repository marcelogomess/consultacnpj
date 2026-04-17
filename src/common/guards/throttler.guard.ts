import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Extensão do ThrottlerGuard com suporte à variável RATE_LIMIT_MAX.
 * Quando RATE_LIMIT_MAX=0, o controle de requisições é completamente desativado.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(_context: ExecutionContext): Promise<boolean> {
    // Se todos os throttlers configurados têm limit === 0, desativa o controle
    const opts = this.options as Array<{ limit: number | string }>;
    return Promise.resolve(opts.every((o) => Number(o.limit) === 0));
  }
}
