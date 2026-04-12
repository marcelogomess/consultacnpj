import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CnpjService } from './cnpj.service';
import { ConsultaCnpjDto } from './dto/consulta-cnpj.dto';

@Controller('cnpj')
@UseGuards(ThrottlerGuard)
export class CnpjController {
  constructor(private readonly cnpjService: CnpjService) {}

  @Get()
  listar(@Query() dto: ConsultaCnpjDto) {
    return this.cnpjService.listar(dto);
  }

  @Get(':cnpj')
  buscarPorCnpj(@Param('cnpj') cnpj: string) {
    return this.cnpjService.buscarPorCnpj(cnpj);
  }
}
