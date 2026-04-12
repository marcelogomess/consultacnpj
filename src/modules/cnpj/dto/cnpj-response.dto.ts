export interface CodigoDescricao {
  codigo: string;
  descricao: string;
}

export interface EnderecoDto {
  tipoLogradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: CodigoDescricao | null;
}

export interface TelefoneDto {
  ddd: string;
  numero: string;
}

export interface EstabelecimentoResponseDto {
  cnpj: string;
  cnpjOrdem: string;
  cnpjDv: string;
  tipo: CodigoDescricao;
  nomeFantasia: string | null;
  situacaoCadastral: CodigoDescricao;
  dataSituacaoCadastral: string | null;
  motivoSituacaoCadastral: CodigoDescricao | null;
  dataInicioAtividade: string | null;
  cnaePrincipal: CodigoDescricao | null;
  cnaeSecundario: CodigoDescricao[];
  endereco: EnderecoDto;
  telefones: TelefoneDto[];
  email: string | null;
  situacaoEspecial: string | null;
  dataSituacaoEspecial: string | null;
}

export interface SocioResponseDto {
  identificador: CodigoDescricao;
  nome: string;
  cpfCnpj: string | null;
  qualificacao: CodigoDescricao;
  dataEntrada: string | null;
  pais: CodigoDescricao | null;
  representanteLegal: string | null;
  nomeRepresentante: string | null;
  qualificacaoRepresentante: CodigoDescricao | null;
  faixaEtaria: CodigoDescricao | null;
}

export interface SimplesNacionalResponseDto {
  opcaoSimples: string | null;
  descricaoOpcaoSimples: string | null;
  dataOpcaoSimples: string | null;
  dataExclusaoSimples: string | null;
  opcaoMei: string | null;
  descricaoOpcaoMei: string | null;
  dataOpcaoMei: string | null;
  dataExclusaoMei: string | null;
}

export interface CnpjResponseDto {
  cnpj: string;
  cnpjBasico: string;
  razaoSocial: string;
  naturezaJuridica: CodigoDescricao;
  qualificacaoResponsavel: CodigoDescricao;
  capitalSocial: number;
  porteEmpresa: CodigoDescricao;
  enteFederativoResponsavel: string | null;
  simplesNacional: SimplesNacionalResponseDto | null;
  estabelecimentos: EstabelecimentoResponseDto[];
  socios: SocioResponseDto[];
}
