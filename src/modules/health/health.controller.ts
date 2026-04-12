import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  async readiness() {
    const isDbHealthy = await this.prisma.isHealthy();
    if (!isDbHealthy) {
      throw new Error('Database unavailable');
    }
    return { status: 'ok', database: 'connected' };
  }
}
