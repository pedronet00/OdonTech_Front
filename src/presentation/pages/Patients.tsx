import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, MoreVertical, Edit, Trash2, FileText, ClipboardList, Save, X, DollarSign, Plus, Check, Ban } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Patient, FichaAnamnese, Pagamento, NovoPagamento, CondicoesCardiacas, CondicoesRespiratorias, DeficienciaNecessidadeEspecial, DoencasAlteracoesNoSangue } from '../../domain/models/types';
import { FormaPagamentoEnum, StatusPagamentoEnum } from '../../domain/models/types';
import toast from 'react-hot-toast';
import { applyCpfMask, applyPhoneMask, applyCepMask } from '../../utils/masks';

const getDeficienciaId = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (!isNaN(Number(val))) return Number(val);
  
  const valStr = String(val).trim().toLowerCase();
  const mapping: { [key: string]: number } = {
    'fisicamotora': 1,
    'fisica_motora': 1,
    'fisica': 1,
    'motora': 1,
    'auditiva': 2,
    'visual': 3,
    'intelectual': 4,
    'multipla': 5,
    'outro': 6,
    'outra': 6
  };
  return mapping[valStr] || 0;
};

const getCondicaoCardiacaId = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (!isNaN(Number(val))) return Number(val);
  
  const valStr = String(val).trim().toLowerCase();
  const mapping: { [key: string]: number } = {
    'arritimia': 1,
    'arritmia': 1,
    'marcapasso': 2,
    'marca_passo': 2,
    'marca-passo': 2,
    'stent': 3,
    'protesecardiaca': 4,
    'protese_cardiaca': 4,
    'protese': 4,
    'prolapsovalvulacardiaca': 5,
    'prolapso_valvula_cardiaca': 5,
    'prolapso': 5,
    'historicoendocarditebacteriana': 6,
    'historico_endocardite_bacteriana': 6,
    'endocardite': 6,
    'infarto': 7,
    'insuficienciacardiaca': 8,
    'insuficiencia_cardiaca': 8,
    'outro': 9,
    'outra': 9
  };
  return mapping[valStr] || 0;
};

const getCondicaoRespiratoriaId = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (!isNaN(Number(val))) return Number(val);
  
  const valStr = String(val).trim().toLowerCase();
  const mapping: { [key: string]: number } = {
    'asma': 1,
    'bronquite': 2,
    'dpoc_enfisema': 3,
    'dpoc': 3,
    'enfisema': 3,
    'rinite_sinusite': 4,
    'rinite': 4,
    'sinusite': 4,
    'tuberculose': 5,
    'outro': 6,
    'outra': 6
  };
  return mapping[valStr] || 0;
};

const getDoencaSanguineaId = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (!isNaN(Number(val))) return Number(val);
  
  const valStr = String(val).trim().toLowerCase();
  const mapping: { [key: string]: number } = {
    'anemia': 1,
    'hemofilia': 2,
    'leucemia': 3,
    'alteracaoplaquetas': 4,
    'alteracao_plaquetas': 4,
    'disturbiocoagulacao': 5,
    'disturbio_coagulacao': 5,
    'sangramentofrequente': 6,
    'sangramento_frequente': 6,
    'outro': 7,
    'outra': 7
  };
  return mapping[valStr] || 0;
};

export function Patients() {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const [fichaAnamnese, setFichaAnamnese] = useState<FichaAnamnese | null>(null);
  const [anamneseActiveTab, setAnamneseActiveTab] = useState<'geral' | 'habitos' | 'patologias' | 'cardiovascular' | 'confirmacao'>('geral');
  const [financePayments, setFinancePayments] = useState<Pagamento[]>([]);
  const [isFinanceLoading, setIsFinanceLoading] = useState(false);
  const [selectedPatientForFinance, setSelectedPatientForFinance] = useState<Patient | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPaymentData] = useState<Partial<NovoPagamento>>({
    valor: 0,
    dataVencimento: new Date().toISOString().split('T')[0],
    formaPagamento: FormaPagamentoEnum.PIX,
    statusPagamento: StatusPagamentoEnum.Pendente,
    observacao: ''
  });

  const convenioMap: { [key: number]: string } = {
    1: 'Unimed', 2: 'Bradesco', 3: 'Amil', 4: 'SulAmerica', 5: 'OesteSaude',
    6: 'Athia', 7: 'SUS', 8: 'Particular', 9: 'Outros'
  };

  const fetchPatients = async () => {
    if (!user?.clinica_id) return;
    try {
      setLoading(true);
      const data = await ApiClient.get<Patient[]>(`/pacientes/clinica/${user.clinica_id}`);
      setPatients(data);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar a lista de pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user?.clinica_id, token]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este paciente?')) return;
    try {
      await ApiClient.delete(`/pacientes/${id}`);
      setPatients(prev => prev.filter(p => p.id !== id));
      setActiveDropdown(null);
      toast.success('Paciente excluído com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const validateEndereco = (endereco: any) => {
    if (!endereco) return { isValid: true, data: null };

    const logradouro = endereco.logradouro?.trim() || '';
    const numero = endereco.numero;
    const complemento = endereco.complemento?.trim() || null;
    const bairro = endereco.bairro?.trim() || '';
    const cidade = endereco.cidade?.trim() || '';
    const estado = endereco.estado?.trim().toUpperCase() || '';
    const cep = endereco.cep?.trim() || '';

    const hasAnyField = !!(logradouro || numero || complemento || bairro || cidade || estado || cep);
    if (!hasAnyField) {
      return { isValid: true, data: null };
    }

    if (!logradouro) {
      toast.error('Logradouro é obrigatório no endereço.');
      return { isValid: false, data: null };
    }
    if (!numero || Number(numero) <= 0) {
      toast.error('Número do endereço deve ser maior que zero.');
      return { isValid: false, data: null };
    }
    if (!bairro) {
      toast.error('Bairro é obrigatório no endereço.');
      return { isValid: false, data: null };
    }
    if (!cidade) {
      toast.error('Cidade é obrigatória no endereço.');
      return { isValid: false, data: null };
    }

    const UfsValidas = new Set([
      "AC","AL","AM","AP","BA","CE","DF","ES","GO",
      "MA","MG","MS","MT","PA","PB","PE","PI","PR",
      "RJ","RN","RO","RR","RS","SC","SE","SP","TO"
    ]);
    if (!UfsValidas.has(estado)) {
      toast.error(`Estado (UF) inválido: '${endereco.estado || ''}'.`);
      return { isValid: false, data: null };
    }

    const apenasDigitos = cep.replace(/\D/g, '');
    if (apenasDigitos.length !== 8) {
      toast.error('CEP inválido. Deve conter 8 dígitos.');
      return { isValid: false, data: null };
    }

    const cepFormatado = `${apenasDigitos.substring(0, 5)}-${apenasDigitos.substring(5)}`;

    return {
      isValid: true,
      data: {
        logradouro,
        numero: Number(numero),
        complemento,
        bairro,
        cidade,
        estado,
        cep: cepFormatado
      }
    };
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    const validation = validateEndereco(editingPatient.endereco);
    if (!validation.isValid) return;

    try {
      setIsSaving(true);
      await ApiClient.put(`/pacientes/${editingPatient.id}`, {
        ...editingPatient,
        sexo: editingPatient.sexo === 'Masculino' ? 0 : 1,
        dataNascimento: (editingPatient.dataNascimento && typeof editingPatient.dataNascimento === 'string' && editingPatient.dataNascimento.trim() !== '') ? editingPatient.dataNascimento : null,
        cpf: (editingPatient.cpf && typeof editingPatient.cpf === 'string' && editingPatient.cpf.trim() !== '') ? editingPatient.cpf : null,
        endereco: validation.data,
        profissao: editingPatient.profissao || null,
        nomeContatoEmergencia: editingPatient.nomeContatoEmergencia || null,
        telefoneContatoEmergencia: editingPatient.telefoneContatoEmergencia || null
      });
      toast.success('Paciente atualizado com sucesso!');
      await fetchPatients();
      setEditingPatient(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient || !user?.clinica_id) return;

    const validation = validateEndereco(newPatient.endereco);
    if (!validation.isValid) return;

    try {
      setIsSaving(true);
      const payload = {
        ...newPatient,
        clinicaId: user.clinica_id,
        sexo: newPatient.sexo === 'Masculino' ? 0 : 1,
        dataNascimento: (newPatient.dataNascimento && typeof newPatient.dataNascimento === 'string' && newPatient.dataNascimento.trim() !== '') ? newPatient.dataNascimento : null,
        cpf: (newPatient.cpf && typeof newPatient.cpf === 'string' && newPatient.cpf.trim() !== '') ? newPatient.cpf : null,
        endereco: validation.data,
        profissao: newPatient.profissao || null,
        nomeContatoEmergencia: newPatient.nomeContatoEmergencia || null,
        telefoneContatoEmergencia: newPatient.telefoneContatoEmergencia || null
      };
      await ApiClient.post('/pacientes', payload);
      toast.success('Paciente cadastrado com sucesso!');
      await fetchPatients();
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultFicha = (pacienteId: string, nomePaciente: string): FichaAnamnese => ({
    pacienteId,
    nomePaciente,
    apresentaAlgumaCondicaoNaoCitada: false,
    qualCondicaoNaoCitada: null,
    confirmouDeclaracao: false,
    dataConfirmacaoDeclaracao: new Date().toISOString(),
    estaAmamentando: false,
    estaGravida: false,
    gravidaHaQuantasSemanas: null,
    estaSobTratamentoMedico: false,
    qualTratamentoMedico: null,
    fazOuFezUsoDrogas: false,
    quaisDrogas: null,
    fazUsoBebidaAlcoolica: false,
    fezCirurgiaNosUltimosCincoAnos: false,
    qualCirurgia: null,
    jaTomouPenicilina: false,
    jaTeveConvulsoes: false,
    jaTeveReacaoAnestesiaDental: false,
    qualReacaoAnestesia: null,
    paControladaComMedicacao: null,
    portadorDoencaInfectoContagiosa: false,
    qualDoencaInfectoContagiosa: null,
    possuiAlergias: false,
    quaisAlergias: null,
    possuiDisfuncaoHepatica: false,
    qualDisfuncoesHepaticas: null,
    possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: false,
    qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: null,
    precisaDeAdaptacao: false,
    qualAdaptacao: null,
    sofreuOuSofreDeMolestiaGraveNoFigado: false,
    sofreuOuSofreDeMolestiaGraveNosRins: false,
    temDiabetes: false,
    temProblemaCardiaco: false,
    qualProblemaCardiaco: null,
    tipoSangramento: false,
    tipoPA: 2,
    tomandoAlgumMedicamento: false,
    quaisMedicamentos: null,
    bombinhaMedicacaoControle: null,
    possuiSangramentoProlongado: null,
    outrasCondicoesCardiacas: null,
    outrasCondicoesRespiratorias: null,
    outrasDeficienciasNecessidades: null,
    outrasDoencasSanguineas: null,
    condicoesCardiacas: [],
    condicoesRespiratorias: [],
    deficiencias: [],
    doencasSanguineas: []
  });

  const fetchAnamnese = async (pacienteId: string) => {
    try {
      const patient = patients.find(p => p.id === pacienteId);
      const patientName = patient?.nome || 'Novo Registro';
      const response = await ApiClient.request(`/fichas-anamnese/paciente/${pacienteId}`);
      if (response.status === 404) {
        setFichaAnamnese(defaultFicha(pacienteId, patientName));
        setAnamneseActiveTab('geral');
        return;
      }
      if (!response.ok) throw new Error('Falha ao carregar anamnese');
      const result = await response.json();
      const data = result.data || {};

      const normalizedDeficiencias = (data.deficiencias || []).map((d: any) => ({
        ...d,
        deficienciaNecessidadeEspecial: getDeficienciaId(d.deficienciaNecessidadeEspecial)
      }));

      const normalizedCardiacas = (data.condicoesCardiacas || []).map((c: any) => ({
        ...c,
        condicaoCardiaca: getCondicaoCardiacaId(c.condicaoCardiaca)
      }));

      const normalizedRespiratorias = (data.condicoesRespiratorias || []).map((r: any) => ({
        ...r,
        condicaoRespiratoria: getCondicaoRespiratoriaId(r.condicaoRespiratoria)
      }));

      const normalizedSanguineas = (data.doencasSanguineas || []).map((s: any) => ({
        ...s,
        doencaSanguinea: getDoencaSanguineaId(s.doencaSanguinea)
      }));

      setFichaAnamnese({
        ...data,
        nomePaciente: patientName,
        bombinhaMedicacaoControle: data.bombinhaMedicacaoControle ?? null,
        possuiSangramentoProlongado: data.possuiSangramentoProlongado ?? null,
        outrasCondicoesCardiacas: data.outrasCondicoesCardiacas ?? null,
        outrasCondicoesRespiratorias: data.outrasCondicoesRespiratorias ?? null,
        outrasDeficienciasNecessidades: data.outrasDeficienciasNecessidades ?? null,
        outrasDoencasSanguineas: data.outrasDoencasSanguineas ?? null,
        condicoesCardiacas: normalizedCardiacas,
        condicoesRespiratorias: normalizedRespiratorias,
        deficiencias: normalizedDeficiencias,
        doencasSanguineas: normalizedSanguineas
      } as FichaAnamnese);
      setAnamneseActiveTab('geral');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveAnamnese = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fichaAnamnese) return;
    if (!fichaAnamnese.confirmouDeclaracao) {
      toast.error('Você precisa confirmar a declaração de verdade das informações.');
      return;
    }
    try {
      setIsSaving(true);
      const paMapping: { [key: string]: number } = { 'Alta': 1, 'Normal': 2, 'Baixa': 3 };
      
      let tipoPANum = 2;
      if (typeof fichaAnamnese.tipoPA === 'number') {
        tipoPANum = fichaAnamnese.tipoPA;
      } else if (typeof fichaAnamnese.tipoPA === 'string') {
        tipoPANum = paMapping[fichaAnamnese.tipoPA] || 2;
      }

      const payload = {
        ...fichaAnamnese,
        tipoPA: tipoPANum,
        dataConfirmacaoDeclaracao: new Date().toISOString()
      };
      await ApiClient.post('/fichas-anamnese', payload);
      toast.success('Ficha salva com sucesso!');
      setFichaAnamnese(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardiacConditionChange = (condicao: CondicoesCardiacas, checked: boolean) => {
    if (!fichaAnamnese) return;
    let newList = [...fichaAnamnese.condicoesCardiacas];
    if (checked) {
      if (!newList.some(c => c.condicaoCardiaca === condicao)) {
        newList.push({ condicaoCardiaca: condicao, outraCondicao: null });
      }
    } else {
      newList = newList.filter(c => c.condicaoCardiaca !== condicao);
    }
    setFichaAnamnese({ ...fichaAnamnese, condicoesCardiacas: newList });
  };

  const handleCardiacOutraChange = (text: string) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.condicoesCardiacas.map(c => 
      c.condicaoCardiaca === 9 ? { ...c, outraCondicao: text || null } : c
    );
    setFichaAnamnese({ ...fichaAnamnese, condicoesCardiacas: newList });
  };

  const handleRespiratoriaChange = (condicao: CondicoesRespiratorias, checked: boolean) => {
    if (!fichaAnamnese) return;
    let newList = [...fichaAnamnese.condicoesRespiratorias];
    if (checked) {
      if (!newList.some(r => r.condicaoRespiratoria === condicao)) {
        newList.push({ condicaoRespiratoria: condicao, outraCondicao: null, bombinhaMedicacaoControle: null });
      }
    } else {
      newList = newList.filter(r => r.condicaoRespiratoria !== condicao);
    }
    setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: newList });
  };

  const handleRespiratoriaOutraChange = (text: string) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.condicoesRespiratorias.map(r => 
      r.condicaoRespiratoria === 6 ? { ...r, outraCondicao: text || null } : r
    );
    setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: newList });
  };

  const handleRespiratoriaBombinhaChange = (condicao: CondicoesRespiratorias, value: boolean | null) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.condicoesRespiratorias.map(r => 
      r.condicaoRespiratoria === condicao ? { ...r, bombinhaMedicacaoControle: value } : r
    );
    setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: newList });
  };

  const handleDeficienciaChange = (def: DeficienciaNecessidadeEspecial, checked: boolean) => {
    if (!fichaAnamnese) return;
    let newList = [...fichaAnamnese.deficiencias];
    if (checked) {
      if (!newList.some(d => d.deficienciaNecessidadeEspecial === def)) {
        newList.push({ deficienciaNecessidadeEspecial: def, outraDeficiencia: null });
      }
    } else {
      newList = newList.filter(d => d.deficienciaNecessidadeEspecial !== def);
    }
    setFichaAnamnese({ ...fichaAnamnese, deficiencias: newList });
  };

  const handleDeficienciaOutraChange = (text: string) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.deficiencias.map(d => 
      d.deficienciaNecessidadeEspecial === 6 ? { ...d, outraDeficiencia: text || null } : d
    );
    setFichaAnamnese({ ...fichaAnamnese, deficiencias: newList });
  };

  const handleSanguineaChange = (doenca: DoencasAlteracoesNoSangue, checked: boolean) => {
    if (!fichaAnamnese) return;
    let newList = [...fichaAnamnese.doencasSanguineas];
    if (checked) {
      if (!newList.some(s => s.doencaSanguinea === doenca)) {
        newList.push({ doencaSanguinea: doenca, outrasDoencasSanguineas: null, possuiSangramentoProlongado: null });
      }
    } else {
      newList = newList.filter(s => s.doencaSanguinea !== doenca);
    }
    setFichaAnamnese({ ...fichaAnamnese, doencasSanguineas: newList });
  };

  const handleSanguineaOutraChange = (text: string) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.doencasSanguineas.map(s => 
      s.doencaSanguinea === 7 ? { ...s, outrasDoencasSanguineas: text || null } : s
    );
    setFichaAnamnese({ ...fichaAnamnese, doencasSanguineas: newList });
  };

  const handleSanguineaSangramentoChange = (doenca: DoencasAlteracoesNoSangue, value: boolean | null) => {
    if (!fichaAnamnese) return;
    const newList = fichaAnamnese.doencasSanguineas.map(s => 
      s.doencaSanguinea === doenca ? { ...s, possuiSangramentoProlongado: value } : s
    );
    setFichaAnamnese({ ...fichaAnamnese, doencasSanguineas: newList });
  };

  const fetchPayments = async (pacienteId: string) => {
    try {
      setIsFinanceLoading(true);
      const data = await ApiClient.get<Pagamento[]>(`/pagamentos/paciente/${pacienteId}`);
      setFinancePayments(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsFinanceLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForFinance || !newPayment.valor) return;
    try {
      setIsSaving(true);
      const payload: NovoPagamento = {
        pacienteId: selectedPatientForFinance.id,
        atendimentoId: null,
        valor: Number(newPayment.valor),
        dataVencimento: newPayment.dataVencimento || '',
        statusPagamento: Number(newPayment.statusPagamento ?? 1),
        formaPagamento: Number(newPayment.formaPagamento ?? 1),
        observacao: newPayment.observacao || ''
      };
      await ApiClient.post('/pagamentos', payload);
      toast.success('Pagamento registrado!');
      setIsAddingPayment(false);
      fetchPayments(selectedPatientForFinance.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await ApiClient.patch(`/pagamentos/${paymentId}/pagar`);
      toast.success('Pago com sucesso!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!window.confirm('Cancelar este pagamento?')) return;
    try {
      await ApiClient.patch(`/pagamentos/${paymentId}/cancelar`);
      toast.success('Cancelado!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Excluir permanentemente?')) return;
    try {
      await ApiClient.delete(`/pagamentos/${paymentId}`);
      toast.success('Excluído!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openFinanceModal = (patient: Patient) => {
    setSelectedPatientForFinance(patient);
    fetchPayments(patient.id);
    setActiveDropdown(null);
  };

  const openCreateModal = () => {
    setNewPatient({ nome: '', email: '', cpf: '', dataNascimento: '', sexo: 'Masculino', convenio: 1, telefone: '', endereco: { logradouro: '', numero: 0, complemento: '', bairro: '', cidade: '', estado: '', cep: '' }, profissao: '', nomeContatoEmergencia: '', telefoneContatoEmergencia: '' });
    setIsCreating(true);
  };

  const filteredPatients = patients.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  return (
    <div className="animate-fade-in" onClick={() => activeDropdown && setActiveDropdown(null)}>
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Pacientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gerencie os cadastros dos seus pacientes</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={18} /> <span className="mobile-hide">Novo Paciente</span><span className="mobile-only">Novo</span>
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nome..."
            style={{ paddingLeft: '40px', width: '100%', maxWidth: '400px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="data-table responsive-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>CPF</th>
              <th>Convênio</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>Carregando pacientes...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>{error}</td>
              </tr>
            ) : filteredPatients.map(patient => (
              <tr key={patient.id}>
                <td data-label="Nome" style={{ fontWeight: 600, color: 'var(--primary)' }}>{patient.nome}</td>
                <td data-label="Contato">
                  <div className="flex-col" style={{ alignItems: 'flex-start' }}>
                    <span>{patient.telefone}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{patient.email || 'N/A'}</span>
                  </div>
                </td>
                <td data-label="CPF">{patient.cpf || 'Não informado'}</td>
                <td data-label="Convênio">{convenioMap[patient.convenio] || 'N/A'}</td>
                <td data-label="Ações" style={{ textAlign: 'right' }}>
                  <div className="dropdown-container">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(patient.id);
                      }}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeDropdown === patient.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => navigate(`/prontuarios/${patient.id}`)}
                        >
                          <FileText size={16} />Prontuário
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => fetchAnamnese(patient.id)}
                        >
                          <ClipboardList size={16} /> Anamnese
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => openFinanceModal(patient)}
                        >
                          <DollarSign size={16} /> Finanças
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setEditingPatient({
                              ...patient,
                              endereco: patient.endereco || { logradouro: '', numero: 0, complemento: '', bairro: '', cidade: '', estado: '', cep: '' },
                              profissao: patient.profissao || '',
                              nomeContatoEmergencia: patient.nomeContatoEmergencia || '',
                              telefoneContatoEmergencia: patient.telefoneContatoEmergencia || ''
                            });
                            setActiveDropdown(null);
                          }}
                        >
                          <Edit size={16} /> Editar
                        </button>
                        <button
                          className="dropdown-item danger"
                          onClick={() => handleDelete(patient.id)}
                        >
                          <Trash2 size={16} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação */}
      {isCreating && newPatient && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Paciente</h2>
              <button onClick={() => setIsCreating(false)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group-container">
                  <div className="form-group">
                    <label className="input-label">Nome Completo <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: João da Silva Filho"
                      maxLength={100}
                      value={newPatient.nome}
                      onChange={e => setNewPatient({ ...newPatient, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="email@exemplo.com"
                        maxLength={100}
                        value={newPatient.email || ''}
                        onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Telefone <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        value={newPatient.telefone}
                        onChange={e => setNewPatient({ ...newPatient, telefone: applyPhoneMask(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">CPF</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        value={newPatient.cpf || ''}
                        onChange={e => setNewPatient({ ...newPatient, cpf: applyCpfMask(e.target.value) })}
                        // required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Data de Nascimento</label>
                      <input
                        type="date"
                        className="input-field"
                         value={newPatient.dataNascimento || ''}
                        onChange={e => setNewPatient({ ...newPatient, dataNascimento: e.target.value })}
                      // required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Sexo <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="input-field"
                        value={newPatient.sexo}
                        onChange={e => setNewPatient({ ...newPatient, sexo: e.target.value })}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">Convênio <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="input-field"
                        value={newPatient.convenio}
                        onChange={e => setNewPatient({ ...newPatient, convenio: parseInt(e.target.value) })}
                      >
                        {Object.entries(convenioMap).map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* — Profissão & Emergência — */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Profissão &amp; Contato de Emergência</p>
                    <div className="form-group">
                      <label className="input-label">Profissão</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Engenheiro, Professor..."
                        value={newPatient.profissao || ''}
                        onChange={e => setNewPatient({ ...newPatient, profissao: e.target.value })}
                      />
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Nome do Contato de Emergência</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: Maria Silva"
                          value={newPatient.nomeContatoEmergencia || ''}
                          onChange={e => setNewPatient({ ...newPatient, nomeContatoEmergencia: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Telefone de Emergência</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          value={newPatient.telefoneContatoEmergencia || ''}
                          onChange={e => setNewPatient({ ...newPatient, telefoneContatoEmergencia: applyPhoneMask(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* — Endereço — */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Endereço Residencial</p>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Logradouro</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Rua, Av., Travessa..."
                          value={newPatient.endereco?.logradouro || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, logradouro: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Número</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Ex: 123"
                          min={0}
                          value={newPatient.endereco?.numero || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, numero: Number(e.target.value) } })}
                        />
                      </div>
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Complemento</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Apto, Bloco..."
                          value={newPatient.endereco?.complemento || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, complemento: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Bairro</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: Centro"
                          value={newPatient.endereco?.bairro || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, bairro: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Cidade</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: São Paulo"
                          value={newPatient.endereco?.cidade || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, cidade: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Estado (UF)</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: SP"
                          maxLength={2}
                          value={newPatient.endereco?.estado || ''}
                          onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, estado: e.target.value.toUpperCase() } })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="input-label">CEP</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="00000-000"
                        maxLength={9}
                        value={newPatient.endereco?.cep || ''}
                        onChange={e => setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, cep: applyCepMask(e.target.value) } })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Cadastrando...' : 'Cadastrar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingPatient && (
        <div className="modal-overlay" onClick={() => setEditingPatient(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Paciente</h2>
              <button onClick={() => setEditingPatient(null)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group-container">
                  <div className="form-group">
                    <label className="input-label">Nome Completo <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className="input-field"
                      maxLength={100}
                      value={editingPatient.nome}
                      onChange={e => setEditingPatient({ ...editingPatient, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        className="input-field"
                        maxLength={100}
                        value={editingPatient.email || ''}
                        onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Telefone <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text"
                        className="input-field"
                        maxLength={15}
                        value={editingPatient.telefone}
                        onChange={e => setEditingPatient({ ...editingPatient, telefone: applyPhoneMask(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">CPF</label>
                      <input
                        type="text"
                        className="input-field"
                        maxLength={14}
                        value={editingPatient.cpf || ''}
                        onChange={e => setEditingPatient({ ...editingPatient, cpf: applyCpfMask(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Data de Nascimento</label>
                      <input
                        type="date"
                        className="input-field"
                        value={editingPatient.dataNascimento ? editingPatient.dataNascimento.split('T')[0] : ''}
                        onChange={e => setEditingPatient({ ...editingPatient, dataNascimento: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Sexo <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="input-field"
                        value={String(editingPatient.sexo) === '0' || editingPatient.sexo === 'Masculino' ? 'Masculino' : 'Feminino'}
                        onChange={e => setEditingPatient({ ...editingPatient, sexo: e.target.value })}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">Convênio <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="input-field"
                        value={editingPatient.convenio}
                        onChange={e => setEditingPatient({ ...editingPatient, convenio: parseInt(e.target.value) })}
                      >
                        {Object.entries(convenioMap).map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* — Profissão & Emergência — */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Profissão &amp; Contato de Emergência</p>
                    <div className="form-group">
                      <label className="input-label">Profissão</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Engenheiro, Professor..."
                        value={editingPatient.profissao || ''}
                        onChange={e => setEditingPatient({ ...editingPatient, profissao: e.target.value })}
                      />
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Nome do Contato de Emergência</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: Maria Silva"
                          value={editingPatient.nomeContatoEmergencia || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, nomeContatoEmergencia: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Telefone de Emergência</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          value={editingPatient.telefoneContatoEmergencia || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, telefoneContatoEmergencia: applyPhoneMask(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* — Endereço — */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Endereço Residencial</p>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Logradouro</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Rua, Av., Travessa..."
                          value={editingPatient.endereco?.logradouro || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, logradouro: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Número</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Ex: 123"
                          min={0}
                          value={editingPatient.endereco?.numero || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, numero: Number(e.target.value) } })}
                        />
                      </div>
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Complemento</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Apto, Bloco..."
                          value={editingPatient.endereco?.complemento || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, complemento: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Bairro</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: Centro"
                          value={editingPatient.endereco?.bairro || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, bairro: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label className="input-label">Cidade</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: São Paulo"
                          value={editingPatient.endereco?.cidade || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, cidade: e.target.value } })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Estado (UF)</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: SP"
                          maxLength={2}
                          value={editingPatient.endereco?.estado || ''}
                          onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, estado: e.target.value.toUpperCase() } })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="input-label">CEP</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="00000-000"
                        maxLength={9}
                        value={editingPatient.endereco?.cep || ''}
                        onChange={e => setEditingPatient({ ...editingPatient, endereco: { ...editingPatient.endereco!, cep: applyCepMask(e.target.value) } })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPatient(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Ficha de Anamnese */}
      {fichaAnamnese && (
        <div className="modal-overlay" onClick={() => setFichaAnamnese(null)}>
          <div className="modal-content" style={{ width: '85vw', maxWidth: '1200px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-row items-center gap-3">
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Ficha de Anamnese</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paciente: {fichaAnamnese.nomePaciente || 'Novo Registro'}</p>
                </div>
              </div>
              <button onClick={() => setFichaAnamnese(null)} className="action-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveAnamnese}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Tabs */}
                <div className="anamnese-tabs">
                  <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'geral' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('geral')}>Histórico Geral</button>
                  <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'habitos' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('habitos')}>Hábitos & Alergias</button>
                  <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'patologias' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('patologias')}>Condições Médicas</button>
                  <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'cardiovascular' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('cardiovascular')}>Cardio & Sangue</button>
                  <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'confirmacao' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('confirmacao')}>Sistemas & Confirmação</button>
                </div>

                {/* Tab: Geral */}
                {anamneseActiveTab === 'geral' && (
                  <div className="anamnese-grid">
                    {/* Tomando Medicamento */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Está tomando algum medicamento?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.tomandoAlgumMedicamento ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tomandoAlgumMedicamento: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.tomandoAlgumMedicamento ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tomandoAlgumMedicamento: false, quaisMedicamentos: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.tomandoAlgumMedicamento && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Quais medicamentos?" value={fichaAnamnese.quaisMedicamentos || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, quaisMedicamentos: e.target.value })} required />
                      )}
                    </div>

                    {/* Tratamento Médico */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Está sob tratamento médico atualmente?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.estaSobTratamentoMedico ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaSobTratamentoMedico: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.estaSobTratamentoMedico ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaSobTratamentoMedico: false, qualTratamentoMedico: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.estaSobTratamentoMedico && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual tratamento médico?" value={fichaAnamnese.qualTratamentoMedico || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualTratamentoMedico: e.target.value })} required />
                      )}
                    </div>

                    {/* Cirurgia 5 anos */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Fez alguma cirurgia nos últimos 5 anos?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.fezCirurgiaNosUltimosCincoAnos ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fezCirurgiaNosUltimosCincoAnos: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.fezCirurgiaNosUltimosCincoAnos ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fezCirurgiaNosUltimosCincoAnos: false, qualCirurgia: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.fezCirurgiaNosUltimosCincoAnos && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual cirurgia?" value={fichaAnamnese.qualCirurgia || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualCirurgia: e.target.value })} required />
                      )}
                    </div>

                    {/* Reação Anestesia */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Já teve reação adversa à anestesia dental?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.jaTeveReacaoAnestesiaDental ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTeveReacaoAnestesiaDental: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.jaTeveReacaoAnestesiaDental ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTeveReacaoAnestesiaDental: false, qualReacaoAnestesia: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.jaTeveReacaoAnestesiaDental && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual reação ocorreu?" value={fichaAnamnese.qualReacaoAnestesia || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualReacaoAnestesia: e.target.value })} required />
                      )}
                    </div>

                    {/* Tomou Penicilina */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Já tomou penicilina alguma vez?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.jaTomouPenicilina ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTomouPenicilina: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.jaTomouPenicilina ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTomouPenicilina: false })}>Não</button>
                        </div>
                      </div>
                    </div>

                    {/* Convulsões */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Já teve convulsões ou crises epilépticas?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.jaTeveConvulsoes ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTeveConvulsoes: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.jaTeveConvulsoes ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, jaTeveConvulsoes: false })}>Não</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Habitos */}
                {anamneseActiveTab === 'habitos' && (
                  <div className="anamnese-grid">
                    {/* Alergias */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Possui algum tipo de alergia?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.possuiAlergias ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiAlergias: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.possuiAlergias ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiAlergias: false, quaisAlergias: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.possuiAlergias && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Quais alergias possui? (ex: medicamentos, alimentos, látex)" value={fichaAnamnese.quaisAlergias || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, quaisAlergias: e.target.value })} required />
                      )}
                    </div>

                    {/* Bebida Alcoólica */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Faz uso frequente de bebida alcoólica?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.fazUsoBebidaAlcoolica ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fazUsoBebidaAlcoolica: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.fazUsoBebidaAlcoolica ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fazUsoBebidaAlcoolica: false })}>Não</button>
                        </div>
                      </div>
                    </div>

                    {/* Uso de Drogas */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Faz ou fez uso de substâncias entorpecentes/drogas?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.fazOuFezUsoDrogas ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fazOuFezUsoDrogas: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.fazOuFezUsoDrogas ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, fazOuFezUsoDrogas: false, quaisDrogas: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.fazOuFezUsoDrogas && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Quais substâncias?" value={fichaAnamnese.quaisDrogas || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, quaisDrogas: e.target.value })} required />
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Patologias */}
                {anamneseActiveTab === 'patologias' && (
                  <div className="anamnese-grid">
                    {/* Tipo PA */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Pressão Arterial</span>
                        <select className="input-field" style={{ width: '150px' }} value={fichaAnamnese.tipoPA} onChange={e => setFichaAnamnese({ ...fichaAnamnese, tipoPA: e.target.value })}>
                          <option value="Normal">Normal</option>
                          <option value="Alta">Alta</option>
                          <option value="Baixa">Baixa</option>
                          <option value={1}>Alta</option>
                          <option value={2}>Normal</option>
                          <option value={3}>Baixa</option>
                        </select>
                      </div>
                    </div>

                    {/* PA Controlada com Medicação */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">A Pressão Arterial é controlada por medicação?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.paControladaComMedicacao === true ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, paControladaComMedicacao: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${fichaAnamnese.paControladaComMedicacao === false ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, paControladaComMedicacao: false })}>Não</button>
                          <button type="button" className={`toggle-btn ${fichaAnamnese.paControladaComMedicacao === null ? 'active neutral' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, paControladaComMedicacao: null })}>N/A</button>
                        </div>
                      </div>
                    </div>

                    {/* Diabetes */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Tem diabetes?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.temDiabetes ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temDiabetes: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.temDiabetes ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temDiabetes: false })}>Não</button>
                        </div>
                      </div>
                    </div>

                    {/* Moléstia grave rins */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Sofreu ou sofre de moléstia grave nos Rins?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.sofreuOuSofreDeMolestiaGraveNosRins ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNosRins: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.sofreuOuSofreDeMolestiaGraveNosRins ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNosRins: false })}>Não</button>
                        </div>
                      </div>
                    </div>

                    {/* Moléstia grave fígado */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Sofreu ou sofre de moléstia grave no Fígado?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.sofreuOuSofreDeMolestiaGraveNoFigado ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNoFigado: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.sofreuOuSofreDeMolestiaGraveNoFigado ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNoFigado: false })}>Não</button>
                        </div>
                      </div>
                    </div>

                    {/* Disfunção Hepática */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Possui alguma disfunção hepática?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.possuiDisfuncaoHepatica ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiDisfuncaoHepatica: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.possuiDisfuncaoHepatica ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiDisfuncaoHepatica: false, qualDisfuncoesHepaticas: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.possuiDisfuncaoHepatica && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual disfunção hepática?" value={fichaAnamnese.qualDisfuncoesHepaticas || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualDisfuncoesHepaticas: e.target.value })} required />
                      )}
                    </div>

                    {/* Doença Infectocontagiosa */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">É portador de doença infectocontagiosa?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.portadorDoencaInfectoContagiosa ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, portadorDoencaInfectoContagiosa: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.portadorDoencaInfectoContagiosa ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, portadorDoencaInfectoContagiosa: false, qualDoencaInfectoContagiosa: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.portadorDoencaInfectoContagiosa && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual doença infectocontagiosa?" value={fichaAnamnese.qualDoencaInfectoContagiosa || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualDoencaInfectoContagiosa: e.target.value })} required />
                      )}
                    </div>

                    {/* Síndrome/Condição Genética/Neurológica/Autoimune/Metabólica */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Possui síndrome ou condição genética, neurológica, autoimune ou metabólica?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: false, qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual síndrome ou condição?" value={fichaAnamnese.qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: e.target.value })} required />
                      )}
                    </div>

                    {/* Precisa de Adaptação */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Precisa de alguma adaptação para o atendimento?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.precisaDeAdaptacao ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, precisaDeAdaptacao: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.precisaDeAdaptacao ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, precisaDeAdaptacao: false, qualAdaptacao: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.precisaDeAdaptacao && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual adaptação é necessária?" value={fichaAnamnese.qualAdaptacao || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualAdaptacao: e.target.value })} required />
                      )}
                    </div>

                    {/* Condição não citada */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label">Apresenta alguma outra condição médica importante não citada?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.apresentaAlgumaCondicaoNaoCitada ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, apresentaAlgumaCondicaoNaoCitada: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.apresentaAlgumaCondicaoNaoCitada ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, apresentaAlgumaCondicaoNaoCitada: false, qualCondicaoNaoCitada: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.apresentaAlgumaCondicaoNaoCitada && (
                        <input type="text" className="input-field anamnese-details-input" placeholder="Qual condição?" value={fichaAnamnese.qualCondicaoNaoCitada || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualCondicaoNaoCitada: e.target.value })} required />
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Cardiovascular & Sangue */}
                {anamneseActiveTab === 'cardiovascular' && (
                  <div className="anamnese-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {/* Cardiac Section */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui problemas cardíacos?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.temProblemaCardiaco ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temProblemaCardiaco: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.temProblemaCardiaco ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temProblemaCardiaco: false, condicoesCardiacas: [], qualProblemaCardiaco: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.temProblemaCardiaco && (
                        <div className="flex-col gap-2" style={{ marginTop: '8px', width: '100%' }}>
                          <input type="text" className="input-field" placeholder="Descreva o problema principal" value={fichaAnamnese.qualProblemaCardiaco || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualProblemaCardiaco: e.target.value })} required />
                          
                          <div className="sub-conditions-section">
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Selecione todas as condições cardíacas aplicáveis:</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
                              {[
                                { id: 1, label: 'Arritmia' },
                                { id: 2, label: 'Marca-passo' },
                                { id: 3, label: 'Stent' },
                                { id: 4, label: 'Prótese Cardíaca' },
                                { id: 5, label: 'Prolapso de Válvula' },
                                { id: 6, label: 'Hist. Endocardite Bacteriana' },
                                { id: 7, label: 'Infarto' },
                                { id: 8, label: 'Insuficiência Cardíaca' },
                                { id: 9, label: 'Outro' }
                              ].map(opt => {
                                const isChecked = fichaAnamnese.condicoesCardiacas.some(c => c.condicaoCardiaca === opt.id);
                                return (
                                  <div key={opt.id} className="sub-condition-row">
                                    <div className="sub-condition-header">
                                      <input
                                        type="checkbox"
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        checked={isChecked}
                                        onChange={e => handleCardiacConditionChange(opt.id as any, e.target.checked)}
                                      />
                                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                    </div>
                                    {opt.id === 9 && isChecked && (
                                      <div className="sub-condition-body">
                                        <input
                                          type="text"
                                          className="input-field"
                                          placeholder="Especificar outra condição"
                                          value={fichaAnamnese.condicoesCardiacas.find(c => c.condicaoCardiaca === 9)?.outraCondicao || ''}
                                          onChange={e => handleCardiacOutraChange(e.target.value)}
                                          required
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sanguine Section */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label" style={{ fontWeight: 600 }}>Apresenta facilidade de sangramento excessivo?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.tipoSangramento ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tipoSangramento: true })}>Sim</button>
                          <button type="button" className={`toggle-btn ${!fichaAnamnese.tipoSangramento ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tipoSangramento: false, doencasSanguineas: [], possuiSangramentoProlongado: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.tipoSangramento && (
                        <div className="sub-conditions-section" style={{ marginTop: '8px', width: '100%' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Selecione todas as alterações sanguíneas aplicáveis:</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '8px' }}>
                            {[
                              { id: 1, label: 'Anemia' },
                              { id: 2, label: 'Hemofilia' },
                              { id: 3, label: 'Leucemia' },
                              { id: 4, label: 'Alteração de Plaquetas' },
                              { id: 5, label: 'Distúrbio de Coagulação' },
                              { id: 6, label: 'Sangramento Frequente' },
                              { id: 7, label: 'Outro' }
                            ].map(opt => {
                              const isChecked = fichaAnamnese.doencasSanguineas.some(s => s.doencaSanguinea === opt.id);
                              const found = fichaAnamnese.doencasSanguineas.find(s => s.doencaSanguinea === opt.id);
                              return (
                                <div key={opt.id} className="sub-condition-row">
                                  <div className="sub-condition-header">
                                    <input
                                      type="checkbox"
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      checked={isChecked}
                                      onChange={e => handleSanguineaChange(opt.id as any, e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                  </div>
                                  {isChecked && opt.id === 7 && (
                                    <div className="sub-condition-body">
                                      <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Especificar outra alteração"
                                        value={found?.outrasDoencasSanguineas || ''}
                                        onChange={e => handleSanguineaOutraChange(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex-row items-center justify-between" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Apresenta sangramento prolongado ou de difícil controle?</span>
                            <div className="toggle-group">
                              <button type="button" className={`toggle-btn ${fichaAnamnese.possuiSangramentoProlongado === true ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSangramentoProlongado: true })}>Sim</button>
                              <button type="button" className={`toggle-btn ${fichaAnamnese.possuiSangramentoProlongado === false ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSangramentoProlongado: false })}>Não</button>
                              <button type="button" className={`toggle-btn ${fichaAnamnese.possuiSangramentoProlongado === null ? 'active neutral' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSangramentoProlongado: null })}>N/A</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Sistemas & Confirmação */}
                {anamneseActiveTab === 'confirmacao' && (
                  <div className="anamnese-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {/* Respiratory Section */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui problemas respiratórios? (ex: Asma, Bronquite)</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.condicoesRespiratorias.length > 0 ? 'active yes' : ''}`} onClick={() => {
                            if (fichaAnamnese.condicoesRespiratorias.length === 0) {
                              setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: [{ condicaoRespiratoria: 1, outraCondicao: null }] });
                            }
                          }}>Sim</button>
                          <button type="button" className={`toggle-btn ${fichaAnamnese.condicoesRespiratorias.length === 0 ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: [], bombinhaMedicacaoControle: null })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.condicoesRespiratorias.length > 0 && (
                        <div className="sub-conditions-section" style={{ marginTop: '8px', width: '100%' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Selecione todas as condições respiratórias aplicáveis:</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '8px' }}>
                            {[
                              { id: 1, label: 'Asma' },
                              { id: 2, label: 'Bronquite' },
                              { id: 3, label: 'DPOC / Enfisema' },
                              { id: 4, label: 'Rinite / Sinusite' },
                              { id: 5, label: 'Tuberculose' },
                              { id: 6, label: 'Outro' }
                            ].map(opt => {
                              const isChecked = fichaAnamnese.condicoesRespiratorias.some(r => r.condicaoRespiratoria === opt.id);
                              const found = fichaAnamnese.condicoesRespiratorias.find(r => r.condicaoRespiratoria === opt.id);
                              return (
                                <div key={opt.id} className="sub-condition-row">
                                  <div className="sub-condition-header">
                                    <input
                                      type="checkbox"
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      checked={isChecked}
                                      onChange={e => handleRespiratoriaChange(opt.id as any, e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                  </div>
                                  {isChecked && opt.id === 6 && (
                                    <div className="sub-condition-body">
                                      <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Especificar outra condição"
                                        value={found?.outraCondicao || ''}
                                        onChange={e => handleRespiratoriaOutraChange(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex-row items-center justify-between" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Faz uso de bombinha ou medicação de controle para problemas respiratórios?</span>
                            <div className="toggle-group">
                              <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === true ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: true })}>Sim</button>
                              <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === false ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: false })}>Não</button>
                              <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === null ? 'active neutral' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: null })}>N/A</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deficiencies Section */}
                    <div className="anamnese-question-row">
                      <div className="anamnese-controls">
                        <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui deficiência ou necessidade especial?</span>
                        <div className="toggle-group">
                          <button type="button" className={`toggle-btn ${fichaAnamnese.deficiencias.length > 0 ? 'active yes' : ''}`} onClick={() => {
                            if (fichaAnamnese.deficiencias.length === 0) {
                              setFichaAnamnese({ ...fichaAnamnese, deficiencias: [{ deficienciaNecessidadeEspecial: 1, outraDeficiencia: null }] });
                            }
                          }}>Sim</button>
                          <button type="button" className={`toggle-btn ${fichaAnamnese.deficiencias.length === 0 ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, deficiencias: [] })}>Não</button>
                        </div>
                      </div>
                      {fichaAnamnese.deficiencias.length > 0 && (
                        <div className="sub-conditions-section" style={{ marginTop: '8px', width: '100%' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Selecione todas as deficiências aplicáveis:</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
                            {[
                              { id: 1, label: 'Física / Motora' },
                              { id: 2, label: 'Auditiva' },
                              { id: 3, label: 'Visual' },
                              { id: 4, label: 'Intelectual' },
                              { id: 5, label: 'Múltipla' },
                              { id: 6, label: 'Outro' }
                            ].map(opt => {
                              const isChecked = fichaAnamnese.deficiencias.some(d => d.deficienciaNecessidadeEspecial === opt.id);
                              return (
                                <div key={opt.id} className="sub-condition-row">
                                  <div className="sub-condition-header">
                                    <input
                                      type="checkbox"
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      checked={isChecked}
                                      onChange={e => handleDeficienciaChange(opt.id as any, e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                  </div>
                                  {opt.id === 6 && isChecked && (
                                    <div className="sub-condition-body">
                                      <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Especificar outra deficiência"
                                        value={fichaAnamnese.deficiencias.find(d => d.deficienciaNecessidadeEspecial === 6)?.outraDeficiencia || ''}
                                        onChange={e => handleDeficienciaOutraChange(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gestação (Condicional ao sexo feminino) */}
                    {(patients.find(p => p.id === fichaAnamnese.pacienteId)?.sexo === 'Feminino' || 
                      String(patients.find(p => p.id === fichaAnamnese.pacienteId)?.sexo) === '1') && (
                      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(236, 72, 153, 0.03)', border: '1px solid rgba(236, 72, 153, 0.15)', borderRadius: '12px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#db2777', display: 'block', marginBottom: '16px' }}>Gestação & Lactação</span>
                        <div className="grid-cols-2" style={{ gap: '20px' }}>
                          <div className="anamnese-question-row" style={{ background: 'var(--bg-main)' }}>
                            <div className="anamnese-controls">
                              <span className="anamnese-label">Está grávida?</span>
                              <div className="toggle-group">
                                <button type="button" className={`toggle-btn ${fichaAnamnese.estaGravida ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaGravida: true })}>Sim</button>
                                <button type="button" className={`toggle-btn ${!fichaAnamnese.estaGravida ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaGravida: false, gravidaHaQuantasSemanas: null })}>Não</button>
                              </div>
                            </div>
                            {fichaAnamnese.estaGravida && (
                              <input type="text" className="input-field anamnese-details-input" placeholder="Grávida há quantas semanas?" value={fichaAnamnese.gravidaHaQuantasSemanas || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, gravidaHaQuantasSemanas: e.target.value })} required />
                            )}
                          </div>

                          <div className="anamnese-question-row" style={{ background: 'var(--bg-main)' }}>
                            <div className="anamnese-controls">
                              <span className="anamnese-label">Está amamentando?</span>
                              <div className="toggle-group">
                                <button type="button" className={`toggle-btn ${fichaAnamnese.estaAmamentando ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaAmamentando: true })}>Sim</button>
                                <button type="button" className={`toggle-btn ${!fichaAnamnese.estaAmamentando ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, estaAmamentando: false })}>Não</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Confirmação e Declaração */}
                    <div className="glass-panel" style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '12px', marginTop: '12px' }}>
                      <div className="flex-row items-start gap-3">
                        <input
                          type="checkbox"
                          id="confirmouDeclaracao"
                          style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }}
                          checked={fichaAnamnese.confirmouDeclaracao}
                          onChange={e => setFichaAnamnese({ ...fichaAnamnese, confirmouDeclaracao: e.target.checked })}
                          required
                        />
                        <label htmlFor="confirmouDeclaracao" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer', lineHeight: '1.4' }}>
                          Confirmo e declaro sob as penas da lei que todas as informações prestadas acima são verdadeiras e completas.
                        </label>
                      </div>
                      {fichaAnamnese.confirmouDeclaracao && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '12px' }}>
                          Confirmado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFichaAnamnese(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão Financeira */}
      {selectedPatientForFinance && (
        <div className="modal-overlay" onClick={() => { setSelectedPatientForFinance(null); setIsAddingPayment(false); }}>
          <div className="modal-content" style={{ width: '90vw', maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-row items-center gap-3">
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--success)' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Gestão Financeira</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paciente: {selectedPatientForFinance.nome}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedPatientForFinance(null); setIsAddingPayment(false); }} className="action-btn">
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Histórico de Pagamentos</h3>
                {!isAddingPayment && (
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setIsAddingPayment(true)}>
                    <Plus size={16} /> Novo Pagamento
                  </button>
                )}
              </div>

              {isAddingPayment && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1rem' }}>Registrar Novo Pagamento</h4>
                  <form onSubmit={handleCreatePayment}>
                    <div className="grid-cols-3 gap-4">
                      <div className="form-group">
                        <label className="input-label">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input-field"
                          placeholder="0,00"
                          value={newPayment.valor}
                          onChange={e => setNewPaymentData({ ...newPayment, valor: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Data de Vencimento</label>
                        <input
                          type="date"
                          className="input-field"
                          value={newPayment.dataVencimento}
                          onChange={e => setNewPaymentData({ ...newPayment, dataVencimento: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Forma de Pagamento</label>
                        <select
                          className="input-field"
                          value={newPayment.formaPagamento}
                          onChange={e => setNewPaymentData({ ...newPayment, formaPagamento: parseInt(e.target.value) })}
                        >
                          <option value={FormaPagamentoEnum.PIX}>PIX</option>
                          <option value={FormaPagamentoEnum.Debito}>Débito</option>
                          <option value={FormaPagamentoEnum.Credito}>Crédito</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="input-label">Observação</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: referente ao clareamento"
                        value={newPayment.observacao}
                        onChange={e => setNewPaymentData({ ...newPayment, observacao: e.target.value })}
                      />
                    </div>
                    <div className="flex-row gap-3" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setIsAddingPayment(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Confirmar Lançamento'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>Forma</th>
                      <th>Status</th>
                      <th>Obs.</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFinanceLoading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>Carregando...</td>
                      </tr>
                    ) : financePayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum pagamento registrado.</td>
                      </tr>
                    ) : financePayments.map(payment => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.dataVencimento).toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600 }}>R$ {payment.valor.toFixed(2)}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                            {payment.formaPagamento}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${payment.statusPagamento === 'Pago' ? 'badge-success' :
                            payment.statusPagamento === 'Cancelado' ? 'badge-danger' :
                              'badge-warning'
                            }`}>
                            {payment.statusPagamento}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{payment.observacao || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex-row gap-2 justify-end">
                            {payment.statusPagamento === 'Pendente' && (
                              <>
                                <button
                                  className="action-btn success"
                                  title="Marcar como Pago"
                                  onClick={() => handleMarkAsPaid(payment.id)}
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  className="action-btn warning"
                                  title="Cancelar Pagamento"
                                  onClick={() => handleCancelPayment(payment.id)}
                                >
                                  <Ban size={18} />
                                </button>
                              </>
                            )}
                            <button
                              className="action-btn danger"
                              title="Excluir Registro"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
