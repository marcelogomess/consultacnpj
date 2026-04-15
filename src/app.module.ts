import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CnpjModule } from './modules/cnpj/cnpj.module';
import { DominioModule } from './modules/dominio/dominio.module';
import { HealthModule } from './modules/health/health.module';
import { ImportModule } from './modules/import/import.module';
import appConfig from './common/config/app.config';
import databaseConfig from './common/config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    CnpjModule,
    DominioModule,
    ImportModule,
  ],
})
export class AppModule {}
