import { useState, useEffect } from 'react';
import { Sliders, Shield, FileEdit, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import toast from 'react-hot-toast';
import './Settings.css';

interface ClinicaConfiguracoes {
  clinicaId: string;
  nomeClinica: string;
  permiteAlterarAtendimentosConcluidos: boolean;
  profissionaisSoPodemVerSeusAtendimentos: boolean;
}

export function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<ClinicaConfiguracoes | null>(null);

  useEffect(() => {
    async function loadConfigs() {
      if (!user?.clinica_id) return;
      try {
        setLoading(true);
        const data = await ApiClient.get<ClinicaConfiguracoes>(`/clinicas/configuracoes/${user.clinica_id}`);
        setConfigs(data);
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar configurações da clínica.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadConfigs();
  }, [user?.clinica_id]);

  const handleToggleAlterarAtendimentos = () => {
    if (!configs) return;
    setConfigs({
      ...configs,
      permiteAlterarAtendimentosConcluidos: !configs.permiteAlterarAtendimentosConcluidos
    });
  };

  const handleToggleVerSeusAtendimentos = () => {
    if (!configs) return;
    setConfigs({
      ...configs,
      profissionaisSoPodemVerSeusAtendimentos: !configs.profissionaisSoPodemVerSeusAtendimentos
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configs || !user?.clinica_id) return;

    try {
      setIsSaving(true);
      const payload = {
        clinicaId: user.clinica_id,
        permiteAlterarAtendimentosConcluidos: configs.permiteAlterarAtendimentosConcluidos,
        profissionaisSoPodemVerSeusAtendimentos: configs.profissionaisSoPodemVerSeusAtendimentos
      };

      await ApiClient.put('/clinicas/configuracoes', payload);
      toast.success('Configurações atualizadas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando configurações...</p>
      </div>
    );
  }

  if (!configs) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '48px', textAlign: 'center', color: 'var(--danger)' }}>
        <p>Não foi possível carregar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in settings-page-container">
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 className="flex-row items-center gap-2" style={{ fontSize: '1.75rem', marginBottom: '8px', margin: 0, fontWeight: 700 }}>
            <Sliders size={28} style={{ color: 'var(--primary)' }} /> Configurações
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Gerencie as regras de negócio e preferências da clínica: <strong>{configs.nomeClinica}</strong>
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-panel settings-form" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <Shield size={20} style={{ color: 'var(--primary)' }} /> Preferências do Sistema
        </h2>

        <div className="settings-list">
          
          {/* Configuração 1 */}
          <div className="setting-item-row">
            <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
              <div className="setting-icon-container">
                <FileEdit size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Alteração de Atendimentos Concluídos</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                  Permite que profissionais de saúde editem ou excluam atendimentos que já foram finalizados (status "Concluído" ou "Cancelado"). Se desativado, esses registros serão bloqueados.
                </p>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={configs.permiteAlterarAtendimentosConcluidos}
                onChange={handleToggleAlterarAtendimentos}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Configuração 2 */}
          <div className="setting-item-row">
            <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
              <div className="setting-icon-container">
                <EyeOff size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Privacidade de Atendimentos</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                  Restringe a visibilidade dos atendimentos no prontuário do paciente. Se ativado, cada profissional só poderá ver os atendimentos realizados por ele mesmo.
                </p>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={configs.profissionaisSoPodemVerSeusAtendimentos}
                onChange={handleToggleVerSeusAtendimentos}
              />
              <span className="slider"></span>
            </label>
          </div>

        </div>

        <div className="flex-row justify-end" style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
