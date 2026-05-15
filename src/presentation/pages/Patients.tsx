import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, MoreVertical, Edit, Trash2, FileText, ClipboardList, Save, X, DollarSign, Plus, Check, Ban } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import { API_BASE_URL } from '../../infrastructure/config/api';
import type { Patient, FichaAnamnese, Pagamento, NovoPagamento } from '../../domain/models/types';
import { FormaPagamentoEnum, StatusPagamentoEnum } from '../../domain/models/types';
import toast from 'react-hot-toast';
import { applyCpfMask, applyPhoneMask } from '../../utils/masks';

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
    1: 'Unimed',
    2: 'Bradesco',
    3: 'Amil',
    4: 'SulAmerica',
    5: 'OesteSaude',
    6: 'Athia',
    7: 'SUS',
    8: 'Particular',
    9: 'Outros'
  };

  const fetchPatients = async () => {
    if (!user?.clinica_id) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pacientes/clinica/${user.clinica_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Falha ao carregar pacientes');

      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError('Não foi possível carregar a lista de pacientes.');
      console.error(err);
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
      const response = await fetch(`${API_BASE_URL}/pacientes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Falha ao excluir paciente');

      setPatients(prev => prev.filter(p => p.id !== id));
      setActiveDropdown(null);
      toast.success('Paciente excluído com sucesso!');
    } catch (err) {
      toast.error('Erro ao excluir o paciente. Tente novamente.');
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/pacientes/${editingPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editingPatient,
          sexo: editingPatient.sexo === 'Masculino' ? 0 : 1
        })
      });

      if (!response.ok) {
        const error = new Error('Falha ao atualizar paciente') as any;
        error.response = response;
        throw error;
      }

      toast.success('Paciente atualizado com sucesso!');
      await fetchPatients();
      setEditingPatient(null);
    } catch (err: any) {
      if (err.response) {
        try {
          const errorData = await err.response.json();
          if (Array.isArray(errorData) && errorData[0]?.message) {
            toast.error(errorData[0].message);
            return;
          }
        } catch { }
      }
      toast.error('Erro ao atualizar o paciente.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient || !user?.clinica_id) return;

    try {
      setIsSaving(true);
      const payload = {
        ...newPatient,
        clinicaId: user.clinica_id,
        sexo: newPatient.sexo === 'Masculino' ? 0 : 1
      };

      const response = await fetch(`${API_BASE_URL}/pacientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = new Error('Falha ao criar paciente') as any;
        error.response = response;
        throw error;
      }

      toast.success('Paciente cadastrado com sucesso!');
      await fetchPatients();
      setNewPatient(null);
      setIsCreating(false);
    } catch (err: any) {
      if (err.response) {
        try {
          const errorData = await err.response.json();
          if (Array.isArray(errorData) && errorData[0]?.message) {
            toast.error(errorData[0].message);
            return;
          }
        } catch { }
      }
      toast.error('Erro ao cadastrar o paciente.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAnamnese = async (pacienteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/fichas-anamnese/paciente/${pacienteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 404) {
        // Prepare empty ficha if not found
        setFichaAnamnese({
          pacienteId,
          tomandoAlgumMedicamento: false,
        } as FichaAnamnese);
        return;
      }

      if (!response.ok) throw new Error('Falha ao carregar ficha de anamnese');
      
      const data = await response.json();
      setFichaAnamnese(data);
    } catch (err) {
      toast.error('Erro ao carregar ficha de anamnese.');
    }
  };

  const handleSaveAnamnese = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fichaAnamnese) return;

    try {
      setIsSaving(true);
      // Map PA string to Number if needed (Alta=1, Normal=2, Baixa=3 based on context search)
      const paMapping: {[key: string]: number} = { 'Alta': 1, 'Normal': 2, 'Baixa': 3 };
      
      const payload = {
        ...fichaAnamnese,
        tipoPA: typeof fichaAnamnese.tipoPA === 'string' ? (paMapping[fichaAnamnese.tipoPA] || 2) : fichaAnamnese.tipoPA
      };

      const response = await fetch(`${API_BASE_URL}/fichas-anamnese`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao salvar ficha de anamnese');

      toast.success('Ficha de anamnese salva com sucesso!');
      setFichaAnamnese(null);
    } catch (err) {
      toast.error('Erro ao salvar ficha.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPayments = async (pacienteId: string) => {
    try {
      setIsFinanceLoading(true);
      const response = await fetch(`${API_BASE_URL}/pagamentos/paciente/${pacienteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao carregar pagamentos');

      const data = await response.json();
      setFinancePayments(data);
    } catch (err) {
      toast.error('Erro ao carregar pagamentos do paciente.');
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
        dataVencimento: newPayment.dataVencimento || new Date().toISOString().split('T')[0],
        statusPagamento: Number(newPayment.statusPagamento ?? StatusPagamentoEnum.Pendente),
        formaPagamento: Number(newPayment.formaPagamento ?? FormaPagamentoEnum.PIX),
        observacao: newPayment.observacao || ''
      };

      const response = await fetch(`${API_BASE_URL}/pagamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao registrar pagamento');

      toast.success('Pagamento registrado com sucesso!');
      setIsAddingPayment(false);
      fetchPayments(selectedPatientForFinance.id);
      setNewPaymentData({
        valor: 0,
        dataVencimento: new Date().toISOString().split('T')[0],
        formaPagamento: FormaPagamentoEnum.PIX,
        statusPagamento: StatusPagamentoEnum.Pendente,
        observacao: ''
      });
    } catch (err) {
      toast.error('Erro ao registrar pagamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pagamentos/${paymentId}/pagar`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao confirmar pagamento');

      toast.success('Pagamento confirmado!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err) {
      toast.error('Erro ao confirmar pagamento.');
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!window.confirm('Deseja realmente cancelar este pagamento?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/pagamentos/${paymentId}/cancelar`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao cancelar pagamento');

      toast.success('Pagamento cancelado!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err) {
      toast.error('Erro ao cancelar pagamento.');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Deletar permanentemente este registro?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/pagamentos/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao excluir pagamento');

      toast.success('Pagamento excluído!');
      if (selectedPatientForFinance) fetchPayments(selectedPatientForFinance.id);
    } catch (err) {
      toast.error('Erro ao excluir pagamento.');
    }
  };

  const openFinanceModal = (patient: Patient) => {
    setSelectedPatientForFinance(patient);
    fetchPayments(patient.id);
    setActiveDropdown(null);
  };

  const openCreateModal = () => {
    setNewPatient({
      nome: '',
      email: '',
      cpf: '',
      dataNascimento: '',
      sexo: 'Masculino',
      convenio: 1,
      telefone: ''
    });
    setIsCreating(true);
  };

  const filteredPatients = patients.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleDropdown = (id: string) => {
    if (activeDropdown === id) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(id);
    }
  };

  return (
    <div className="animate-fade-in" onClick={() => activeDropdown && setActiveDropdown(null)}>
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Pacientes</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os cadastros dos seus pacientes</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={18} /> Novo Paciente
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nome..."
            style={{ paddingLeft: '40px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>CPF</th>
              <th>Nascimento</th>
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
                <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{patient.nome}</td>
                <td>
                  <div>{patient.telefone}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{patient.email || 'N/A'}</div>
                </td>
                <td>{patient.cpf}</td>
                <td>{new Date(patient.dataNascimento).toLocaleDateString('pt-BR')}</td>
                <td>{convenioMap[patient.convenio] || 'N/A'}</td>
                <td style={{ textAlign: 'right' }}>
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
                            setEditingPatient(patient);
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
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
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
                    <label className="input-label">Nome Completo</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Pedro Neto"
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
                      <label className="input-label">Telefone</label>
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
                        value={newPatient.cpf}
                        onChange={e => setNewPatient({ ...newPatient, cpf: applyCpfMask(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Data de Nascimento</label>
                      <input
                        type="date"
                        className="input-field"
                        value={newPatient.dataNascimento}
                        onChange={e => setNewPatient({ ...newPatient, dataNascimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Sexo</label>
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
                      <label className="input-label">Convênio</label>
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
                    <label className="input-label">Nome Completo</label>
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
                        value={editingPatient.email}
                        onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Telefone</label>
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
                        value={editingPatient.cpf}
                        onChange={e => setEditingPatient({ ...editingPatient, cpf: applyCpfMask(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Data de Nascimento</label>
                      <input
                        type="date"
                        className="input-field"
                        value={editingPatient.dataNascimento.split('T')[0]}
                        onChange={e => setEditingPatient({ ...editingPatient, dataNascimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Sexo</label>
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
                      <label className="input-label">Convênio</label>
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
                <div className="anamnese-grid">
                  {/* Medicamentos */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Está tomando algum medicamento?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.tomandoAlgumMedicamento ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, tomandoAlgumMedicamento: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.tomandoAlgumMedicamento ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, tomandoAlgumMedicamento: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.tomandoAlgumMedicamento && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Quais medicamentos?" value={fichaAnamnese.quaisMedicamentos || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, quaisMedicamentos: e.target.value})} required />
                    )}
                  </div>

                  {/* Alergias */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Possui alguma alergia?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.possuiAlergias ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, possuiAlergias: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.possuiAlergias ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, possuiAlergias: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.possuiAlergias && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Quais alergias?" value={fichaAnamnese.quaisAlergias || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, quaisAlergias: e.target.value})} required />
                    )}
                  </div>

                  {/* Pressão Arterial */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Pressão Arterial</span>
                      <select className="input-field" style={{ width: '150px' }} value={fichaAnamnese.tipoPA} onChange={e => setFichaAnamnese({...fichaAnamnese, tipoPA: e.target.value})}>
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </div>
                  </div>

                  {/* Coração */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Problema cardíaco?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.temProblemaCardiaco ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, temProblemaCardiaco: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.temProblemaCardiaco ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, temProblemaCardiaco: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.temProblemaCardiaco && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual problema?" value={fichaAnamnese.qualProblemaCardiaco || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, qualProblemaCardiaco: e.target.value})} required />
                    )}
                  </div>

                  {/* Diabetes / Sangramento */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">É diabético?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.temDiabetes ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, temDiabetes: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.temDiabetes ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, temDiabetes: false})}>Não</button>
                      </div>
                    </div>
                  </div>

                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Sangramento excessivo?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.tipoSangramento ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, tipoSangramento: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.tipoSangramento ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, tipoSangramento: false})}>Não</button>
                      </div>
                    </div>
                  </div>

                  {/* Cirurgia 5 anos */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Cirurgia nos últimos 5 anos?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.fezCirurgiaNosUltimosCincoAnos ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, fezCirurgiaNosUltimosCincoAnos: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.fezCirurgiaNosUltimosCincoAnos ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, fezCirurgiaNosUltimosCincoAnos: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.fezCirurgiaNosUltimosCincoAnos && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual cirurgia?" value={fichaAnamnese.qualCirurgia || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, qualCirurgia: e.target.value})} required />
                    )}
                  </div>

                  {/* Gravidez */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Está grávida?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.estaGravida ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, estaGravida: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.estaGravida ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, estaGravida: false})}>Não</button>
                      </div>
                    </div>
                  </div>

                  {/* Anestesia Reação */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Reação à anestesia dental?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.jaTeveReacaoAnestesiaDental ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, jaTeveReacaoAnestesiaDental: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.jaTeveReacaoAnestesiaDental ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, jaTeveReacaoAnestesiaDental: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.jaTeveReacaoAnestesiaDental && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual reação?" value={fichaAnamnese.qualReacaoAnestesia || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, qualReacaoAnestesia: e.target.value})} required />
                    )}
                  </div>

                  {/* Doença Infecto */}
                  <div className="anamnese-question-row">
                    <div className="anamnese-controls">
                      <span className="anamnese-label">Doença infectocontagiosa?</span>
                      <div className="toggle-group">
                        <button type="button" className={`toggle-btn ${fichaAnamnese.portadorDoencaInfectoContagiosa ? 'active yes' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, portadorDoencaInfectoContagiosa: true})}>Sim</button>
                        <button type="button" className={`toggle-btn ${!fichaAnamnese.portadorDoencaInfectoContagiosa ? 'active no' : ''}`} onClick={() => setFichaAnamnese({...fichaAnamnese, portadorDoencaInfectoContagiosa: false})}>Não</button>
                      </div>
                    </div>
                    {fichaAnamnese.portadorDoencaInfectoContagiosa && (
                      <input type="text" className="input-field anamnese-details-input" placeholder="Qual doença?" value={fichaAnamnese.qualDoencaInfectoContagiosa || ''} onChange={e => setFichaAnamnese({...fichaAnamnese, qualDoencaInfectoContagiosa: e.target.value})} required />
                    )}
                  </div>
                </div>
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
                          <span className={`badge ${
                            payment.statusPagamento === 'Pago' ? 'badge-success' : 
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
