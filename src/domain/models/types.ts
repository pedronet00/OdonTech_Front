export interface Patient {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  convenio: number;
  telefone: string;
  clinicaId: string;
  nomeClinica: string;
  possuiFichaAnamnese: boolean;
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

export interface FichaAnamnese {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  tomandoAlgumMedicamento: boolean;
  quaisMedicamentos: string | null;
  possuiAlergias: boolean;
  quaisAlergias: string | null;
  tipoPA: string | number; // String from GET, Number for POST
  temProblemaCardiaco: boolean;
  qualProblemaCardiaco: string | null;
  temDiabetes: boolean;
  tipoSangramento: boolean;
  fezCirurgiaNosUltimosCincoAnos: boolean;
  qualCirurgia: string | null;
  jaTeveReacaoAnestesiaDental: boolean;
  qualReacaoAnestesia: string | null;
  estaSobTratamentoMedico: boolean;
  qualTratamentoMedico: string | null;
  sofreuOuSofreDeMolestiaGraveNosRins: boolean;
  sofreuOuSofreDeMolestiaGraveNoFigado: boolean;
  jaTeveConvulsoes: boolean;
  jaTomouPenicilina: boolean;
  portadorDoencaInfectoContagiosa: boolean;
  qualDoencaInfectoContagiosa: string | null;
  fazUsoBebidaAlcoolica: boolean;
  fazOuFezUsoDrogas: boolean;
  quaisDrogas: string | null;
  estaGravida: boolean;
  dataCriacao: string;
  dataAlteracao: string | null;
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
