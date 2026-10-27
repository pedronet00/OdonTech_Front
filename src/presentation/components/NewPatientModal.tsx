import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Patient } from '../../domain/models/types';
import { applyCpfMask, applyPhoneMask, applyCepMask } from '../../utils/masks';
import { validateEndereco } from '../../utils/endereco';
import { CONVENIO_MAP } from '../../domain/models/convenios';

const emptyPatient = (): Partial<Patient> => ({
  nome: '', email: '', cpf: '', dataNascimento: '', sexo: 'Masculino', convenio: null, telefone: '',
  endereco: { logradouro: '', numero: 0, complemento: '', bairro: '', cidade: '', estado: '', cep: '' },
  profissao: '', nomeContatoEmergencia: '', telefoneContatoEmergencia: ''
});

const digitsOf = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

interface NewPatientModalProps {
  /** Campos já preenchidos ao abrir (ex.: o nome digitado na busca). */
  initialData?: Partial<Patient>;
  onClose: () => void;
  /** Recebe o paciente cadastrado, já com id. */
  onCreated: (patient: Patient) => void;
}

export function NewPatientModal({ initialData, onClose, onCreated }: NewPatientModalProps) {
  const { user } = useAuth();
  const [newPatient, setNewPatient] = useState<Partial<Patient>>(() => ({ ...emptyPatient(), ...initialData }));
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Descobre o paciente recém-criado: usa o corpo da resposta quando ele traz o id
   * e, se não trouxer, procura na lista da clínica pelo CPF ou por nome + telefone.
   */
  const resolveCreated = async (response: unknown, payload: Partial<Patient>): Promise<Patient | null> => {
    if (response && typeof response === 'object' && 'id' in response && (response as Patient).id) {
      return { ...payload, ...(response as Patient) } as Patient;
    }
    if (typeof response === 'string' && response) {
      return { ...payload, id: response } as Patient;
    }
    if (!user?.clinica_id) return null;
    const list = await ApiClient.get<Patient[]>(`/pacientes/clinica/${user.clinica_id}`);
    const cpf = digitsOf(payload.cpf);
    const matches = list.filter(p => cpf
      ? digitsOf(p.cpf) === cpf
      : p.nome.trim().toLowerCase() === payload.nome?.trim().toLowerCase() && digitsOf(p.telefone) === digitsOf(payload.telefone));
    return matches[matches.length - 1] ?? null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinica_id) return;

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
        convenio: newPatient.convenio || null,
        endereco: validation.data,
        profissao: newPatient.profissao || null,
        nomeContatoEmergencia: newPatient.nomeContatoEmergencia || null,
        telefoneContatoEmergencia: newPatient.telefoneContatoEmergencia || null
      };
      const response = await ApiClient.post<unknown>('/pacientes', payload);
      toast.success('Paciente cadastrado com sucesso!');
      const created = await resolveCreated(response, { ...payload, sexo: newPatient.sexo ?? 'Masculino' }).catch(() => null);
      if (created) onCreated(created);
      else onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar paciente.');
    } finally {
      setIsSaving(false);
    }
  };

  const setEndereco = (patch: Partial<NonNullable<Patient['endereco']>>) =>
    setNewPatient({ ...newPatient, endereco: { ...newPatient.endereco!, ...patch } });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-patient-title">
        <div className="modal-header">
          <h2 id="new-patient-title">Novo Paciente</h2>
          <button type="button" onClick={onClose} className="action-btn" aria-label="Fechar">
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
                  autoFocus
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
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">Data de Nascimento</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newPatient.dataNascimento || ''}
                    onChange={e => setNewPatient({ ...newPatient, dataNascimento: e.target.value })}
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
                  <label className="input-label">Convênio</label>
                  <select
                    className="input-field"
                    value={newPatient.convenio ?? ''}
                    onChange={e => setNewPatient({ ...newPatient, convenio: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Não informado</option>
                    {Object.entries(CONVENIO_MAP).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* — Profissão & Emergência — */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Profissão &amp; Contato de Emergência</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              </div>

              {/* — Endereço — */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Endereço Residencial</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label className="input-label">Logradouro</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Rua, Av., Travessa..."
                        value={newPatient.endereco?.logradouro || ''}
                        onChange={e => setEndereco({ logradouro: e.target.value })}
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
                        onChange={e => setEndereco({ numero: Number(e.target.value) })}
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
                        onChange={e => setEndereco({ complemento: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Bairro</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Centro"
                        value={newPatient.endereco?.bairro || ''}
                        onChange={e => setEndereco({ bairro: e.target.value })}
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
                        onChange={e => setEndereco({ cidade: e.target.value })}
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
                        onChange={e => setEndereco({ estado: e.target.value.toUpperCase() })}
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
                      onChange={e => setEndereco({ cep: applyCepMask(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Cadastrando...' : 'Cadastrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
