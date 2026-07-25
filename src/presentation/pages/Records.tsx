import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FilePlus, Activity, ArrowLeft, Calendar, User, MoreVertical, Edit, Trash2, X, File, Download, Image, Upload, FileText, DollarSign, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Atendimento, Patient, Pagamento } from '../../domain/models/types';
import { FormaPagamentoEnum, StatusPagamentoEnum } from '../../domain/models/types';
import toast from 'react-hot-toast';

const formatCriacaoDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr.startsWith('0001-01-01')) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
};

export function Records() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | null>(null);
  const [printingAtendimento, setPrintingAtendimento] = useState<Atendimento | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAtendimento, setNewAtendimento] = useState({
    tipoAtendimento: 'Consulta',
    statusAtendimento: 'Pendente',
    dataAtendimento: new Date().toISOString().split('T')[0],
    descricao: '',
    dente: 0,
    valorAtendimento: 0,
    statusPagamento: '',
    formaPagamento: ''
  });

  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [selectedAtendimentoForPayment, setSelectedAtendimentoForPayment] = useState<Atendimento | null>(null);
  const [paymentData, setPaymentData] = useState({
    valor: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    statusPagamento: StatusPagamentoEnum.Pendente.toString(),
    formaPagamento: FormaPagamentoEnum.PIX.toString(),
    observacao: '',
    atendimentoId: ''
  });

  const [permiteAlterarConcluidos, setPermiteAlterarConcluidos] = useState(false);

  const [expandedPayments, setExpandedPayments] = useState<{ [key: string]: boolean }>({});
  const [loadingPayments, setLoadingPayments] = useState<{ [key: string]: boolean }>({});
  const [paymentsMap, setPaymentsMap] = useState<{ [key: string]: Pagamento[] }>({});

  // File management state
  const [activeTab, setActiveTab] = useState<'timeline' | 'files'>('timeline');
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState<string | null>(null);

  const statusMap: { [key: string]: number } = {
    'Pendente': 1,
    'EmAndamento': 2,
    'Concluido': 3,
    'Cancelado': 4
  };

  const tipoMap: { [key: string]: number } = {
    'Consulta': 1,
    'Cirurgia': 2,
    'Exame': 3,
    'Emergencia': 4,
    'Procedimento': 5
  };

  const convenioMap: { [key: number]: string } = {
    1: 'Unimed', 2: 'Bradesco', 3: 'Amil', 4: 'SulAmerica', 5: 'OesteSaude',
    6: 'Athia', 7: 'SUS', 8: 'Particular', 9: 'Outros'
  };

  const calculateAge = (birthDateString: string | null) => {
    if (!birthDateString) return '';
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `(${age} anos)`;
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [aData, pList, configData] = await Promise.all([
        ApiClient.get<Atendimento[]>(`/atendimentos/paciente/${id}`),
        user?.clinica_id
          ? ApiClient.get<Patient[]>(`/pacientes/clinica/${user.clinica_id}`)
          : Promise.resolve([]),
        user?.clinica_id
          ? ApiClient.get<any>(`/clinicas/configuracoes/${user.clinica_id}`).catch(() => null)
          : Promise.resolve(null)
      ]);
      setAtendimentos(aData);
      const foundPatient = pList.find(p => p.id === id) || null;
      setPatient(foundPatient);
      if (configData) {
        setPermiteAlterarConcluidos(configData.permiteAlterarAtendimentosConcluidos);
      } else {
        setPermiteAlterarConcluidos(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível carregar o prontuário.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchArquivos();
  }, [id, token]);

  const fetchArquivos = async () => {
    if (!id) return;
    try {
      setFilesLoading(true);
      const data = await ApiClient.get<any[]>(`/pacientes/${id}/arquivos`);
      setArquivos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('tipo', '3'); // Documento por padrão

      await ApiClient.post(`/pacientes/${id}/arquivos`, formData);

      toast.success('Arquivo enviado com sucesso!');
      fetchArquivos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (arquivoId: string, nomeOriginal: string) => {
    try {
      // Usamos request diretamente para o download pois precisamos do blob da Response bruta
      const response = await ApiClient.request(`/pacientes/${id}/arquivos/${arquivoId}/download`);
      if (!response.ok) throw new Error('Falha no download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeOriginal;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erro ao baixar arquivo.');
    }
  };

  const handleDeleteArquivo = async (arquivoId: string) => {
    if (!window.confirm('Excluir este arquivo permanentemente?')) return;
    try {
      await ApiClient.delete(`/pacientes/${id}/arquivos/${arquivoId}`);
      toast.success('Arquivo excluído!');
      fetchArquivos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir arquivo.');
    }
  };

  const handleStatusUpdate = async (atendimentoId: string, newStatusText: string) => {
    if (newStatusText === 'Concluido' || newStatusText === 'Cancelado') {
      const confirmed = window.confirm(`Deseja realmente marcar como ${newStatusText}? Esta ação não poderá ser desfeita e o registro não poderá mais ser editado ou excluído.`);
      if (!confirmed) {
        setActiveDropdown(null);
        return;
      }
    }

    try {
      setUpdatingId(atendimentoId);
      await ApiClient.patch(`/atendimentos/${atendimentoId}/status?status=${newStatusText}`);

      toast.success('Status atualizado com sucesso!');
      setActiveDropdown(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status do atendimento.');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEdit = async (atendimentoId: string) => {
    try {
      setUpdatingId(atendimentoId);
      const data = await ApiClient.get<Atendimento>(`/atendimentos/${atendimentoId}`);
      setEditingAtendimento(data);
      setActiveDropdown(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar dados para edição.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtendimento) return;

    try {
      setIsSaving(true);
      const payload = {
        pacienteId: editingAtendimento.pacienteId,
        profissionalId: editingAtendimento.profissionalId,
        dataAtendimento: editingAtendimento.dataAtendimento,
        descricao: editingAtendimento.descricao,
        valorAtendimento: editingAtendimento.valorAtendimento,
        dente: editingAtendimento.dente || 0,
        tipoAtendimento: tipoMap[editingAtendimento.tipoAtendimento] || 1,
        statusAtendimento: statusMap[editingAtendimento.statusAtendimento] || 1
      };

      await ApiClient.put(`/atendimentos/${editingAtendimento.id}`, payload);

      toast.success('Atendimento atualizado com sucesso!');
      setEditingAtendimento(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    try {
      setIsSaving(true);
      const payload = {
        pacienteId: id,
        profissionalId: user.sub,
        dataAtendimento: newAtendimento.dataAtendimento,
        descricao: newAtendimento.descricao,
        dente: newAtendimento.dente || 0,
        tipoAtendimento: tipoMap[newAtendimento.tipoAtendimento] || 1,
        statusAtendimento: statusMap[newAtendimento.statusAtendimento] || 1,
        valorAtendimento: newAtendimento.valorAtendimento ? Number(newAtendimento.valorAtendimento) : null,
        formaPagamento: newAtendimento.formaPagamento ? Number(newAtendimento.formaPagamento) : null,
        statusPagamento: newAtendimento.statusPagamento ? Number(newAtendimento.statusPagamento) : null
      };

      await ApiClient.post('/atendimentos', payload);

      toast.success('Atendimento registrado com sucesso!');
      setIsCreating(false);
      setNewAtendimento({
        tipoAtendimento: 'Consulta',
        statusAtendimento: 'Pendente',
        dataAtendimento: new Date().toISOString().split('T')[0],
        descricao: '',
        dente: 0,
        valorAtendimento: 0,
        statusPagamento: '',
        formaPagamento: ''
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar atendimento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (atendimentoId: string) => {
    if (!window.confirm('Deseja realmente excluir este atendimento?')) return;

    try {
      setUpdatingId(atendimentoId);
      await ApiClient.delete(`/atendimentos/${atendimentoId}`);

      toast.success('Atendimento excluído!');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir atendimento.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenRegisterPayment = (atendimento: Atendimento) => {
    setPaymentData({
      valor: atendimento.valorPendente !== undefined ? atendimento.valorPendente.toString() : '',
      dataVencimento: new Date().toISOString().split('T')[0],
      statusPagamento: StatusPagamentoEnum.Pendente.toString(),
      formaPagamento: FormaPagamentoEnum.PIX.toString(),
      observacao: `Pagamento referente ao atendimento: ${atendimento.tipoAtendimento} - ${new Date(atendimento.dataAtendimento).toLocaleDateString('pt-BR')}`,
      atendimentoId: atendimento.id
    });
    setSelectedAtendimentoForPayment(atendimento);
    setIsRegisteringPayment(true);
    setActiveDropdown(null);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setIsSaving(true);
      const payload = {
        pacienteId: id,
        atendimentoId: paymentData.atendimentoId,
        valor: Number(paymentData.valor),
        dataVencimento: paymentData.dataVencimento,
        statusPagamento: Number(paymentData.statusPagamento),
        formaPagamento: Number(paymentData.formaPagamento),
        observacao: paymentData.observacao || null
      };

      await ApiClient.post('/pagamentos', payload);

      toast.success('Pagamento registrado com sucesso!');
      setIsRegisteringPayment(false);
      await fetchData();
      if (expandedPayments[paymentData.atendimentoId]) {
        await fetchPaymentsForAtendimento(paymentData.atendimentoId);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePayments = async (atendimentoId: string) => {
    const isExpanded = !expandedPayments[atendimentoId];
    setExpandedPayments(prev => ({ ...prev, [atendimentoId]: isExpanded }));

    if (isExpanded) {
      await fetchPaymentsForAtendimento(atendimentoId);
    }
  };

  const fetchPaymentsForAtendimento = async (atendimentoId: string) => {
    try {
      setLoadingPayments(prev => ({ ...prev, [atendimentoId]: true }));
      const data = await ApiClient.get<any[]>(`/pagamentos/atendimento/${atendimentoId}`);
      setPaymentsMap(prev => ({ ...prev, [atendimentoId]: data }));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar pagamentos.');
    } finally {
      setLoadingPayments(prev => ({ ...prev, [atendimentoId]: false }));
    }
  };

  const handleMarkPaymentAsPaid = async (paymentId: string, atendimentoId: string) => {
    try {
      await ApiClient.patch(`/pagamentos/${paymentId}/pagar`);
      toast.success('Pagamento marcado como pago!');
      await fetchPaymentsForAtendimento(atendimentoId);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar pagamento.');
    }
  };

  const handleCancelPaymentItem = async (paymentId: string, atendimentoId: string) => {
    if (!window.confirm('Deseja realmente cancelar este pagamento?')) return;
    try {
      await ApiClient.patch(`/pagamentos/${paymentId}/cancelar`);
      toast.success('Pagamento cancelado!');
      await fetchPaymentsForAtendimento(atendimentoId);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar pagamento.');
    }
  };

  const handleDeletePaymentItem = async (paymentId: string, atendimentoId: string) => {
    if (!window.confirm('Deseja excluir permanentemente este pagamento?')) return;
    try {
      await ApiClient.delete(`/pagamentos/${paymentId}`);
      toast.success('Pagamento excluído!');
      await fetchPaymentsForAtendimento(atendimentoId);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir pagamento.');
    }
  };

  const handlePrint = (atendimento: Atendimento) => {
    setPrintingAtendimento(atendimento);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="animate-fade-in" onClick={() => activeDropdown && setActiveDropdown(null)}>
      <button
        onClick={() => navigate('/pacientes')}
        className="btn btn-secondary"
        style={{ marginBottom: '24px', padding: '6px 12px', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} /> Voltar para Pacientes
      </button>

      <div className="flex-row justify-between items-center" style={{ marginBottom: '24px' }}>
        <div className="flex-col gap-1">
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            Prontuário {patient ? `- ${patient.nome}` : ''}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Histórico clínico e documentos digitais do paciente</p>
        </div>
        {activeTab === 'timeline' && (
          <div className="mobile-hide">
            <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
              <FilePlus size={18} /> Novo Atendimento
            </button>
          </div>
        )}
      </div>

      {activeTab === 'timeline' && (
        <div className="mobile-only" style={{ marginBottom: '16px' }}>
          <button className="btn btn-primary w-full" onClick={() => setIsCreating(true)}>
            <FilePlus size={18} /> Novo Atendimento
          </button>
        </div>
      )}

      {patient && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.03) 0%, rgba(2, 132, 199, 0.08) 100%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div className="flex-row items-start justify-between" style={{ position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '20px' }}>
            <div className="flex-row gap-4" style={{ flexWrap: 'wrap' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                color: 'white',
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
              }}>
                {patient.nome ? patient.nome.charAt(0).toUpperCase() : 'P'}
              </div>

              <div className="flex-col gap-1">
                <div className="flex-row items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{patient.nome}</h2>
                  <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--primary)', border: '1px solid rgba(2, 132, 199, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                    {convenioMap[patient.convenio] || 'Outros'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div><strong>CPF:</strong> {patient.cpf || 'Não informado'}</div>
                  {patient.dataNascimento && (
                    <div>
                      <strong>Nascimento:</strong> {new Date(patient.dataNascimento).toLocaleDateString('pt-BR')} {calculateAge(patient.dataNascimento)}
                    </div>
                  )}
                  <div><strong>Telefone:</strong> {patient.telefone || 'Não informado'}</div>
                  {patient.email && <div><strong>E-mail:</strong> {patient.email}</div>}
                  {patient.profissao && <div><strong>Profissão:</strong> {patient.profissao}</div>}
                  <div><strong>Sexo:</strong> {patient.sexo === 0 || patient.sexo === 'Masculino' ? 'Masculino' : 'Feminino'}</div>
                </div>
              </div>
            </div>

            {(patient.nomeContatoEmergencia || patient.endereco) && (
              <div style={{ minWidth: '250px', fontSize: '0.85rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
                {patient.nomeContatoEmergencia && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Contato de Emergência</div>
                    <div>{patient.nomeContatoEmergencia} {patient.telefoneContatoEmergencia && `(${patient.telefoneContatoEmergencia})`}</div>
                  </div>
                )}
                {patient.endereco && (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Endereço Residencial</div>
                    <div style={{ lineHeight: '1.4' }}>
                      {patient.endereco.logradouro}, {patient.endereco.numero}{patient.endereco.complemento && ` - ${patient.endereco.complemento}`}<br />
                      {patient.endereco.bairro} - {patient.endereco.cidade}/{patient.endereco.estado}<br />
                      CEP: {patient.endereco.cep}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Activity size={18} /> Linha do Tempo
        </button>
        <button
          className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FileText size={18} /> Arquivos e Exames
        </button>
      </div>

      {activeTab === 'timeline' ? (
        <div className="timeline">
          {loading ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p>Carregando prontuário...</p>
            </div>
          ) : atendimentos.length > 0 ? (
            atendimentos.map((atendimento) => {
              const isFinalized = atendimento.statusAtendimento === 'Concluido' || atendimento.statusAtendimento === 'Cancelado';
              const canModify = !isFinalized || permiteAlterarConcluidos;
              return (
                <div
                  key={atendimento.id}
                  className="timeline-item"
                  style={{ zIndex: activeDropdown === atendimento.id ? 100 : 1 }}
                >
                  <div className="glass-panel atendimento-card" style={{ padding: '24px' }}>
                    <div className="flex-row justify-between items-start" style={{ marginBottom: '20px' }}>
                      <div className="flex-row gap-4">
                        <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}>
                          <Activity size={28} />
                        </div>
                        <div>
                          <div className="flex-row items-center gap-2" style={{ marginBottom: '4px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{atendimento.tipoAtendimento}</h3>
                            <span className={`status-badge ${atendimento.statusAtendimento.toLowerCase().replace(/\s/g, '')}`}>
                              {atendimento.statusAtendimento}
                            </span>
                          </div>
                          <div className="flex-row items-center gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <span className="flex-row items-center gap-1"><Calendar size={14} /> {new Date(atendimento.dataAtendimento).toLocaleDateString('pt-BR')}</span>
                            <span className="flex-row items-center gap-1"><User size={14} /> {atendimento.nomeProfissional}</span>
                          </div>
                          {(atendimento.nomeUsuarioCriacao || formatCriacaoDate(atendimento.dataCriacao)) && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', columnGap: '16px', rowGap: '4px' }}>
                              {atendimento.nomeUsuarioCriacao && (
                                <span>Cadastrado por <strong style={{ color: 'var(--text-main)' }}>{atendimento.nomeUsuarioCriacao}</strong></span>
                              )}
                              {formatCriacaoDate(atendimento.dataCriacao) && (
                                <span>Data de cadastro: <strong style={{ color: 'var(--text-main)' }}>{formatCriacaoDate(atendimento.dataCriacao)}</strong></span>
                              )}
                            </div>
                          )}
                          {(atendimento.valorAtendimento != null || (atendimento.valorPendente != null && atendimento.valorPendente > 0)) && (
                            <div className="flex-row items-center gap-4" style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                              {atendimento.valorAtendimento != null && (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  <strong>Valor:</strong> R$ {atendimento.valorAtendimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                              {atendimento.valorPendente != null && atendimento.valorPendente > 0 && (
                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                  <strong>Pendente:</strong> R$ {atendimento.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-row items-center gap-3">
                        {/* <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => handlePrint(atendimento)}
                        >
                          <FileText size={14} /> Imprimir Registro
                        </button> */}
                        <button
                          className="btn"
                          style={{ fontSize: '0.8rem', backgroundColor: '#22c55e', color: '#fff', border: 'none' }}
                          onClick={() => handleOpenRegisterPayment(atendimento)}
                        >
                          <DollarSign size={14} /> Registrar Pagamento
                        </button>

                        {(canModify || (atendimento.valorPendente == null || atendimento.valorPendente > 0)) && (
                          <div className="dropdown-container">
                            <button
                              className="action-btn"
                              disabled={updatingId === atendimento.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === atendimento.id ? null : atendimento.id);
                              }}
                            >
                              <MoreVertical size={20} />
                            </button>

                            {activeDropdown === atendimento.id && (
                              <div className="dropdown-menu" style={{ right: 0, top: '100%' }}>
                                <>
                                  {/* <button
                                    className="dropdown-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenRegisterPayment(atendimento);
                                    }}
                                    disabled={updatingId === atendimento.id}
                                  >
                                    <DollarSign size={16} /> Registrar Pagamento
                                  </button> */}
                                  {canModify && <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }}></div>}


                                  {canModify && (
                                    <>
                                      <button
                                        className="dropdown-item"
                                        onClick={() => handleEdit(atendimento.id)}
                                        disabled={updatingId === atendimento.id}
                                      >
                                        <Edit size={16} /> Editar
                                      </button>
                                      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }}></div>
                                      <div
                                        style={{ position: 'relative' }}
                                        onMouseEnter={() => setStatusSubmenuOpen(atendimento.id)}
                                        onMouseLeave={() => setStatusSubmenuOpen(null)}
                                      >
                                        <button
                                          className="dropdown-item"
                                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setStatusSubmenuOpen(statusSubmenuOpen === atendimento.id ? null : atendimento.id);
                                          }}
                                          disabled={updatingId === atendimento.id}
                                        >
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Activity size={16} /> Alterar Status
                                          </span>
                                          <ChevronRight size={14} />
                                        </button>
                                        {statusSubmenuOpen === atendimento.id && (
                                          <div
                                            className="dropdown-menu"
                                            style={{
                                              position: 'absolute',
                                              left: '100%',
                                              top: 0,
                                              minWidth: '150px',
                                              zIndex: 1001,
                                              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                            }}
                                          >
                                            {Object.keys(statusMap).map(status => (
                                              <button
                                                key={status}
                                                className="dropdown-item"
                                                onClick={() => {
                                                  handleStatusUpdate(atendimento.id, status);
                                                  setStatusSubmenuOpen(null);
                                                }}
                                                disabled={updatingId === atendimento.id}
                                                style={{ padding: '6px 12px' }}
                                              >
                                                {status}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }}></div>
                                      <button
                                        className="dropdown-item danger"
                                        onClick={() => handleDelete(atendimento.id)}
                                        disabled={updatingId === atendimento.id}
                                      >
                                        <Trash2 size={16} /> Excluir
                                      </button>
                                    </>
                                  )}
                                </>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>{atendimento.descricao}</p>
                    </div>

                    {atendimento.valorAtendimento > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleTogglePayments(atendimento.id)}
                        >
                          <DollarSign size={14} />
                          {expandedPayments[atendimento.id] ? 'Ocultar Histórico de Pagamentos' : 'Ver Histórico de Pagamentos'}
                        </button>

                        {expandedPayments[atendimento.id] && (
                          <div style={{ marginTop: '12px' }}>
                            {loadingPayments[atendimento.id] ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Carregando pagamentos...</p>
                            ) : paymentsMap[atendimento.id] && paymentsMap[atendimento.id].length > 0 ? (
                              <div className="flex-col gap-2" style={{ marginTop: '8px' }}>
                                {paymentsMap[atendimento.id].map((pagamento) => (
                                  <div
                                    key={pagamento.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '10px 14px',
                                      background: 'var(--bg-surface-hover)',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-subtle)',
                                      fontSize: '0.85rem',
                                      flexWrap: 'wrap',
                                      gap: '8px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                        R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        Vencimento: {new Date(pagamento.dataVencimento).toLocaleDateString('pt-BR')}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        Forma: {pagamento.formaPagamento}
                                      </span>
                                      {pagamento.observacao && (
                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }} title={pagamento.observacao}>
                                          ({pagamento.observacao.length > 30 ? `${pagamento.observacao.substring(0, 30)}...` : pagamento.observacao})
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span className={`status-badge ${pagamento.statusPagamento.toLowerCase().replace(/\s/g, '')}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                        {pagamento.statusPagamento}
                                      </span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {pagamento.statusPagamento === 'Pendente' && (
                                          <>
                                            <button
                                              type="button"
                                              className="action-btn"
                                              style={{ padding: '4px', color: '#10b981' }}
                                              onClick={() => handleMarkPaymentAsPaid(pagamento.id, atendimento.id)}
                                              title="Marcar como Pago"
                                            >
                                              <Check size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              className="action-btn"
                                              style={{ padding: '4px', color: 'var(--danger)' }}
                                              onClick={() => handleCancelPaymentItem(pagamento.id, atendimento.id)}
                                              title="Cancelar Pagamento"
                                            >
                                              <X size={14} />
                                            </button>
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          className="action-btn"
                                          style={{ padding: '4px', color: 'var(--text-muted)' }}
                                          onClick={() => handleDeletePaymentItem(pagamento.id, atendimento.id)}
                                          title="Excluir Pagamento"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                                Nenhum pagamento registrado para este atendimento.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-panel" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Activity size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Nenhum atendimento registrado para este paciente.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex-row justify-between items-center" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Central de Documentos</h3>
            <label className={`btn btn-primary ${isUploading ? 'disabled' : ''}`} style={{ cursor: 'pointer' }}>
              <Upload size={18} /> {isUploading ? 'Enviando...' : 'Fazer Upload'}
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          {filesLoading ? (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p>Carregando arquivos...</p>
            </div>
          ) : arquivos.length > 0 ? (
            <div className="file-grid">
              {arquivos.map((arquivo) => (
                <div key={arquivo.id} className="file-card">
                  <div className="file-icon">
                    {arquivo.contentType.includes('image') ? <Image size={24} /> : <FileText size={24} />}
                  </div>
                  <div className="file-info">
                    <h4 className="file-name" title={arquivo.nomeOriginal}>{arquivo.nomeOriginal}</h4>
                    <div className="file-meta">
                      <span>{(arquivo.tamanhoBytes / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{arquivo.tipo}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="btn btn-secondary w-full"
                      style={{ padding: '6px', fontSize: '0.8rem' }}
                      onClick={() => handleDownload(arquivo.id, arquivo.nomeOriginal)}
                    >
                      <Download size={14} /> Baixar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px', color: 'var(--danger)' }}
                      onClick={() => handleDeleteArquivo(arquivo.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <File size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Nenhum arquivo anexado a este prontuário.</p>
              <p style={{ fontSize: '0.9rem' }}>Faça o upload de exames, fotos ou documentos do paciente.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Novo Atendimento */}
      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Atendimento</h2>
              <button onClick={() => setIsCreating(false)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group-container">
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Tipo de Atendimento</label>
                      <select
                        className="input-field"
                        value={newAtendimento.tipoAtendimento}
                        onChange={e => setNewAtendimento({ ...newAtendimento, tipoAtendimento: e.target.value })}
                      >
                        <option value="Consulta">Consulta</option>
                        <option value="Cirurgia">Cirurgia</option>
                        <option value="Exame">Exame</option>
                        <option value="Emergencia">Emergência</option>
                        <option value="Procedimento">Procedimento</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">Status</label>
                      <select
                        className="input-field"
                        value={newAtendimento.statusAtendimento}
                        onChange={e => setNewAtendimento({ ...newAtendimento, statusAtendimento: e.target.value })}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="EmAndamento">Em Andamento</option>
                        <option value="Concluido">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-cols-3">
                    <div className="form-group">
                      <label className="input-label">Data</label>
                      <input
                        type="date"
                        className="input-field"
                        value={newAtendimento.dataAtendimento}
                        onChange={e => setNewAtendimento({ ...newAtendimento, dataAtendimento: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Número do Dente (Opcional)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={newAtendimento.dente || ''}
                        onChange={e => setNewAtendimento({ ...newAtendimento, dente: parseInt(e.target.value) })}
                        placeholder="Ex: 21"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        placeholder="0,00"
                        value={newAtendimento.valorAtendimento || ''}
                        onChange={e => setNewAtendimento({ ...newAtendimento, valorAtendimento: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Evolução / Descrição</label>
                    <textarea
                      className="input-field"
                      style={{ minHeight: '150px', resize: 'vertical' }}
                      value={newAtendimento.descricao}
                      onChange={e => setNewAtendimento({ ...newAtendimento, descricao: e.target.value })}
                      placeholder="Descreva o procedimento realizado, orientações dadas ao paciente, etc."
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Registrar Atendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Atendimento */}
      {editingAtendimento && (
        <div className="modal-overlay" onClick={() => setEditingAtendimento(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Atendimento</h2>
              <button onClick={() => setEditingAtendimento(null)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group-container">
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Tipo de Atendimento</label>
                      <select
                        className="input-field"
                        value={editingAtendimento.tipoAtendimento}
                        onChange={e => setEditingAtendimento({ ...editingAtendimento, tipoAtendimento: e.target.value })}
                      >
                        <option value="Consulta">Consulta</option>
                        <option value="Cirurgia">Cirurgia</option>
                        <option value="Exame">Exame</option>
                        <option value="Emergencia">Emergência</option>
                        <option value="Procedimento">Procedimento</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">Status</label>
                      <select
                        className="input-field"
                        value={editingAtendimento.statusAtendimento}
                        onChange={e => setEditingAtendimento({ ...editingAtendimento, statusAtendimento: e.target.value })}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="EmAndamento">Em Andamento</option>
                        <option value="Concluido">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid-cols-3">
                    <div className="form-group">
                      <label className="input-label">Data</label>
                      <input
                        type="date"
                        className="input-field"
                        value={editingAtendimento.dataAtendimento.split('T')[0]}
                        onChange={e => setEditingAtendimento({ ...editingAtendimento, dataAtendimento: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Número do Dente (Opcional)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={editingAtendimento.dente || ''}
                        onChange={e => setEditingAtendimento({ ...editingAtendimento, dente: parseInt(e.target.value) })}
                        placeholder="Ex: 21"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        placeholder="0,00"
                        value={editingAtendimento.valorAtendimento}
                        onChange={e => setEditingAtendimento({ ...editingAtendimento, valorAtendimento: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Evolução / Descrição</label>
                    <textarea
                      className="input-field"
                      style={{ minHeight: '150px', resize: 'vertical' }}
                      value={editingAtendimento.descricao}
                      onChange={e => setEditingAtendimento({ ...editingAtendimento, descricao: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {editingAtendimento.nomeUsuarioCriacao && (
                    <div>
                      Cadastrado por <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{editingAtendimento.nomeUsuarioCriacao}</span>
                    </div>
                  )}
                  {formatCriacaoDate(editingAtendimento.dataCriacao) && (
                    <div>
                      Data de cadastro: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatCriacaoDate(editingAtendimento.dataCriacao)}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingAtendimento(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Registro de Pagamento */}
      {isRegisteringPayment && (
        <div className="modal-overlay" onClick={() => setIsRegisteringPayment(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Pagamento</h2>
              <button onClick={() => setIsRegisteringPayment(false)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRegisterPayment}>
              <div className="modal-body">
                {selectedAtendimentoForPayment && (
                  <div className="flex-row justify-between" style={{ padding: '12px 16px', background: 'var(--bg-surface-hover)', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor do Atendimento</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        R$ {selectedAtendimentoForPayment.valorAtendimento?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor Pendente</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>
                        R$ {selectedAtendimentoForPayment.valorPendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                  </div>
                )}
                <div className="form-group-container">
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Valor (R$) <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        placeholder="0,00"
                        value={paymentData.valor}
                        onChange={e => setPaymentData({ ...paymentData, valor: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Data de Vencimento <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="date"
                        className="input-field"
                        value={paymentData.dataVencimento}
                        onChange={e => setPaymentData({ ...paymentData, dataVencimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Forma de Pagamento</label>
                      <select
                        className="input-field"
                        value={paymentData.formaPagamento}
                        onChange={e => setPaymentData({ ...paymentData, formaPagamento: e.target.value })}
                      >
                        <option value={FormaPagamentoEnum.PIX}>PIX</option>
                        <option value={FormaPagamentoEnum.Debito}>Débito</option>
                        <option value={FormaPagamentoEnum.Credito}>Crédito</option>
                        <option value={FormaPagamentoEnum.Dinheiro}>Dinheiro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="input-label">Status de Pagamento</label>
                      <select
                        className="input-field"
                        value={paymentData.statusPagamento}
                        onChange={e => setPaymentData({ ...paymentData, statusPagamento: e.target.value })}
                      >
                        <option value={StatusPagamentoEnum.Pendente}>Pendente</option>
                        <option value={StatusPagamentoEnum.Pago}>Pago</option>
                        <option value={StatusPagamentoEnum.Cancelado}>Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Observação</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: referente ao procedimento de restauração"
                      value={paymentData.observacao}
                      onChange={e => setPaymentData({ ...paymentData, observacao: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegisteringPayment(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estrutura de Impressão (Invisível no navegador, visível no Print) */}
      {printingAtendimento && (
        <div className="printable-record" id="printable-content">
          <div className="print-header">
            <div className="print-clinic-info">
              <h2>{user?.clinica_nome || 'Clínica Odontológica'}</h2>
              <p>Prontuário Digital do Paciente</p>
            </div>
            <div className="print-meta">
              <p>Relatório de Atendimento</p>
              <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Dados do Paciente</div>
            <div className="print-grid">
              <div className="print-field">
                <span className="print-label">Nome Completo</span>
                <span className="print-value">{printingAtendimento.nomePaciente}</span>
              </div>
              <div className="print-field">
                <span className="print-label">CPF</span>
                <span className="print-value">{patient?.cpf || 'Não informado'}</span>
              </div>
              <div className="print-field">
                <span className="print-label">Data de Nascimento</span>
                <span className="print-value">
                  {patient?.dataNascimento ? new Date(patient.dataNascimento).toLocaleDateString('pt-BR') : 'Não informada'}
                </span>
              </div>
              <div className="print-field">
                <span className="print-label">ID do Atendimento</span>
                <span className="print-value">{printingAtendimento.id.toUpperCase()}</span>
              </div>
              {patient?.profissao && (
                <div className="print-field">
                  <span className="print-label">Profissão</span>
                  <span className="print-value">{patient.profissao}</span>
                </div>
              )}
              {patient?.telefone && (
                <div className="print-field">
                  <span className="print-label">Telefone</span>
                  <span className="print-value">{patient.telefone}</span>
                </div>
              )}
              {patient?.nomeContatoEmergencia && (
                <div className="print-field">
                  <span className="print-label">Contato de Emergência</span>
                  <span className="print-value">
                    {patient.nomeContatoEmergencia} {patient.telefoneContatoEmergencia && `(${patient.telefoneContatoEmergencia})`}
                  </span>
                </div>
              )}
              {patient?.endereco && (
                <div className="print-field" style={{ gridColumn: 'span 2' }}>
                  <span className="print-label">Endereço Residencial</span>
                  <span className="print-value">
                    {`${patient.endereco.logradouro}, ${patient.endereco.numero}${patient.endereco.complemento ? ` (${patient.endereco.complemento})` : ''} - ${patient.endereco.bairro}, ${patient.endereco.cidade}/${patient.endereco.estado} - CEP: ${patient.endereco.cep}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Detalhes do Atendimento</div>
            <div className="print-grid">
              <div className="print-field">
                <span className="print-label">Data do Atendimento</span>
                <span className="print-value">{new Date(printingAtendimento.dataAtendimento).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="print-field">
                <span className="print-label">Tipo</span>
                <span className="print-value">{printingAtendimento.tipoAtendimento}</span>
              </div>
              <div className="print-field">
                <span className="print-label">Profissional Responsável</span>
                <span className="print-value">{printingAtendimento.nomeProfissional}</span>
              </div>
              {printingAtendimento.dente && (
                <div className="print-field">
                  <span className="print-label">Dente</span>
                  <span className="print-value">{printingAtendimento.dente}</span>
                </div>
              )}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">Evolução Clínica / Descrição</div>
            <div className="print-description">
              {printingAtendimento.descricao}
            </div>
          </div>

          <div className="print-signatures">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">{printingAtendimento.nomePaciente}</div>
              <div className="signature-sub">Assinatura do Paciente (ou Responsável)</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">{printingAtendimento.nomeProfissional}</div>
              <div className="signature-sub">Assinatura do Profissional</div>
            </div>
          </div>

          <div className="print-footer">
            <p>OdonTech - Sistema de Gestão Odontológica | Documento restrito para fins clínicos.</p>
          </div>
        </div>
      )}
    </div>
  );
}
