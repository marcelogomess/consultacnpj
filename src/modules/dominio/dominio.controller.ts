import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { DominioService } from './dominio.service';

class MunicipioQueryDto {
  @IsOptional()
  @IsString()
  uf?: string;
}

class CnaeQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

@Controller('dominio')
@UseGuards(ThrottlerGuard)
export class DominioController {
  constructor(private readonly dominioService: DominioService) {}

  @Get('paises')
  listarPaises() {
    return this.dominioService.listarPaises();
  }

  @Get('municipios')
  listarMunicipios(@Query() query: MunicipioQueryDto) {
    return this.dominioService.listarMunicipios(query.uf);
  }

  @Get('cnaes')
  listarCnaes(@Query() query: CnaeQueryDto) {
    return this.dominioService.listarCnaes(query.q);
  }

  @Get('naturezas-juridicas')
  listarNaturezasJuridicas() {
    return this.dominioService.listarNaturezasJuridicas();
  }

  @Get('qualificacoes')
  listarQualificacoes() {
    return this.dominioService.listarQualificacoes();
  }

  @Get('motivos-situacao')
  listarMotivosSituacao() {
    return this.dominioService.listarMotivosSituacao();
  }
}
