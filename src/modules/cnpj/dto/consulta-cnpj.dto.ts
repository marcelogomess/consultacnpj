import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsultaCnpjDto {
  @IsOptional()
  @IsString()
  situacao_cadastral?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  natureza_juridica?: string;

  @IsOptional()
  @IsIn(['00', '01', '03', '05'])
  porte?: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
