export interface Endereco {
  logradouro: string;
  numero: number;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Patient {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  dataNascimento: string | null;
  sexo: string | number;
  convenio: number;
  telefone: string;
  clinicaId: string;
  nomeClinica?: string;
  possuiFichaAnamnese?: boolean;
  
  endereco?: Endereco | null;
  profissao?: string | null;
  nomeContatoEmergencia?: string | null;
  telefoneContatoEmergencia?: string | null;
}

export interface Atendimento {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  profissionalId: string;
  nomeProfissional: string;
  dataAtendimento: string;
  descricao: string;
  dente?: number;
  tipoAtendimento: string;
  statusAtendimento: string;
  dataCriacao: string;
  dataAlteracao: string | null;
}

export interface RecordEntry {
  id: string;
  patientId: string;
  date: string;
  anamnesis: string;
  procedure: string;
  notes: string;
}

export const CondicoesCardiacas = {
  Arritimia: 1,
  MarcaPasso: 2,
  Stent: 3,
  ProteseCardiaca: 4,
  ProlapsoValvulaCardiaca: 5,
  HistoricoEndocarditeBacteriana: 6,
  Infarto: 7,
  InsuficienciaCardiaca: 8,
  Outro: 9
} as const;
export type CondicoesCardiacas = typeof CondicoesCardiacas[keyof typeof CondicoesCardiacas];

export const CondicoesRespiratorias = {
  Asma: 1,
  Bronquite: 2,
  DPOC_Enfisema: 3,
  Rinite_Sinusite: 4,
  Tuberculose: 5,
  Outro: 6
} as const;
export type CondicoesRespiratorias = typeof CondicoesRespiratorias[keyof typeof CondicoesRespiratorias];

export const DeficienciaNecessidadeEspecial = {
  FisicaMotora: 1,
  Auditiva: 2,
  Visual: 3,
  Intelectual: 4,
  Multipla: 5,
  Outro: 6
} as const;
export type DeficienciaNecessidadeEspecial = typeof DeficienciaNecessidadeEspecial[keyof typeof DeficienciaNecessidadeEspecial];

export const DoencasAlteracoesNoSangue = {
  Anemia: 1,
  Hemofilia: 2,
  Leucemia: 3,
  AlteracaoPlaquetas: 4,
  DisturbioCoagulacao: 5,
  SangramentoFrequente: 6,
  Outro: 7
} as const;
export type DoencasAlteracoesNoSangue = typeof DoencasAlteracoesNoSangue[keyof typeof DoencasAlteracoesNoSangue];

export interface CondicaoCardiacaRequest {
  condicaoCardiaca: CondicoesCardiacas;
  outraCondicao: string | null;
}

export interface CondicaoRespiratoriaRequest {
  condicaoRespiratoria: CondicoesRespiratorias;
  outraCondicao: string | null;
  bombinhaMedicacaoControle?: boolean | null;
}

export interface DeficienciaNecessidadeEspecialRequest {
  deficienciaNecessidadeEspecial: DeficienciaNecessidadeEspecial;
  outraDeficiencia: string | null;
}

export interface DoencaSanguineaRequest {
  doencaSanguinea: DoencasAlteracoesNoSangue;
  outrasDoencasSanguineas: string | null;
  possuiSangramentoProlongado?: boolean | null;
}

export interface FichaAnamnese {
  id?: string;
  pacienteId: string;
  nomePaciente?: string;

  apresentaAlgumaCondicaoNaoCitada: boolean;
  qualCondicaoNaoCitada: string | null;

  confirmouDeclaracao: boolean;
  dataConfirmacaoDeclaracao: string;

  estaAmamentando: boolean;

  estaGravida: boolean;
  gravidaHaQuantasSemanas: string | null;

  estaSobTratamentoMedico: boolean;
  qualTratamentoMedico: string | null;

  fazOuFezUsoDrogas: boolean;
  quaisDrogas: string | null;

  fazUsoBebidaAlcoolica: boolean;

  fezCirurgiaNosUltimosCincoAnos: boolean;
  qualCirurgia: string | null;

  jaTomouPenicilina: boolean;

  jaTeveConvulsoes: boolean;

  jaTeveReacaoAnestesiaDental: boolean;
  qualReacaoAnestesia: string | null;

  paControladaComMedicacao: boolean | null;

  portadorDoencaInfectoContagiosa: boolean;
  qualDoencaInfectoContagiosa: string | null;

  possuiAlergias: boolean;
  quaisAlergias: string | null;

  possuiDisfuncaoHepatica: boolean;
  qualDisfuncoesHepaticas: string | null;

  possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: boolean;
  qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: string | null;

  precisaDeAdaptacao: boolean;
  qualAdaptacao: string | null;

  sofreuOuSofreDeMolestiaGraveNoFigado: boolean;

  sofreuOuSofreDeMolestiaGraveNosRins: boolean;

  temDiabetes: boolean;

  temProblemaCardiaco: boolean;
  qualProblemaCardiaco: string | null;

  tipoSangramento: boolean;

  tipoPA: string | number;

  tomandoAlgumMedicamento: boolean;
  quaisMedicamentos: string | null;

  bombinhaMedicacaoControle: boolean | null;
  possuiSangramentoProlongado: boolean | null;
  outrasCondicoesCardiacas: string | null;
  outrasCondicoesRespiratorias: string | null;
  outrasDeficienciasNecessidades: string | null;
  outrasDoencasSanguineas: string | null;

  // coleções auxiliares
  condicoesCardiacas: CondicaoCardiacaRequest[];
  condicoesRespiratorias: CondicaoRespiratoriaRequest[];
  deficiencias: DeficienciaNecessidadeEspecialRequest[];
  doencasSanguineas: DoencaSanguineaRequest[];

  dataCriacao?: string;
  dataAlteracao?: string | null;
}

export const FormaPagamentoEnum = {
  Credito: 0,
  Debito: 1,
  PIX: 2
} as const;

export type FormaPagamentoType = typeof FormaPagamentoEnum[keyof typeof FormaPagamentoEnum];

export const StatusPagamentoEnum = {
  Pendente: 0,
  Pago: 1,
  Cancelado: 2
} as const;

export type StatusPagamentoType = typeof StatusPagamentoEnum[keyof typeof StatusPagamentoEnum];

export interface Pagamento {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  atendimentoId: string | null;
  dataAtendimento: string | null;
  valor: number;
  formaPagamento: string; // The GET returns string names like "Debito", "PIX"
  dataVencimento: string;
  statusPagamento: string; // The GET returns string names like "Pago"
  observacao: string;
  dataCriacao: string;
  dataAlteracao: string | null;
}

export interface NovoPagamento {
  pacienteId: string;
  atendimentoId: string | null;
  valor: number;
  dataVencimento: string;
  statusPagamento: number;
  formaPagamento: number;
  observacao: string;
}

export interface FinanceDashboard {
  ano: number;
  meses: MonthData[];
}

export interface MonthData {
  mes: number;
  nomeMes: string;
  totalEntradas: number;
  statusPagamentos: StatusPagamentos;
  formasPagamento: FormaPagamentoData[];
  receitaPorProfissional: ReceitaProfissional[];
  receitaPorTipoAtendimento: ReceitaTipoAtendimento[];
}

export interface StatusPagamentos {
  totalPagos: number;
  totalPendentes: number;
  valorPago: number;
  valorPendente: number;
}

export interface FormaPagamentoData {
  formaPagamento: string;
  total: number;
  percentual: number;
}

export interface ReceitaProfissional {
  profissionalId: string;
  nomeProfissional: string;
  totalGerado: number;
}

export interface ReceitaTipoAtendimento {
  tipoAtendimento: string;
  totalGerado: number;
}

export interface FinanceSummary {
  totalRevenue: number;
  pendingPayments: number;
}

export interface Agendamento {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  profissionalId: string;
  nomeProfissional: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  duracaoMinutos: number;
  observacao: string;
  status: string;
  atendimentoId: string | null;
  dataCriacao: string;
  dataAlteracao: string | null;
}

export interface NovoAgendamento {
  pacienteId: string;
  profissionalId: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  observacao: string;
}

export interface Profissional {
  id: string;
  nome: string;
  email: string;
  cro: string;
  clinicaId: string;
}

export interface ProfissionalRequest {
  nome: string;
  email: string;
  senha?: string;
  cro: string;
  clinicaId: string;
}

export interface FinanceTransaction {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  date: string;
  description: string;
  status: 'paid' | 'pending' | 'installments';
}

export const TipoArquivo = {
  Exame: 1,
  RaioX: 2,
  Documento: 3,
  Foto: 4,
  Outros: 5
} as const;

export type TipoArquivoType = typeof TipoArquivo[keyof typeof TipoArquivo];

export interface ArquivoPaciente {
  id: string;
  pacienteId: string;
  clinicaId: string;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  tipo: string; // The API might return the string name
  dataCriacao: string;
}
