import { useState, useEffect } from 'react';
import { Stethoscope, Search, UserPlus, X, Edit2, MoreVertical, Lock, ClipboardList, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Profissional, ProfissionalRequest, Secretaria } from '../../domain/models/types';
import { confirmAction } from '../../utils/alerts';
import toast from 'react-hot-toast';
import { applyCroMask } from '../../utils/masks';

export function Professionals() {
  const { user, token, isSecretaria } = useAuth();
  const [activeTab, setActiveTab] = useState<'profissionais' | 'secretarias'>('profissionais');
  const [secretaries, setSecretaries] = useState<Secretaria[]>([]);
  const [secretariesLoading, setSecretariesLoading] = useState(false);
  const [secretariesError, setSecretariesError] = useState<string | null>(null);
  const [togglingSecretaryId, setTogglingSecretaryId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProfessional, setNewProfessional] = useState<Partial<ProfissionalRequest>>({
    nome: '',
    email: '',
    senha: '',
    cro: ''
  });
  const [isCreatingSecretary, setIsCreatingSecretary] = useState(false);
  const [newSecretary, setNewSecretary] = useState({ nome: '', email: '', senha: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Profissional | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fetchProfessionals = async () => {
    if (!user?.clinica_id) return;

    try {
      setLoading(true);
      const data = await ApiClient.get<Profissional[]>(`/profissionais/clinica/${user.clinica_id}`);
      setProfessionals(data);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar a lista de profissionais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, [user?.clinica_id, token]);

  const fetchSecretaries = async () => {
    try {
      setSecretariesLoading(true);
      setSecretariesError(null);
      const data = await ApiClient.get<Secretaria[]>('/secretarias');
      setSecretaries(data);
    } catch (err: any) {
      setSecretariesError(err.message || 'Não foi possível carregar a lista de secretárias.');
    } finally {
      setSecretariesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'secretarias' && !isSecretaria) fetchSecretaries();
  }, [activeTab, isSecretaria, token]);

  const handleToggleSecretary = async (secretary: Secretaria) => {
    setActiveDropdown(null);
    if (secretary.ativo) {
      const confirmed = await confirmAction({
        title: 'Desativar secretária?',
        text: `${secretary.nome} perderá o acesso ao sistema até ser reativada.`,
        confirmText: 'Sim, desativar',
        danger: true,
      });
      if (!confirmed) return;
    }

    try {
      setTogglingSecretaryId(secretary.id);
      await ApiClient.patch(`/secretarias/${secretary.id}/${secretary.ativo ? 'desativar' : 'reativar'}`);
      toast.success(secretary.ativo ? 'Secretária desativada.' : 'Secretária reativada.');
      await fetchSecretaries();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar a secretária.');
    } finally {
      setTogglingSecretaryId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfessional || !user?.clinica_id) return;

    try {
      setIsSaving(true);
      const payload: ProfissionalRequest = {
        nome: newProfessional.nome || '',
        email: newProfessional.email || '',
        senha: newProfessional.senha || '',
        cro: newProfessional.cro || '',
        clinicaId: user.clinica_id
      };

      await ApiClient.post('/profissionais', payload);

      toast.success('Profissional cadastrado com sucesso!');
      await fetchProfessionals();
      setNewProfessional({ nome: '', email: '', senha: '', cro: '' });
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar profissional.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSecretary = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      await ApiClient.post('/secretarias', {
        nome: newSecretary.nome,
        email: newSecretary.email,
        senha: newSecretary.senha
      });

      toast.success('Secretária cadastrada com sucesso!');
      setNewSecretary({ nome: '', email: '', senha: '' });
      setIsCreatingSecretary(false);
      if (activeTab === 'secretarias') await fetchSecretaries();
      else setActiveTab('secretarias');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar secretária.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfessional || !user?.clinica_id) return;

    try {
      setIsSaving(true);
      const payload: ProfissionalRequest = {
        nome: editingProfessional.nome,
        email: editingProfessional.email,
        senha: '', // Não precisa de senha na edição conforme solicitado
        cro: editingProfessional.cro,
        clinicaId: user.clinica_id
      };

      await ApiClient.put(`/profissionais/${editingProfessional.id}`, payload);

      toast.success('Profissional atualizado com sucesso!');
      await fetchProfessionals();
      setEditingProfessional(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar profissional.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordId || !newPassword) return;

    try {
      setIsSaving(true);
      await ApiClient.patch(`/profissionais/${resettingPasswordId}/alterar-senha`, newPassword);

      toast.success('Senha redefinida com sucesso!');
      setResettingPasswordId(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfessionals = professionals.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cro?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columnCount = isSecretaria ? 3 : 4;

  return (
    <div className="animate-fade-in" onClick={() => activeDropdown && setActiveDropdown(null)}>
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Profissionais</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSecretaria ? 'Dentistas e profissionais da clínica' : 'Gerencie os dentistas, profissionais e secretárias da clínica'}
          </p>
        </div>
        {!isSecretaria && (
          <div className="flex-row items-center gap-2">
            <button className="btn btn-secondary" onClick={() => setIsCreatingSecretary(true)}>
              <ClipboardList size={18} /> Nova Secretária
            </button>
            <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
              <UserPlus size={18} /> Novo Profissional
            </button>
          </div>
        )}
      </div>

      {!isSecretaria && (
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'profissionais' ? 'active' : ''}`}
            onClick={() => setActiveTab('profissionais')}
          >
            <Stethoscope size={18} /> Profissionais
          </button>
          <button
            className={`tab-button ${activeTab === 'secretarias' ? 'active' : ''}`}
            onClick={() => setActiveTab('secretarias')}
          >
            <ClipboardList size={18} /> Secretárias
          </button>
        </div>
      )}

      {activeTab === 'secretarias' && !isSecretaria ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Situação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {secretariesLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>Carregando secretárias...</td>
                </tr>
              ) : secretariesError ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>{secretariesError}</td>
                </tr>
              ) : secretaries.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Nenhuma secretária cadastrada.
                  </td>
                </tr>
              ) : secretaries.map(sec => (
                <tr key={sec.id} style={{ opacity: sec.ativo ? 1 : 0.6 }}>
                  <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                    <div className="flex-row items-center gap-2">
                      <ClipboardList size={16} style={{ color: 'var(--primary)' }} />
                      {sec.nome}
                    </div>
                  </td>
                  <td>{sec.email}</td>
                  <td>
                    <span className={`badge ${sec.ativo ? 'badge-success' : 'badge-warning'}`}>
                      {sec.ativo ? 'Ativa' : 'Desativada'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="dropdown-container">
                      <button
                        className="action-btn"
                        disabled={togglingSecretaryId === sec.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === sec.id ? null : sec.id);
                        }}
                      >
                        <MoreVertical size={20} />
                      </button>

                      {activeDropdown === sec.id && (
                        <div className="dropdown-menu" style={{ right: 0, top: '100%' }}>
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setResettingPasswordId(sec.id);
                              setActiveDropdown(null);
                            }}
                          >
                            <Lock size={16} /> Redefinir Senha
                          </button>
                          <button
                            className={`dropdown-item ${sec.ativo ? 'danger' : ''}`}
                            onClick={() => handleToggleSecretary(sec)}
                          >
                            {sec.ativo ? <><UserX size={16} /> Desativar</> : <><UserCheck size={16} /> Reativar</>}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nome ou CRO..."
            style={{ paddingLeft: '40px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>CRO</th>
              {!isSecretaria && <th style={{ textAlign: 'right' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} style={{ textAlign: 'center', padding: '32px' }}>Carregando profissionais...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columnCount} style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>{error}</td>
              </tr>
            ) : filteredProfessionals.map(prof => (
              <tr key={prof.id}>
                <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                  <div className="flex-row items-center gap-2">
                    <Stethoscope size={16} style={{ color: 'var(--primary)' }} />
                    {prof.nome}
                  </div>
                </td>
                <td>{prof.email || 'N/A'}</td>
                <td>{prof.cro || 'N/A'}</td>
                {!isSecretaria && (
                <td style={{ textAlign: 'right' }}>
                  <div className="dropdown-container">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === prof.id ? null : prof.id);
                      }}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeDropdown === prof.id && (
                      <div className="dropdown-menu" style={{ right: 0, top: '100%' }}>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setEditingProfessional(prof);
                            setActiveDropdown(null);
                          }}
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setResettingPasswordId(prof.id);
                            setActiveDropdown(null);
                          }}
                        >
                          <Lock size={16} /> Redefinir Senha
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                )}
              </tr>
            ))}
            {!loading && filteredProfessionals.length === 0 && (
              <tr>
                <td colSpan={columnCount} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum profissional encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Profissional</h2>
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
                      placeholder="Ex: Dra. Ana Silva"
                      maxLength={100}
                      value={newProfessional.nome}
                      onChange={e => setNewProfessional({ ...newProfessional, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="email@clinica.com"
                        maxLength={100}
                        value={newProfessional.email}
                        onChange={e => setNewProfessional({ ...newProfessional, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">CRO</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="00000-SP"
                        maxLength={15}
                        value={newProfessional.cro}
                        onChange={e => setNewProfessional({ ...newProfessional, cro: applyCroMask(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Senha</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Defina uma senha"
                      maxLength={255}
                      value={newProfessional.senha}
                      onChange={e => setNewProfessional({ ...newProfessional, senha: e.target.value })}
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
                  {isSaving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreatingSecretary && (
        <div className="modal-overlay" onClick={() => setIsCreatingSecretary(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Secretária</h2>
              <button onClick={() => setIsCreatingSecretary(false)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateSecretary}>
              <div className="modal-body">
                <div className="form-group-container">
                  <div className="form-group">
                    <label className="input-label">Nome Completo</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Maria Souza"
                      maxLength={100}
                      value={newSecretary.nome}
                      onChange={e => setNewSecretary({ ...newSecretary, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="email@clinica.com"
                      maxLength={100}
                      value={newSecretary.email}
                      onChange={e => setNewSecretary({ ...newSecretary, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Senha</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Defina uma senha"
                      maxLength={255}
                      value={newSecretary.senha}
                      onChange={e => setNewSecretary({ ...newSecretary, senha: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingSecretary(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProfessional && (
        <div className="modal-overlay" onClick={() => setEditingProfessional(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Profissional</h2>
              <button onClick={() => setEditingProfessional(null)} className="action-btn">
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
                      placeholder="Ex: Dra. Ana Silva"
                      maxLength={100}
                      value={editingProfessional.nome}
                      onChange={e => setEditingProfessional({ ...editingProfessional, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="email@clinica.com"
                        maxLength={100}
                        value={editingProfessional.email}
                        onChange={e => setEditingProfessional({ ...editingProfessional, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">CRO</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="00000-SP"
                        maxLength={15}
                        value={editingProfessional.cro}
                        onChange={e => setEditingProfessional({ ...editingProfessional, cro: applyCroMask(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProfessional(null)}>
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
      {resettingPasswordId && (
        <div className="modal-overlay" onClick={() => setResettingPasswordId(null)}>
          <div className="modal-content" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Redefinir Senha</h2>
              <button onClick={() => setResettingPasswordId(null)} className="action-btn">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div className="form-group-container">
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Defina uma nova senha de acesso. Ela deverá ser utilizada no próximo login.
                  </p>
                  <div className="form-group">
                    <label className="input-label">Nova Senha</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResettingPasswordId(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Alterando...' : 'Confirmar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
