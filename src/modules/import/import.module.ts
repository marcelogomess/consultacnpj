import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { DownloaderService } from './downloader.service';
import { DominioRepository } from './repositories/dominio.repository';
import { EmpresaRepository } from './repositories/empresa.repository';
import { EstabelecimentoRepository } from './repositories/estabelecimento.repository';
import { SocioRepository } from './repositories/socio.repository';

@Module({
  providers: [
    ImportService,
    DownloaderService,
    DominioRepository,
    EmpresaRepository,
    EstabelecimentoRepository,
    SocioRepository,
  ],
  exports: [ImportService, DownloaderService],
})
export class ImportModule {}
