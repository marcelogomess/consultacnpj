import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  validarCnpj,
  limparCnpj,
  formatarCnpj,
  extrairPartesCnpj,
} from '../../common/utils/cnpj.util';
import { descricaoSituacaoCadastral } from '../../domain/enums/situacao-cadastral.enum';
import { descricaoPorteEmpresa } from '../../domain/enums/porte-empresa.enum';
import { descricaoIdentificadorSocio } from '../../domain/enums/identificador-socio.enum';
import { descricaoMatrizFilial } from '../../domain/enums/matriz-filial.enum';
import { descricaoFaixaEtaria } from '../../domain/enums/faixa-etaria.enum';
import { ConsultaCnpjDto } from './dto/consulta-cnpj.dto';
import {
  CnpjResponseDto,
  EstabelecimentoResponseDto,
  SocioResponseDto,
  CodigoDescricao,
  TelefoneDto,
} from './dto/cnpj-response.dto';
import { ListaCnpjResponseDto } from './dto/lista-cnpj-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CnpjService {
  private readonly logger = new Logger(CnpjService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buscarPorCnpj(cnpjRaw: string): Promise<CnpjResponseDto> {
    const cnpjLimpo = limparCnpj(cnpjRaw);

    if (!validarCnpj(cnpjLimpo)) {
      throw new BadRequestException({
        message: 'CNPJ inválido',
        error: 'CNPJ_INVALIDO',
      });
    }

    const { basico } = extrairPartesCnpj(cnpjLimpo);

    const empresa = await this.prisma.empresa.findUnique({
      where: { cnpjBasico: basico },
      include: {
        naturezaJuridica: true,
        estabelecimentos: {
          include: {
            pais: true,
            municipio: true,
          },
        },
        socios: {
          include: {
            pais: true,
          },
        },
        simplesNacional: true,
      },
    });

    if (!empresa) {
      throw new NotFoundException({
        message: `CNPJ ${formatarCnpj(cnpjLimpo)} não encontrado`,
        error: 'CNPJ_NAO_ENCONTRADO',
      });
    }

    // Buscar qualificações em batch
    const qualCodes = [
      empresa.qualificacaoResponsavel,
      ...empresa.socios.map((s) => s.qualificacaoSocioCodigo),
      ...empresa.socios
        .map((s) => s.qualificacaoRepresentante)
        .filter((q): q is string => q !== null),
    ];
    const uniqueQualCodes = [...new Set(qualCodes)];
    const qualificacoes = await this.prisma.qualificacaoSocio.findMany({
      where: { codigo: { in: uniqueQualCodes } },
    });
    const qualMap = new Map(qualificacoes.map((q) => [q.codigo, q.descricao]));

    // Buscar CNAEs secundários
    const cnaeSecundariosCodes = empresa.estabelecimentos
      .flatMap((e) =>
        e.cnaeFiscalSecundaria ? e.cnaeFiscalSecundaria.split(',').map((c) => c.trim()) : [],
      )
      .filter(Boolean);
    const uniqueCnaeCodes = [...new Set(cnaeSecundariosCodes)];
    const cnaes =
      uniqueCnaeCodes.length > 0
        ? await this.prisma.cnae.findMany({
            where: { codigo: { in: uniqueCnaeCodes } },
          })
        : [];
    const cnaeMap = new Map(cnaes.map((c) => [c.codigo, c.descricao]));

    // Buscar motivos de situação cadastral
    const motivoCodes = empresa.estabelecimentos
      .map((e) => e.motivoSituacaoCadastralCodigo)
      .filter((m): m is string => m !== null);
    const uniqueMotivoCodes = [...new Set(motivoCodes)];
    const motivos =
      uniqueMotivoCodes.length > 0
        ? await this.prisma.motivoSituacaoCadastral.findMany({
            where: { codigo: { in: uniqueMotivoCodes } },
          })
        : [];
    const motivoMap = new Map(motivos.map((m) => [m.codigo, m.descricao]));

    const estabelecimentosDto: EstabelecimentoResponseDto[] = empresa.estabelecimentos.map(
      (est) => {
        const telefones: TelefoneDto[] = [];
        if (est.ddd1 && est.telefone1) {
          telefones.push({ ddd: est.ddd1, numero: est.telefone1 });
        }
        if (est.ddd2 && est.telefone2) {
          telefones.push({ ddd: est.ddd2, numero: est.telefone2 });
        }

        const cnaeSecundarioList: CodigoDescricao[] = est.cnaeFiscalSecundaria
          ? est.cnaeFiscalSecundaria
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
              .map((code) => ({
                codigo: code,
                descricao: cnaeMap.get(code) ?? '',
              }))
          : [];

        return {
          cnpj: formatarCnpj(`${est.cnpjBasico}${est.cnpjOrdem}${est.cnpjDv}`),
          cnpjOrdem: est.cnpjOrdem,
          cnpjDv: est.cnpjDv,
          tipo: {
            codigo: est.identificadorMatrizFilial,
            descricao: descricaoMatrizFilial(est.identificadorMatrizFilial),
          },
          nomeFantasia: est.nomeFantasia,
          situacaoCadastral: {
            codigo: est.situacaoCadastral,
            descricao: descricaoSituacaoCadastral(est.situacaoCadastral),
          },
          dataSituacaoCadastral: est.dataSituacaoCadastral,
          motivoSituacaoCadastral: est.motivoSituacaoCadastralCodigo
            ? {
                codigo: est.motivoSituacaoCadastralCodigo,
                descricao: motivoMap.get(est.motivoSituacaoCadastralCodigo) ?? '',
              }
            : null,
          dataInicioAtividade: est.dataInicioAtividade,
          cnaePrincipal: est.cnaeFiscalPrincipal
            ? {
                codigo: est.cnaeFiscalPrincipal,
                descricao: cnaeMap.get(est.cnaeFiscalPrincipal) ?? '',
              }
            : null,
          cnaeSecundario: cnaeSecundarioList,
          endereco: {
            tipoLogradouro: est.tipoLogradouro,
            logradouro: est.logradouro,
            numero: est.numero,
            complemento: est.complemento,
            bairro: est.bairro,
            cep: est.cep,
            uf: est.uf,
            municipio: est.municipio
              ? { codigo: est.municipio.codigo, descricao: est.municipio.descricao }
              : null,
          },
          telefones,
          email: est.correioEletronico,
          situacaoEspecial: est.situacaoEspecial,
          dataSituacaoEspecial: est.dataSituacaoEspecial,
        };
      },
    );

    const sociosDto: SocioResponseDto[] = empresa.socios.map((socio) => ({
      identificador: {
        codigo: socio.identificadorSocio,
        descricao: descricaoIdentificadorSocio(socio.identificadorSocio),
      },
      nome: socio.nomeSocio,
      cpfCnpj: socio.cpfCnpjSocio,
      qualificacao: {
        codigo: socio.qualificacaoSocioCodigo,
        descricao: qualMap.get(socio.qualificacaoSocioCodigo) ?? '',
      },
      dataEntrada: socio.dataEntradaSociedade,
      pais: socio.pais ? { codigo: socio.pais.codigo, descricao: socio.pais.descricao } : null,
      representanteLegal: socio.representanteLegal,
      nomeRepresentante: socio.nomeRepresentante,
      qualificacaoRepresentante: socio.qualificacaoRepresentante
        ? {
            codigo: socio.qualificacaoRepresentante,
            descricao: qualMap.get(socio.qualificacaoRepresentante) ?? '',
          }
        : null,
      faixaEtaria: socio.faixaEtaria
        ? {
            codigo: socio.faixaEtaria,
            descricao: descricaoFaixaEtaria(socio.faixaEtaria),
          }
        : null,
    }));

    const sn = empresa.simplesNacional;

    return {
      cnpj: formatarCnpj(cnpjLimpo),
      cnpjBasico: empresa.cnpjBasico,
      razaoSocial: empresa.razaoSocial,
      naturezaJuridica: {
        codigo: empresa.naturezaJuridica.codigo,
        descricao: empresa.naturezaJuridica.descricao,
      },
      qualificacaoResponsavel: {
        codigo: empresa.qualificacaoResponsavel,
        descricao: qualMap.get(empresa.qualificacaoResponsavel) ?? '',
      },
      capitalSocial: Number(empresa.capitalSocial),
      porteEmpresa: {
        codigo: empresa.porteEmpresa,
        descricao: descricaoPorteEmpresa(empresa.porteEmpresa),
      },
      enteFederativoResponsavel: empresa.enteFederativoResponsavel,
      simplesNacional: sn
        ? {
            opcaoSimples: sn.opcaoSimples,
            descricaoOpcaoSimples:
              sn.opcaoSimples === 'S' ? 'SIM' : sn.opcaoSimples === 'N' ? 'NÃO' : null,
            dataOpcaoSimples: sn.dataOpcaoSimples,
            dataExclusaoSimples: sn.dataExclusaoSimples,
            opcaoMei: sn.opcaoMei,
            descricaoOpcaoMei: sn.opcaoMei === 'S' ? 'SIM' : sn.opcaoMei === 'N' ? 'NÃO' : null,
            dataOpcaoMei: sn.dataOpcaoMei,
            dataExclusaoMei: sn.dataExclusaoMei,
          }
        : null,
      estabelecimentos: estabelecimentosDto,
      socios: sociosDto,
    };
  }

  async listar(dto: ConsultaCnpjDto): Promise<ListaCnpjResponseDto<CnpjResponseDto>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EstabelecimentoWhereInput = {};

    if (dto.situacao_cadastral) {
      where.situacaoCadastral = dto.situacao_cadastral;
    }
    if (dto.uf) {
      where.uf = dto.uf.toUpperCase();
    }
    if (dto.municipio) {
      where.municipioCodigo = dto.municipio;
    }
    if (dto.cnae) {
      where.cnaeFiscalPrincipal = dto.cnae;
    }

    const empresaWhere: Prisma.EmpresaWhereInput = {};
    if (dto.natureza_juridica) {
      empresaWhere.naturezaJuridicaCodigo = dto.natureza_juridica;
    }
    if (dto.porte) {
      empresaWhere.porteEmpresa = dto.porte;
    }
    if (dto.razao_social) {
      empresaWhere.razaoSocial = {
        contains: dto.razao_social.toUpperCase(),
        mode: 'insensitive',
      };
    }

    if (Object.keys(empresaWhere).length > 0) {
      where.empresa = empresaWhere;
    }

    const [total, estabelecimentos] = await this.prisma.$transaction([
      this.prisma.estabelecimento.count({ where }),
      this.prisma.estabelecimento.findMany({
        where,
        skip,
        take: limit,
        include: {
          empresa: {
            include: { naturezaJuridica: true },
          },
          municipio: true,
        },
        orderBy: { empresa: { razaoSocial: 'asc' } },
      }),
    ]);

    const data = estabelecimentos.map((est) => {
      const cnpjCompleto = `${est.cnpjBasico}${est.cnpjOrdem}${est.cnpjDv}`;
      return {
        cnpj: formatarCnpj(cnpjCompleto),
        cnpjBasico: est.cnpjBasico,
        razaoSocial: est.empresa.razaoSocial,
        naturezaJuridica: {
          codigo: est.empresa.naturezaJuridica.codigo,
          descricao: est.empresa.naturezaJuridica.descricao,
        },
        qualificacaoResponsavel: {
          codigo: est.empresa.qualificacaoResponsavel,
          descricao: '',
        },
        capitalSocial: Number(est.empresa.capitalSocial),
        porteEmpresa: {
          codigo: est.empresa.porteEmpresa,
          descricao: descricaoPorteEmpresa(est.empresa.porteEmpresa),
        },
        enteFederativoResponsavel: est.empresa.enteFederativoResponsavel,
        simplesNacional: null,
        estabelecimentos: [],
        socios: [],
      } as CnpjResponseDto;
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
