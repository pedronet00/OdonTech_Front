import { useState, useEffect } from 'react';
import { Stethoscope, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import { API_BASE_URL } from '../../infrastructure/config/api';
import type { Profissional, ProfissionalRequest } from '../../domain/models/types';
import toast from 'react-hot-toast';
import { applyCroMask } from '../../utils/masks';

export function Professionals() {
  const { user, token } = useAuth();
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
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfessionals = async () => {
    if (!user?.clinica_id) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/profissionais/clinica/${user.clinica_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Falha ao carregar profissionais');

      const data = await response.json();
      setProfessionals(data);
    } catch (err) {
      setError('Não foi possível carregar a lista de profissionais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, [user?.clinica_id, token]);

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

      const response = await fetch(`${API_BASE_URL}/profissionais`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.[0]?.message || 'Falha ao cadastrar profissional');
      }

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

  const filteredProfessionals = professionals.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cro?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Profissionais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os dentistas e profissionais da clínica</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <UserPlus size={18} /> Novo Profissional
        </button>
      </div>

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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '32px' }}>Carregando profissionais...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>{error}</td>
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
              </tr>
            ))}
            {!loading && filteredProfessionals.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum profissional encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                    <label className="input-label">Senha Temporária</label>
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
    </div>
  );
}
