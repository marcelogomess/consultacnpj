export interface Socio {
  cnpjBasico: string;
  identificadorSocio: string;
  nomeSocio: string;
  cpfCnpjSocio: string | null;
  qualificacaoSocioCodigo: string;
  dataEntradaSociedade: string | null;
  paisCodigo: string | null;
  representanteLegal: string | null;
  nomeRepresentante: string | null;
  qualificacaoRepresentante: string | null;
  faixaEtaria: string | null;
}
