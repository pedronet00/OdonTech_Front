import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FilePlus, Activity, ArrowLeft, Calendar, User, Hash, MoreVertical, Edit, Trash2, X, File, Download, Image, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Atendimento, Patient } from '../../domain/models/types';
import toast from 'react-hot-toast';

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

  // File management state
  const [activeTab, setActiveTab] = useState<'timeline' | 'files'>('timeline');
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const patientRes = await ApiClient.get(`/pacientes/${id}`);
      if (patientRes.ok) {
        const pData = await patientRes.json();
        setPatient(pData);
      }

      const atendimentosRes = await ApiClient.get(`/atendimentos/paciente/${id}`);

      if (!atendimentosRes.ok) throw new Error('Falha ao carregar atendimentos');

      const aData = await atendimentosRes.json();
      setAtendimentos(aData);
    } catch (err) {
      toast.error('Não foi possível carregar o prontuário.');
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
      const response = await ApiClient.get(`/pacientes/${id}/arquivos`);
      if (response.ok) {
        setArquivos(await response.json());
      }
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

      const response = await ApiClient.post(`/pacientes/${id}/arquivos`, formData);

      if (!response.ok) throw new Error('Falha no upload');

      toast.success('Arquivo enviado com sucesso!');
      fetchArquivos();
    } catch (err) {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (arquivoId: string, nomeOriginal: string) => {
    try {
      const response = await ApiClient.get(`/pacientes/${id}/arquivos/${arquivoId}/download`);
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
      const response = await ApiClient.delete(`/pacientes/${id}/arquivos/${arquivoId}`);
      if (!response.ok) throw new Error('Falha ao excluir');
      toast.success('Arquivo excluído!');
      fetchArquivos();
    } catch (err) {
      toast.error('Erro ao excluir arquivo.');
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
      const response = await ApiClient.patch(`/atendimentos/${atendimentoId}/status?status=${newStatusText}`);

      if (!response.ok) throw new Error('Falha ao atualizar status');

      toast.success('Status atualizado com sucesso!');
      setActiveDropdown(null);
      await fetchData();
    } catch (err) {
      toast.error('Erro ao atualizar status do atendimento.');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEdit = async (atendimentoId: string) => {
    try {
      setUpdatingId(atendimentoId);
      const response = await ApiClient.get(`/atendimentos/${atendimentoId}`);
      if (!response.ok) throw new Error('Falha ao buscar dados do atendimento');
      const data = await response.json();
      setEditingAtendimento(data);
      setActiveDropdown(null);
    } catch (err) {
      toast.error('Erro ao buscar dados para edição.');
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
        dente: editingAtendimento.dente || 0,
        tipoAtendimento: tipoMap[editingAtendimento.tipoAtendimento] || 1,
        statusAtendimento: statusMap[editingAtendimento.statusAtendimento] || 1
      };

      const response = await ApiClient.put(`/atendimentos/${editingAtendimento.id}`, payload);

      if (!response.ok) throw new Error('Falha ao atualizar atendimento');

      toast.success('Atendimento atualizado com sucesso!');
      setEditingAtendimento(null);
      await fetchData();
    } catch (err) {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (atendimentoId: string) => {
    if (!window.confirm('Deseja realmente excluir este atendimento?')) return;

    try {
      setUpdatingId(atendimentoId);
      const response = await ApiClient.delete(`/atendimentos/${atendimentoId}`);

      if (!response.ok) throw new Error('Falha ao excluir atendimento');

      toast.success('Atendimento excluído!');
      await fetchData();
    } catch (err) {
      toast.error('Erro ao excluir atendimento.');
    } finally {
      setUpdatingId(null);
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
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Prontuário {patient ? `- ${patient.nome}` : ''}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Histórico clínico e documentos digitais do paciente</p>
        </div>
        {activeTab === 'timeline' && (
          <button className="btn btn-primary" onClick={() => toast.success('Módulo em desenvolvimento')}>
            <FilePlus size={18} /> Novo Atendimento
          </button>
        )}
      </div>

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
                          {atendimento.dente && (
                            <span className="flex-row items-center gap-1">
                              <Hash size={14} /> Dente: <span className="dente-badge">{atendimento.dente}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-row items-center gap-3">
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => handlePrint(atendimento)}
                      >
                        <FileText size={14} /> Imprimir Registro
                      </button>

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
                            {!isFinalized ? (
                              <>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleEdit(atendimento.id)}
                                  disabled={updatingId === atendimento.id}
                                >
                                  <Edit size={16} /> Editar
                                </button>
                                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }}></div>
                                <div className="p-2">
                                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '8px' }}>Alterar Status</p>
                                  <div className="flex-col gap-1">
                                    {Object.keys(statusMap).map(status => (
                                      <button
                                        key={status}
                                        className="dropdown-item"
                                        onClick={() => handleStatusUpdate(atendimento.id, status)}
                                        disabled={updatingId === atendimento.id}
                                        style={{ padding: '6px 8px' }}
                                      >
                                        {status}
                                      </button>
                                    ))}
                                  </div>
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
                            ) : (
                              <div className="p-3" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', width: '180px' }}>
                                <FileText size={16} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                                <p>Este registro está <strong>{atendimento.statusAtendimento}</strong> e não pode mais ser alterado.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>{atendimento.descricao}</p>
                  </div>
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

                  <div className="grid-cols-2">
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
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAtendimento(null)}>
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
