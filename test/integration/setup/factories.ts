import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

export async function criarNaturezaJuridica(
  overrides: Partial<{ codigo: string; descricao: string }> = {},
) {
  const codigo = overrides.codigo ?? '2062';
  return prisma.naturezaJuridica.upsert({
    where: { codigo },
    create: { codigo, descricao: overrides.descricao ?? 'SOCIEDADE EMPRESARIA LIMITADA' },
    update: {},
  });
}

export async function criarPais(
  overrides: Partial<{ codigo: string; descricao: string }> = {},
) {
  const codigo = overrides.codigo ?? '105';
  return prisma.pais.upsert({
    where: { codigo },
    create: { codigo, descricao: overrides.descricao ?? 'BRASIL' },
    update: {},
  });
}

export async function criarMunicipio(
  overrides: Partial<{ codigo: string; descricao: string }> = {},
) {
  const codigo = overrides.codigo ?? '7107';
  return prisma.municipio.upsert({
    where: { codigo },
    create: { codigo, descricao: overrides.descricao ?? 'BELO HORIZONTE' },
    update: {},
  });
}

export async function criarQualificacao(
  overrides: Partial<{ codigo: string; descricao: string }> = {},
) {
  const codigo = overrides.codigo ?? '49';
  return prisma.qualificacaoSocio.upsert({
    where: { codigo },
    create: { codigo, descricao: overrides.descricao ?? 'SÓCIO-ADMINISTRADOR' },
    update: {},
  });
}

export async function criarCnae(
  overrides: Partial<{ codigo: string; descricao: string }> = {},
) {
  const codigo = overrides.codigo ?? '6201501';
  return prisma.cnae.upsert({
    where: { codigo },
    create: { codigo, descricao: overrides.descricao ?? 'DESENVOLVIMENTO DE PROGRAMAS' },
    update: {},
  });
}

export async function criarEmpresa(
  overrides: Partial<{
    cnpjBasico: string;
    razaoSocial: string;
    naturezaJuridicaCodigo: string;
    capitalSocial: number;
    porteEmpresa: string;
  }> = {},
) {
  const naturezaCodigo = overrides.naturezaJuridicaCodigo ?? '2062';
  await criarNaturezaJuridica({ codigo: naturezaCodigo });
  const cnpjBasico = overrides.cnpjBasico ?? '11222333';
  return prisma.empresa.upsert({
    where: { cnpjBasico },
    create: {
      cnpjBasico,
      razaoSocial: overrides.razaoSocial ?? 'EMPRESA TESTE LTDA',
      naturezaJuridicaCodigo: naturezaCodigo,
      qualificacaoResponsavel: '49',
      capitalSocial: new Prisma.Decimal(overrides.capitalSocial ?? 100000),
      porteEmpresa: overrides.porteEmpresa ?? '01',
      enteFederativoResponsavel: null,
    },
    update: {},
  });
}

export async function criarEstabelecimento(
  cnpjBasico: string,
  overrides: Partial<{
    cnpjOrdem: string;
    cnpjDv: string;
    situacaoCadastral: string;
    uf: string;
    cnaeFiscalPrincipal: string;
  }> = {},
) {
  const cnpjOrdem = overrides.cnpjOrdem ?? '0001';
  const cnpjDv = overrides.cnpjDv ?? '00';
  return prisma.estabelecimento.upsert({
    where: { cnpjBasico_cnpjOrdem_cnpjDv: { cnpjBasico, cnpjOrdem, cnpjDv } },
    create: {
      cnpjBasico,
      cnpjOrdem,
      cnpjDv,
      identificadorMatrizFilial: '1',
      situacaoCadastral: overrides.situacaoCadastral ?? '02',
      uf: overrides.uf ?? 'MG',
      cnaeFiscalPrincipal: overrides.cnaeFiscalPrincipal ?? null,
    },
    update: {},
  });
}

export async function criarSocio(
  cnpjBasico: string,
  overrides: Partial<{
    nomeSocio: string;
    identificadorSocio: string;
    qualificacaoSocioCodigo: string;
  }> = {},
) {
  return prisma.socio.create({
    data: {
      cnpjBasico,
      identificadorSocio: overrides.identificadorSocio ?? '2',
      nomeSocio: overrides.nomeSocio ?? 'SÓCIO TESTE',
      qualificacaoSocioCodigo: overrides.qualificacaoSocioCodigo ?? '49',
    },
  });
}

export async function limparBanco() {
  await prisma.importLog.deleteMany({});
  await prisma.simplesNacional.deleteMany({});
  await prisma.socio.deleteMany({});
  await prisma.estabelecimento.deleteMany({});
  await prisma.empresa.deleteMany({});
  await prisma.naturezaJuridica.deleteMany({});
  await prisma.municipio.deleteMany({});
  await prisma.pais.deleteMany({});
  await prisma.qualificacaoSocio.deleteMany({});
  await prisma.cnae.deleteMany({});
  await prisma.motivoSituacaoCadastral.deleteMany({});
}

export { prisma };
