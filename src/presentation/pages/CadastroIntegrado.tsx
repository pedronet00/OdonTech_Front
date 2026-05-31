import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Clock, User, Home, ClipboardList, CheckCircle2, 
  AlertTriangle, Save, ArrowRight, ArrowLeft, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../infrastructure/config/api';
import { applyCpfMask, applyPhoneMask, applyCepMask } from '../../utils/masks';
import './CadastroIntegrado.css';

// Mapping for conveniences
const convenioMap: { [key: number]: string } = {
  1: 'Unimed', 2: 'Bradesco', 3: 'Amil', 4: 'SulAmerica', 5: 'OesteSaude',
  6: 'Athia', 7: 'SUS', 8: 'Particular', 9: 'Outros'
};

interface MetadataResponse {
  id: string;
  clinicaId: string;
  dataExpiracao: string;
  pacienteId: string | null;
  tipoCadastro: 'SomenteAnamnese' | 'PacienteMaisAnamnese';
}

export function CadastroIntegrado() {
  const { guid } = useParams<{ guid: string }>();
  
  // Page states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Registration metadata
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  
  // Expiration countdown states
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Wizard state: 
  // 1: Dados Pessoais
  // 2: Endereço Residencial
  // 3: Ficha de Anamnese (Se tipoCadastro === "PacienteMaisAnamnese")
  const [currentStep, setCurrentStep] = useState(1);
  const [anamneseActiveTab, setAnamneseActiveTab] = useState<'geral' | 'habitos' | 'patologias' | 'cardiovascular' | 'confirmacao'>('geral');

  // Patient Form State
  const [patientData, setPatientData] = useState({
    nome: '',
    email: '',
    cpf: '',
    dataNascimento: '',
    sexo: 1, // 0 = Masculino, 1 = Feminino
    convenio: 1,
    telefone: '',
    profissao: '',
    nomeContatoEmergencia: '',
    telefoneContatoEmergencia: '',
    endereco: {
      logradouro: '',
      numero: 1,
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    }
  });

  // Anamnese Form State
  const [fichaAnamnese, setFichaAnamnese] = useState({
    apresentaAlgumaCondicaoNaoCitada: false,
    qualCondicaoNaoCitada: null as string | null,
    confirmouDeclaracao: false,
    estaAmamentando: false,
    estaGravida: false,
    gravidaHaQuantasSemanas: null as string | null,
    estaSobTratamentoMedico: false,
    qualTratamentoMedico: null as string | null,
    fazOuFezUsoDrogas: false,
    quaisDrogas: null as string | null,
    fazUsoBebidaAlcoolica: false,
    fezCirurgiaNosUltimosCincoAnos: false,
    qualCirurgia: null as string | null,
    jaTomouPenicilina: false,
    jaTeveConvulsoes: false,
    jaTeveReacaoAnestesiaDental: false,
    qualReacaoAnestesia: null as string | null,
    paControladaComMedicacao: null as boolean | null,
    portadorDoencaInfectoContagiosa: false,
    qualDoencaInfectoContagiosa: null as string | null,
    possuiAlergias: false,
    quaisAlergias: null as string | null,
    possuiDisfuncaoHepatica: false,
    qualDisfuncoesHepaticas: null as string | null,
    possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: false,
    qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: null as string | null,
    precisaDeAdaptacao: false,
    qualAdaptacao: null as string | null,
    sofreuOuSofreDeMolestiaGraveNoFigado: false,
    sofreuOuSofreDeMolestiaGraveNosRins: false,
    temDiabetes: false,
    temProblemaCardiaco: false,
    qualProblemaCardiaco: null as string | null,
    tipoSangramento: false,
    tipoPA: 0, // 0 = Normal, 1 = Alta, 2 = Baixa
    tomandoAlgumMedicamento: false,
    quaisMedicamentos: null as string | null,
    bombinhaMedicacaoControle: null as boolean | null,
    possuiSangramentoProlongado: null as boolean | null,
    outrasCondicoesCardiacas: null as string | null,
    outrasCondicoesRespiratorias: null as string | null,
    outrasDeficienciasNecessidades: null as string | null,
    outrasDoencasSanguineas: null as string | null,
    condicoesCardiacas: [] as { condicaoCardiaca: number }[],
    condicoesRespiratorias: [] as { condicaoRespiratoria: number }[],
    deficiencias: [] as { deficienciaNecessidadeEspecial: number }[],
    doencasSanguineas: [] as { doencaSanguinea: number }[]
  });

  // Base integration endpoint builder
  const BASE_INTEGRATION_URL = API_BASE_URL.replace('/v1', '');

  // Load registration metadados
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!guid) {
        setErrorMsg('GUID de cadastro inválido ou ausente.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${BASE_INTEGRATION_URL}/CadastroIntegrado/${guid}`);
        const result = await res.json();
        
        if (!res.ok || !result.isSuccess) {
          throw new Error(result.errors?.[0]?.message || 'Falha ao buscar dados de cadastro.');
        }
        
        const data: MetadataResponse = result.data;
        setMetadata(data);
        if (data.tipoCadastro === 'SomenteAnamnese') {
          setCurrentStep(3);
        }
        
        // Calculate remaining seconds
        const now = new Date().getTime();
        const exp = new Date(data.dataExpiracao).getTime();
        const diff = exp - now;

        if (diff <= 0) {
          setIsExpired(true);
        } else {
          setRemainingSeconds(Math.floor(diff / 1000));
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Erro de conexão ao servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [guid]);

  // Countdown timer logic
  useEffect(() => {
    if (!metadata || isExpired) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(metadata.dataExpiracao).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setRemainingSeconds(0);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setRemainingSeconds(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [metadata, isExpired]);

  // Format remaining time
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (remainingSeconds > 300) return 'timer-normal';
    if (remainingSeconds > 60) return 'timer-warning';
    return 'timer-critical';
  };

  // Validators & Handlers
  const validateEndereco = () => {
    const end = patientData.endereco;
    const logradouro = end.logradouro.trim();
    const numero = end.numero;
    const complemento = end.complemento.trim() || null;
    const bairro = end.bairro.trim();
    const cidade = end.cidade.trim();
    const estado = end.estado.trim().toUpperCase();
    const cep = end.cep.trim();

    const hasAnyField = !!(logradouro || numero !== 1 || complemento || bairro || cidade || estado || cep);
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
      "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
      "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
      "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
    ]);
    if (!UfsValidas.has(estado)) {
      toast.error(`Estado (UF) inválido: '${end.estado}'.`);
      return { isValid: false, data: null };
    }

    const apenasDigitos = cep.replace(/\D/g, '');
    if (apenasDigitos.length !== 8) {
      toast.error('CEP inválido. Deve conter 8 dígitos.');
      return { isValid: false, data: null };
    }

    return {
      isValid: true,
      data: {
        logradouro,
        numero: Number(numero),
        complemento,
        bairro,
        cidade,
        estado,
        cep: `${apenasDigitos.substring(0, 5)}-${apenasDigitos.substring(5)}`,
        formatado: null
      }
    };
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!patientData.nome.trim()) {
        toast.error('O nome completo é obrigatório.');
        return;
      }
      if (!patientData.telefone.trim()) {
        toast.error('O telefone é obrigatório.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const addressValidation = validateEndereco();
      if (!addressValidation.isValid) return;

      if (metadata?.tipoCadastro === 'PacienteMaisAnamnese' || metadata?.tipoCadastro === 'SomenteAnamnese') {
        setCurrentStep(3);
      } else {
        handleSubmitForm(addressValidation.data);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 3) {
      const tabsOrder: ('geral' | 'habitos' | 'patologias' | 'cardiovascular' | 'confirmacao')[] = ['geral', 'habitos', 'patologias', 'cardiovascular', 'confirmacao'];
      const currentIdx = tabsOrder.indexOf(anamneseActiveTab);
      if (currentIdx > 0) {
        setAnamneseActiveTab(tabsOrder[currentIdx - 1]);
        return;
      }
    }

    if (metadata?.tipoCadastro === 'SomenteAnamnese') {
      return;
    }

    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit complete form
  const handleSubmitForm = async (validatedAddress: any = null) => {
    if (isExpired) {
      toast.error('O tempo limite expirou. Não é possível enviar o formulário.');
      return;
    }

    setSubmitting(true);
    try {
      const sanitize = (val: string) => (val && val.trim() !== '') ? val.trim() : null;

      let targetPatientId = '';

      if (metadata?.tipoCadastro === 'SomenteAnamnese') {
        if (!metadata.pacienteId) {
          throw new Error('Paciente associado não encontrado nos metadados de cadastro.');
        }
        targetPatientId = metadata.pacienteId;
      } else {
        // 1. Submit Patient data
        const patientPayload = {
          nome: patientData.nome,
          email: sanitize(patientData.email),
          cpf: sanitize(patientData.cpf),
          dataNascimento: sanitize(patientData.dataNascimento),
          sexo: Number(patientData.sexo),
          convenio: Number(patientData.convenio),
          telefone: patientData.telefone,
          endereco: validatedAddress,
          profissao: sanitize(patientData.profissao),
          nomeContatoEmergencia: sanitize(patientData.nomeContatoEmergencia),
          telefoneContatoEmergencia: sanitize(patientData.telefoneContatoEmergencia),
          clinicaId: metadata?.clinicaId || ""
        };

        const patientRes = await fetch(`${BASE_INTEGRATION_URL}/CadastroIntegrado/${guid}/paciente`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientPayload)
        });
        const patientResult = await patientRes.json();

        if (!patientRes.ok || !patientResult.isSuccess) {
          throw new Error(patientResult.errors?.[0]?.message || 'Falha ao cadastrar os dados do paciente.');
        }

        // Extract Patient ID from API response
        const createdPatientId = patientResult.data?.id || patientResult.data;
        if (!createdPatientId) {
          throw new Error('Falha crítica: ID do paciente não foi retornado pelo servidor.');
        }
        targetPatientId = createdPatientId;
      }

      // 2. Submit Anamnese if required
      if (metadata?.tipoCadastro === 'PacienteMaisAnamnese' || metadata?.tipoCadastro === 'SomenteAnamnese') {
        if (!fichaAnamnese.confirmouDeclaracao) {
          throw new Error('Você precisa ler e marcar a declaração de confirmação no fim da anamnese.');
        }

        const anamnesePayload = {
          pacienteId: targetPatientId,
          apresentaAlgumaCondicaoNaoCitada: fichaAnamnese.apresentaAlgumaCondicaoNaoCitada,
          qualCondicaoNaoCitada: fichaAnamnese.apresentaAlgumaCondicaoNaoCitada ? sanitize(fichaAnamnese.qualCondicaoNaoCitada || '') : null,
          confirmouDeclaracao: true,
          estaAmamentando: fichaAnamnese.estaAmamentando,
          estaGravida: fichaAnamnese.estaGravida,
          gravidaHaQuantasSemanas: fichaAnamnese.estaGravida ? sanitize(fichaAnamnese.gravidaHaQuantasSemanas || '') : null,
          estaSobTratamentoMedico: fichaAnamnese.estaSobTratamentoMedico,
          qualTratamentoMedico: fichaAnamnese.estaSobTratamentoMedico ? sanitize(fichaAnamnese.qualTratamentoMedico || '') : null,
          fazOuFezUsoDrogas: fichaAnamnese.fazOuFezUsoDrogas,
          quaisDrogas: fichaAnamnese.fazOuFezUsoDrogas ? sanitize(fichaAnamnese.quaisDrogas || '') : null,
          fazUsoBebidaAlcoolica: fichaAnamnese.fazUsoBebidaAlcoolica,
          fezCirurgiaNosUltimosCincoAnos: fichaAnamnese.fezCirurgiaNosUltimosCincoAnos,
          qualCirurgia: fichaAnamnese.fezCirurgiaNosUltimosCincoAnos ? sanitize(fichaAnamnese.qualCirurgia || '') : null,
          jaTomouPenicilina: fichaAnamnese.jaTomouPenicilina,
          jaTeveConvulsoes: fichaAnamnese.jaTeveConvulsoes,
          jaTeveReacaoAnestesiaDental: fichaAnamnese.jaTeveReacaoAnestesiaDental,
          qualReacaoAnestesia: fichaAnamnese.jaTeveReacaoAnestesiaDental ? sanitize(fichaAnamnese.qualReacaoAnestesia || '') : null,
          paControladaComMedicacao: fichaAnamnese.paControladaComMedicacao,
          portadorDoencaInfectoContagiosa: fichaAnamnese.portadorDoencaInfectoContagiosa,
          qualDoencaInfectoContagiosa: fichaAnamnese.portadorDoencaInfectoContagiosa ? sanitize(fichaAnamnese.qualDoencaInfectoContagiosa || '') : null,
          possuiAlergias: fichaAnamnese.possuiAlergias,
          quaisAlergias: fichaAnamnese.possuiAlergias ? sanitize(fichaAnamnese.quaisAlergias || '') : null,
          possuiDisfuncaoHepatica: fichaAnamnese.possuiDisfuncaoHepatica,
          qualDisfuncoesHepaticas: fichaAnamnese.possuiDisfuncaoHepatica ? sanitize(fichaAnamnese.qualDisfuncoesHepaticas || '') : null,
          possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica,
          qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica ? sanitize(fichaAnamnese.qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica || '') : null,
          precisaDeAdaptacao: fichaAnamnese.precisaDeAdaptacao,
          qualAdaptacao: fichaAnamnese.precisaDeAdaptacao ? sanitize(fichaAnamnese.qualAdaptacao || '') : null,
          sofreuOuSofreDeMolestiaGraveNoFigado: fichaAnamnese.sofreuOuSofreDeMolestiaGraveNoFigado,
          sofreuOuSofreDeMolestiaGraveNosRins: fichaAnamnese.sofreuOuSofreDeMolestiaGraveNosRins,
          temDiabetes: fichaAnamnese.temDiabetes,
          temProblemaCardiaco: fichaAnamnese.temProblemaCardiaco,
          qualProblemaCardiaco: fichaAnamnese.temProblemaCardiaco ? sanitize(fichaAnamnese.qualProblemaCardiaco || '') : null,
          tipoSangramento: fichaAnamnese.tipoSangramento,
          tipoPA: Number(fichaAnamnese.tipoPA),
          tomandoAlgumMedicamento: fichaAnamnese.tomandoAlgumMedicamento,
          quaisMedicamentos: fichaAnamnese.tomandoAlgumMedicamento ? sanitize(fichaAnamnese.quaisMedicamentos || '') : null,
          bombinhaMedicacaoControle: fichaAnamnese.bombinhaMedicacaoControle,
          possuiSangramentoProlongado: fichaAnamnese.possuiSangramentoProlongado,
          outrasCondicoesCardiacas: fichaAnamnese.outrasCondicoesCardiacas,
          outrasCondicoesRespiratorias: fichaAnamnese.outrasCondicoesRespiratorias,
          outrasDeficienciasNecessidades: fichaAnamnese.outrasDeficienciasNecessidades,
          outrasDoencasSanguineas: fichaAnamnese.outrasDoencasSanguineas,
          
          condicoesCardiacas: fichaAnamnese.condicoesCardiacas.map(c => ({
            condicaoCardiaca: c.condicaoCardiaca,
            outraCondicao: c.condicaoCardiaca === 9 ? fichaAnamnese.outrasCondicoesCardiacas : null
          })),
          condicoesRespiratorias: fichaAnamnese.condicoesRespiratorias.map(r => ({
            condicaoRespiratoria: r.condicaoRespiratoria,
            outraCondicao: r.condicaoRespiratoria === 6 ? fichaAnamnese.outrasCondicoesRespiratorias : null,
            bombinhaMedicacaoControle: fichaAnamnese.bombinhaMedicacaoControle
          })),
          deficiencias: fichaAnamnese.deficiencias.map(d => ({
            deficienciaNecessidadeEspecial: d.deficienciaNecessidadeEspecial,
            outraDeficiencia: d.deficienciaNecessidadeEspecial === 6 ? fichaAnamnese.outrasDeficienciasNecessidades : null
          })),
          doencasSanguineas: fichaAnamnese.doencasSanguineas.map(s => ({
            doencaSanguinea: s.doencaSanguinea,
            outrasDoencasSanguineas: s.doencaSanguinea === 7 ? fichaAnamnese.outrasDoencasSanguineas : null,
            possuiSangramentoProlongado: fichaAnamnese.possuiSangramentoProlongado
          }))
        };

        const anamneseRes = await fetch(`${BASE_INTEGRATION_URL}/CadastroIntegrado/${guid}/anamnese`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(anamnesePayload)
        });
        const anamneseResult = await anamneseRes.json();

        if (!anamneseRes.ok || !anamneseResult.isSuccess) {
          throw new Error(anamneseResult.errors?.[0]?.message || 'Erro ao cadastrar a ficha de anamnese.');
        }
      }

      setSuccess(true);
      toast.success('Cadastro integrado realizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ocorreu um erro no processamento do cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auxiliary check box handlers for Anamnese
  const handleCardiacConditionChange = (condicao: number, checked: boolean) => {
    let newList = [...fichaAnamnese.condicoesCardiacas];
    if (checked) {
      if (!newList.some(c => c.condicaoCardiaca === condicao)) {
        newList.push({ condicaoCardiaca: condicao });
      }
    } else {
      newList = newList.filter(c => c.condicaoCardiaca !== condicao);
    }
    setFichaAnamnese(prev => ({
      ...prev,
      condicoesCardiacas: newList,
      outrasCondicoesCardiacas: condicao === 9 && !checked ? null : prev.outrasCondicoesCardiacas
    }));
  };

  const handleRespiratoriaChange = (condicao: number, checked: boolean) => {
    let newList = [...fichaAnamnese.condicoesRespiratorias];
    if (checked) {
      if (!newList.some(r => r.condicaoRespiratoria === condicao)) {
        newList.push({ condicaoRespiratoria: condicao });
      }
    } else {
      newList = newList.filter(r => r.condicaoRespiratoria !== condicao);
    }
    setFichaAnamnese(prev => ({
      ...prev,
      condicoesRespiratorias: newList,
      outrasCondicoesRespiratorias: condicao === 6 && !checked ? null : prev.outrasCondicoesRespiratorias
    }));
  };

  const handleDeficienciaChange = (def: number, checked: boolean) => {
    let newList = [...fichaAnamnese.deficiencias];
    if (checked) {
      if (!newList.some(d => d.deficienciaNecessidadeEspecial === def)) {
        newList.push({ deficienciaNecessidadeEspecial: def });
      }
    } else {
      newList = newList.filter(d => d.deficienciaNecessidadeEspecial !== def);
    }
    setFichaAnamnese(prev => ({
      ...prev,
      deficiencias: newList,
      outrasDeficienciasNecessidades: def === 6 && !checked ? null : prev.outrasDeficienciasNecessidades
    }));
  };

  const handleSanguineaChange = (doenca: number, checked: boolean) => {
    let newList = [...fichaAnamnese.doencasSanguineas];
    if (checked) {
      if (!newList.some(s => s.doencaSanguinea === doenca)) {
        newList.push({ doencaSanguinea: doenca });
      }
    } else {
      newList = newList.filter(s => s.doencaSanguinea !== doenca);
    }
    setFichaAnamnese(prev => ({
      ...prev,
      doencasSanguineas: newList,
      outrasDoencasSanguineas: doenca === 7 && !checked ? null : prev.outrasDoencasSanguineas
    }));
  };

  // Rendering Views
  if (loading) {
    return (
      <div className="public-layout items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid var(--border-light)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Carregando dados da clínica...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="public-layout items-center justify-center">
        <div className="expired-container">
          <div className="expired-circle">
            <AlertTriangle size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Erro ao Acessar</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>{errorMsg}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Se você acha que isso é um engano, solicite um novo link à clínica responsável.
          </p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="public-layout items-center justify-center">
        <div className="expired-container">
          <div className="expired-circle">
            <ShieldAlert size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Tempo Limite Expirado</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            O link de preenchimento deste formulário expirou por motivos de segurança.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Entre em contato com a clínica para obter um novo link de acesso rápido.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="public-layout items-center justify-center animate-fade-in">
        <div className="success-container">
          <div className="success-circle">
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '12px', color: 'var(--text-main)' }}>Cadastro Concluído!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Seus dados e informações de anamnese foram registrados com sucesso. A clínica já foi notificada.
          </p>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', width: '100%', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Agradecemos a colaboração! Você já pode fechar esta aba com segurança.
          </div>
        </div>
      </div>
    );
  }

  const isAnamnese = metadata?.tipoCadastro === 'PacienteMaisAnamnese' || metadata?.tipoCadastro === 'SomenteAnamnese';
  const totalSteps = isAnamnese ? 3 : 2;
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="public-layout">
      {/* Header */}
      <div className="public-header">
        <div className="flex-row items-center gap-3">
          <img src="/logo.png" alt="OdonTech Logo" className="public-logo" />
          <div className="mobile-hide">
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>OdonTech</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Preenchimento de Ficha Cadastral</p>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {metadata?.tipoCadastro === 'SomenteAnamnese' ? 'Ficha de Anamnese' : 'Paciente & Anamnese'}
        </div>
      </div>

      <div className="public-content-container">
        {/* Sticky Timer Banner */}
        <div className={`timer-banner ${getTimerClass()}`}>
          <div className="flex-row items-center gap-2">
            <Clock size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tempo restante para envio:</span>
          </div>
          <div className="timer-clock">
            {formatTime(remainingSeconds)}
          </div>
        </div>

        {/* Wizard Progress Bar */}
        {metadata?.tipoCadastro !== 'SomenteAnamnese' && (
          <div className="step-indicator-bar">
            <div className="step-indicator-bar-progress" style={{ width: `${progressPercent}%` }}></div>
            
            <div className="step-dot-container">
              <div className={`step-dot ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                {currentStep > 1 ? <CheckCircle2 size={16} /> : '1'}
              </div>
              <span className={`step-label ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                Identificação
              </span>
            </div>

            <div className="step-dot-container">
              <div className={`step-dot ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                {currentStep > 2 ? <CheckCircle2 size={16} /> : '2'}
              </div>
              <span className={`step-label ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                Endereço
              </span>
            </div>

            {isAnamnese && (
              <div className="step-dot-container">
                <div className={`step-dot ${currentStep === 3 ? 'active' : ''}`}>
                  3
                </div>
                <span className={`step-label ${currentStep === 3 ? 'active' : ''}`}>
                  Saúde / Anamnese
                </span>
              </div>
            )}
          </div>
        )}

        {/* Forms steps */}
        <form onSubmit={handleNextStep}>
          
          {/* STEP 1: Personal Data */}
          {currentStep === 1 && (
            <div className="form-card animate-fade-in">
              <h2 className="form-section-title">
                <User size={20} style={{ color: 'var(--primary)' }} /> Dados Pessoais
              </h2>
              
              <div className="form-group-container">
                <div className="form-group">
                  <label className="input-label">Nome Completo <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Seu nome completo"
                    maxLength={100}
                    value={patientData.nome}
                    onChange={e => setPatientData({ ...patientData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="input-label">E-mail</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="exemplo@email.com"
                      maxLength={100}
                      value={patientData.email}
                      onChange={e => setPatientData({ ...patientData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Telefone de Contato <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      value={patientData.telefone}
                      onChange={e => setPatientData({ ...patientData, telefone: applyPhoneMask(e.target.value) })}
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
                      value={patientData.cpf}
                      onChange={e => setPatientData({ ...patientData, cpf: applyCpfMask(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Data de Nascimento</label>
                    <input
                      type="date"
                      className="input-field"
                      value={patientData.dataNascimento}
                      onChange={e => setPatientData({ ...patientData, dataNascimento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="input-label">Sexo <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      className="input-field"
                      value={patientData.sexo}
                      onChange={e => setPatientData({ ...patientData, sexo: Number(e.target.value) })}
                    >
                      <option value={0}>Masculino</option>
                      <option value={1}>Feminino</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Convênio <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      className="input-field"
                      value={patientData.convenio}
                      onChange={e => setPatientData({ ...patientData, convenio: Number(e.target.value) })}
                    >
                      {Object.entries(convenioMap).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '8px' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Profissão &amp; Contato Emergencial</p>
                  
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="input-label">Profissão</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Sua ocupação principal"
                      value={patientData.profissao}
                      onChange={e => setPatientData({ ...patientData, profissao: e.target.value })}
                    />
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Nome do Contato de Emergência</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Pessoa a ser contatada em emergência"
                        value={patientData.nomeContatoEmergencia}
                        onChange={e => setPatientData({ ...patientData, nomeContatoEmergencia: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Telefone de Emergência</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        value={patientData.telefoneContatoEmergencia}
                        onChange={e => setPatientData({ ...patientData, telefoneContatoEmergencia: applyPhoneMask(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions-container">
                <div></div>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
                  Avançar para Endereço <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Address Data */}
          {currentStep === 2 && (
            <div className="form-card animate-fade-in">
              <h2 className="form-section-title">
                <Home size={20} style={{ color: 'var(--primary)' }} /> Endereço Residencial
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Preencha seu endereço. Caso prefira não informar, pode avançar sem preencher. Se começar a digitar, os campos obrigatórios serão requeridos.
              </p>

              <div className="form-group-container">
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="input-label">CEP</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="00000-000"
                      maxLength={9}
                      value={patientData.endereco.cep}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, cep: applyCepMask(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Logradouro (Rua, Av., etc.)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Rua, Av., Travessa..."
                      value={patientData.endereco.logradouro}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, logradouro: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="input-label">Número</label>
                    <input
                      type="number"
                      className="input-field"
                      min={1}
                      placeholder="123"
                      value={patientData.endereco.numero}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, numero: Math.max(1, Number(e.target.value)) }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Complemento</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Apto, Bloco, etc."
                      value={patientData.endereco.complemento}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, complemento: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="input-label">Bairro</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Bairro"
                      value={patientData.endereco.bairro}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, bairro: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Cidade</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Cidade"
                      value={patientData.endereco.cidade}
                      onChange={e => setPatientData({
                        ...patientData,
                        endereco: { ...patientData.endereco, cidade: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">Estado (UF)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="SP"
                    maxLength={2}
                    style={{ width: '120px' }}
                    value={patientData.endereco.estado}
                    onChange={e => setPatientData({
                      ...patientData,
                      endereco: { ...patientData.endereco, estado: e.target.value.toUpperCase() }
                    })}
                  />
                </div>
              </div>

              <div className="form-actions-container">
                <button type="button" className="btn btn-secondary" onClick={handlePrevStep} style={{ padding: '12px 24px' }}>
                  <ArrowLeft size={18} /> Voltar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
                  {isAnamnese ? (
                    <>Avançar para Anamnese <ArrowRight size={18} /></>
                  ) : (
                    <>Finalizar e Salvar <Save size={18} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Ficha de Anamnese (Se aplicável) */}
          {currentStep === 3 && isAnamnese && (
            <div className="form-card animate-fade-in" style={{ padding: '24px' }}>
              <h2 className="form-section-title">
                <ClipboardList size={20} style={{ color: 'var(--primary)' }} /> Ficha de Anamnese
              </h2>
              
              {/* Internal Tabs for Anamnese Sections */}
              <div className="anamnese-tabs" style={{ marginBottom: '24px' }}>
                <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'geral' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('geral')}>Geral</button>
                <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'habitos' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('habitos')}>Hábitos</button>
                <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'patologias' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('patologias')}>Patologias</button>
                <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'cardiovascular' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('cardiovascular')}>Cardio &amp; Sangue</button>
                <button type="button" className={`anamnese-tab-btn ${anamneseActiveTab === 'confirmacao' ? 'active' : ''}`} onClick={() => setAnamneseActiveTab('confirmacao')}>Sistemas &amp; Envio</button>
              </div>

              {/* Tab: Geral */}
              {anamneseActiveTab === 'geral' && (
                <div className="anamnese-grid animate-fade-in">
                  
                  {/* Tomando Medicamento */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Faz uso contínuo de medicamentos?</span>
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

              {/* Tab: Hábitos */}
              {anamneseActiveTab === 'habitos' && (
                <div className="anamnese-grid animate-fade-in">
                  
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
                      <input type="text" className="input-field anamnese-details-input" placeholder="Quais alergias possui? (ex: medicamentos, látex)" value={fichaAnamnese.quaisAlergias || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, quaisAlergias: e.target.value })} required />
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
                <div className="anamnese-grid animate-fade-in">
                  
                  {/* Tipo PA */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Pressão Arterial Normal</span>
                      <select className="input-field" style={{ width: '150px' }} value={fichaAnamnese.tipoPA} onChange={e => setFichaAnamnese({ ...fichaAnamnese, tipoPA: Number(e.target.value) })}>
                        <option value={0}>Normal</option>
                        <option value={1}>Alta</option>
                        <option value={2}>Baixa</option>
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

                  {/* Rins */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Sofreu ou sofre de moléstia grave nos Rins?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.sofreuOuSofreDeMolestiaGraveNosRins ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNosRins: true })}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.sofreuOuSofreDeMolestiaGraveNosRins ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, sofreuOuSofreDeMolestiaGraveNosRins: false })}>Não</button>
                      </div>
                    </div>
                  </div>

                  {/* Fígado */}
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

                  {/* Síndrome/Condição Genética/etc */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Possui síndrome ou condição neurológica/genética/autoimune?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: true })}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: false, qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: null })}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.possuiSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual condição?" value={fichaAnamnese.qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualSindromeCondicaoGeneticaNeurologicaAutoimuneMetabolica: e.target.value })} required />
                    )}
                  </div>

                  {/* Adaptação */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Necessita de alguma adaptação para o atendimento?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.precisaDeAdaptacao ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, precisaDeAdaptacao: true })}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.precisaDeAdaptacao ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, precisaDeAdaptacao: false, qualAdaptacao: null })}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.precisaDeAdaptacao && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual adaptação?" value={fichaAnamnese.qualAdaptacao || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualAdaptacao: e.target.value })} required />
                    )}
                  </div>

                  {/* Condição Não Citada */}
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

              {/* Tab: Cardio & Sangue */}
              {anamneseActiveTab === 'cardiovascular' && (
                <div className="anamnese-grid animate-fade-in" style={{ gridTemplateColumns: '1fr' }}>
                  
                  {/* Problema Cardíaco */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui problemas cardíacos?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.temProblemaCardiaco ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temProblemaCardiaco: true })}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.temProblemaCardiaco ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, temProblemaCardiaco: false, condicoesCardiacas: [], qualProblemaCardiaco: null })}>Não</button>
                      </div>
                    </div>
                    
                    {fichaAnamnese.temProblemaCardiaco && (
                      <div className="flex-col gap-2" style={{ marginTop: '12px', width: '100%' }}>
                        <input type="text" className="input-field" placeholder="Descreva o problema cardíaco" value={fichaAnamnese.qualProblemaCardiaco || ''} onChange={e => setFichaAnamnese({ ...fichaAnamnese, qualProblemaCardiaco: e.target.value })} required />
                        
                        <div className="sub-conditions-section">
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Selecione as condições aplicáveis:</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '10px' }}>
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
                                      onChange={e => handleCardiacConditionChange(opt.id, e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                  </div>
                                  {opt.id === 9 && isChecked && (
                                    <div className="sub-condition-body">
                                      <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Especificar outra condição"
                                        value={fichaAnamnese.outrasCondicoesCardiacas || ''}
                                        onChange={e => setFichaAnamnese({ ...fichaAnamnese, outrasCondicoesCardiacas: e.target.value })}
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

                  {/* Problema Sanguíneo */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui distúrbios ou alterações sanguíneas?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.tipoSangramento ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tipoSangramento: true })}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.tipoSangramento ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, tipoSangramento: false, doencasSanguineas: [], possuiSangramentoProlongado: null })}></button>
                      </div>
                    </div>

                    {fichaAnamnese.tipoSangramento && (
                      <div className="sub-conditions-section" style={{ width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Selecione as alterações aplicáveis:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '10px' }}>
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
                            return (
                              <div key={opt.id} className="sub-condition-row">
                                <div className="sub-condition-header">
                                  <input
                                    type="checkbox"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    checked={isChecked}
                                    onChange={e => handleSanguineaChange(opt.id, e.target.checked)}
                                  />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                </div>
                                {opt.id === 7 && isChecked && (
                                  <div className="sub-condition-body">
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="Especificar outra alteração"
                                      value={fichaAnamnese.outrasDoencasSanguineas || ''}
                                      onChange={e => setFichaAnamnese({ ...fichaAnamnese, outrasDoencasSanguineas: e.target.value })}
                                      required
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex-row items-center justify-between" style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Apresenta sangramento prolongado em cortes/extrações?</span>
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

              {/* Tab: Sistemas & Envio */}
              {anamneseActiveTab === 'confirmacao' && (
                <div className="anamnese-grid animate-fade-in" style={{ gridTemplateColumns: '1fr' }}>
                  
                  {/* Problema Respiratório */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui problemas respiratórios? (ex: Asma, Bronquite)</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.condicoesRespiratorias.length > 0 ? 'active yes' : ''}`} onClick={() => {
                          if (fichaAnamnese.condicoesRespiratorias.length === 0) {
                            setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: [{ condicaoRespiratoria: 1 }] });
                          }
                        }}>Sim</button>
                        <button type="button" className={`toggle-btn ${fichaAnamnese.condicoesRespiratorias.length === 0 ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, condicoesRespiratorias: [], bombinhaMedicacaoControle: null })}>Não</button>
                      </div>
                    </div>

                    {fichaAnamnese.condicoesRespiratorias.length > 0 && (
                      <div className="sub-conditions-section" style={{ width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Selecione as condições aplicáveis:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '10px' }}>
                          {[
                            { id: 1, label: 'Asma' },
                            { id: 2, label: 'Bronquite' },
                            { id: 3, label: 'DPOC / Enfisema' },
                            { id: 4, label: 'Rinite / Sinusite' },
                            { id: 5, label: 'Tuberculose' },
                            { id: 6, label: 'Outro' }
                          ].map(opt => {
                            const isChecked = fichaAnamnese.condicoesRespiratorias.some(r => r.condicaoRespiratoria === opt.id);
                            return (
                              <div key={opt.id} className="sub-condition-row">
                                <div className="sub-condition-header">
                                  <input
                                    type="checkbox"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    checked={isChecked}
                                    onChange={e => handleRespiratoriaChange(opt.id, e.target.checked)}
                                  />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                </div>
                                {opt.id === 6 && isChecked && (
                                  <div className="sub-condition-body">
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="Especificar outra condição"
                                      value={fichaAnamnese.outrasCondicoesRespiratorias || ''}
                                      onChange={e => setFichaAnamnese({ ...fichaAnamnese, outrasCondicoesRespiratorias: e.target.value })}
                                      required
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex-row items-center justify-between" style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Usa bombinha/medicação de controle respiratório?</span>
                          <div className="toggle-group">
                            <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === true ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: true })}>Sim</button>
                            <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === false ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: false })}>Não</button>
                            <button type="button" className={`toggle-btn ${fichaAnamnese.bombinhaMedicacaoControle === null ? 'active neutral' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, bombinhaMedicacaoControle: null })}>N/A</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deficiências */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label" style={{ fontWeight: 600 }}>Possui deficiência ou necessidade especial?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.deficiencias.length > 0 ? 'active yes' : ''}`} onClick={() => {
                          if (fichaAnamnese.deficiencias.length === 0) {
                            setFichaAnamnese({ ...fichaAnamnese, deficiencias: [{ deficienciaNecessidadeEspecial: 1 }] });
                          }
                        }}>Sim</button>
                        <button type="button" className={`toggle-btn ${fichaAnamnese.deficiencias.length === 0 ? 'active no' : ''}`} onClick={() => setFichaAnamnese({ ...fichaAnamnese, deficiencias: [] })}>Não</button>
                      </div>
                    </div>

                    {fichaAnamnese.deficiencias.length > 0 && (
                      <div className="sub-conditions-section" style={{ width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Selecione as deficiências aplicáveis:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '10px' }}>
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
                                    onChange={e => handleDeficienciaChange(opt.id, e.target.checked)}
                                  />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{opt.label}</span>
                                </div>
                                {opt.id === 6 && isChecked && (
                                  <div className="sub-condition-body">
                                    <input
                                      type="text"
                                      className="input-field"
                                      placeholder="Especificar outra deficiência"
                                      value={fichaAnamnese.outrasDeficienciasNecessidades || ''}
                                      onChange={e => setFichaAnamnese({ ...fichaAnamnese, outrasDeficienciasNecessidades: e.target.value })}
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

                  {/* Gestação (Feminino ou se tipoCadastro for SomenteAnamnese pois não sabemos o sexo) */}
                  {(metadata?.tipoCadastro === 'SomenteAnamnese' || Number(patientData.sexo) === 1) && (
                    <div className="glass-panel" style={{ padding: '20px', background: 'rgba(236, 72, 153, 0.03)', border: '1px solid rgba(236, 72, 153, 0.15)', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#db2777', display: 'block', marginBottom: '16px' }}>Gestação &amp; Lactação</span>
                      <div className="grid-cols-2" style={{ gap: '20px' }}>
                        <div className="anamnese-question-row" style={{ background: 'var(--bg-main)' }}>
                          <div className="anamnese-controls">
                            <span className="anamnese-label">Está grávida ou suspeita de gravidez?</span>
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
                  </div>

                </div>
              )}

              {/* Step 3 Actions */}
              <div className="form-actions-container">
                {!(metadata?.tipoCadastro === 'SomenteAnamnese' && anamneseActiveTab === 'geral') ? (
                  <button type="button" className="btn btn-secondary" onClick={handlePrevStep} style={{ padding: '12px 24px' }}>
                    <ArrowLeft size={18} /> Voltar
                  </button>
                ) : (
                  <div></div>
                )}
                
                {anamneseActiveTab !== 'confirmacao' ? (
                  <button type="button" className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => {
                    const tabsOrder: ('geral' | 'habitos' | 'patologias' | 'cardiovascular' | 'confirmacao')[] = ['geral', 'habitos', 'patologias', 'cardiovascular', 'confirmacao'];
                    const nextIdx = tabsOrder.indexOf(anamneseActiveTab) + 1;
                    setAnamneseActiveTab(tabsOrder[nextIdx]);
                  }}>
                    Avançar Aba <ArrowRight size={18} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => {
                    if (metadata?.tipoCadastro === 'SomenteAnamnese') {
                      handleSubmitForm(null);
                    } else {
                      const addressValidation = validateEndereco();
                      handleSubmitForm(addressValidation.data);
                    }
                  }} disabled={submitting}>
                    {submitting ? 'Enviando...' : <><Save size={18} /> Enviar Cadastro</>}
                  </button>
                )}
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
