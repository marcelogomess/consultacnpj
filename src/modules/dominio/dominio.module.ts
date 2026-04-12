import { Module } from '@nestjs/common';
import { DominioController } from './dominio.controller';
import { DominioService } from './dominio.service';

@Module({
  controllers: [DominioController],
  providers: [DominioService],
})
export class DominioModule {}
