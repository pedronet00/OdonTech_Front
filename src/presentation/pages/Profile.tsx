import { useCallback, useEffect, useId, useState } from 'react';
import { AlertCircle, Building2, Eye, EyeOff, KeyRound, Loader2, RotateCcw, Save, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../application/contexts/AuthContext';
import { ApiError } from '../../infrastructure/api/apiClient';
import { alterarSenha, atualizarPerfil, obterPerfil } from '../../infrastructure/api/perfilService';
import type { Perfil } from '../../domain/models/types';
import { applyCroMask, applyPhoneMask } from '../../utils/masks';
import { initials } from '../components/agenda/agendaUtils';
import './Profile.css';

const PERFIL_LABEL: Record<string, string> = {
  profissional: 'Profissional',
  secretaria: 'Secretária',
  superadmin: 'Administrador',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SENHA = 8;

type InfoField = 'nome' | 'email' | 'telefone' | 'cro';
type SenhaField = 'senhaAtual' | 'novaSenha' | 'confirmacao';
type Errors<K extends string> = Partial<Record<K, string>>;

interface InfoForm { nome: string; email: string; telefone: string; cro: string }

const toForm = (p: Perfil): InfoForm => ({
  nome: p.nome ?? '',
  email: p.email ?? '',
  telefone: p.telefone ? applyPhoneMask(p.telefone) : '',
  cro: p.cro ?? '',
});

const sameForm = (a: InfoForm, b: InfoForm) =>
  a.nome.trim() === b.nome.trim() &&
  a.email.trim().toLowerCase() === b.email.trim().toLowerCase() &&
  a.telefone.replace(/\D/g, '') === b.telefone.replace(/\D/g, '') &&
  a.cro.trim() === b.cro.trim();

/**
 * Separa os erros da API: os que têm `target` conhecido vão para o campo; o resto vira toast.
 * `fields` mapeia o target do backend (comparado sem caixa) para o nome do campo no formulário.
 */
function splitApiErrors<K extends string>(err: unknown, fields: Record<string, K>, fallback: string) {
  const fieldErrors: Errors<K> = {};
  const general: string[] = [];
  if (err instanceof ApiError && err.errors.length > 0) {
    for (const e of err.errors) {
      const field = e.target ? fields[e.target.toLowerCase()] : undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = e.message;
      else if (!field) general.push(e.message);
    }
  } else {
    general.push(err instanceof Error && err.message ? err.message : fallback);
  }
  return { fieldErrors, general };
}

/* ------------------------------------------------------------------ */

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: (describedBy: string | undefined) => React.ReactNode;
}

function Field({ id, label, error, hint, required, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`pf-field ${error ? 'has-error' : ''}`}>
      <label className="input-label" htmlFor={id}>
        {label} {required && <span className="pf-required" aria-hidden="true">*</span>}
      </label>
      {children(describedBy)}
      {error && <p className="pf-error" id={errorId}><AlertCircle size={14} aria-hidden="true" />{error}</p>}
      {hint && <p className="pf-hint" id={hintId}>{hint}</p>}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid, placeholder }: {
  id: string; value: string; onChange: (v: string) => void; autoComplete: string;
  describedBy?: string; invalid: boolean; placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="pf-password">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={255}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="pf-eye"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="pf-page" aria-busy="true" aria-label="Carregando perfil">
      <div className="glass-panel pf-header">
        <span className="pf-skel pf-skel-avatar" />
        <div className="pf-skel-lines">
          <span className="pf-skel" style={{ width: '220px', height: '22px' }} />
          <span className="pf-skel" style={{ width: '180px', height: '14px' }} />
          <span className="pf-skel" style={{ width: '140px', height: '20px' }} />
        </div>
      </div>
      <div className="pf-grid">
        {[5, 4].map((rows, i) => (
          <div key={i} className="glass-panel pf-card">
            <span className="pf-skel" style={{ width: '170px', height: '18px', marginBottom: '24px' }} />
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="pf-skel-field">
                <span className="pf-skel" style={{ width: '90px', height: '12px' }} />
                <span className="pf-skel" style={{ width: '100%', height: '44px' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Profile() {
  const { updateUser, refreshSession } = useAuth();
  const uid = useId();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<InfoForm>({ nome: '', email: '', telefone: '', cro: '' });
  const [infoErrors, setInfoErrors] = useState<Errors<InfoField>>({});
  const [savingInfo, setSavingInfo] = useState(false);

  const emptySenha = { senhaAtual: '', novaSenha: '', confirmacao: '' };
  const [senha, setSenha] = useState(emptySenha);
  const [senhaErrors, setSenhaErrors] = useState<Errors<SenhaField>>({});
  const [savingSenha, setSavingSenha] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await obterPerfil();
      setPerfil(data);
      setForm(toForm(data));
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : 'Não foi possível carregar o seu perfil.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial dos dados da tela
    load();
  }, [load]);

  if (loading) return <ProfileSkeleton />;

  if (loadError || !perfil) {
    return (
      <div className="pf-page">
        <div className="glass-panel pf-state" role="alert">
          <AlertCircle size={40} className="pf-state-icon" aria-hidden="true" />
          <h2>Não foi possível carregar o seu perfil</h2>
          <p>{loadError ?? 'Tente novamente em instantes.'}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            <RotateCcw size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isProfissional = perfil.perfil === 'profissional';
  const dirty = !sameForm(form, toForm(perfil));
  const perfilLabel = PERFIL_LABEL[perfil.perfil];

  const setInfo = (field: InfoField, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (infoErrors[field]) setInfoErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const setSenhaField = (field: SenhaField, value: string) => {
    setSenha(prev => ({ ...prev, [field]: value }));
    if (senhaErrors[field]) setSenhaErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateInfo = (): Errors<InfoField> => {
    const errors: Errors<InfoField> = {};
    if (!form.nome.trim()) errors.nome = 'Informe o seu nome.';
    if (!form.email.trim()) errors.email = 'Informe o seu e-mail.';
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Informe um e-mail válido, como nome@exemplo.com.';
    const phoneDigits = form.telefone.replace(/\D/g, '').length;
    if (phoneDigits > 0 && phoneDigits !== 10 && phoneDigits !== 11) errors.telefone = 'Informe o DDD e o número, com 10 ou 11 dígitos.';
    return errors;
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || savingInfo) return;
    const errors = validateInfo();
    setInfoErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingInfo(true);
    try {
      const updated = await atualizarPerfil({
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        ...(isProfissional ? { cro: form.cro.trim() || null } : {}),
      });
      setPerfil(updated);
      setForm(toForm(updated));
      updateUser({ nome: updated.nome, email: updated.email, cro: updated.cro ?? '' });
      toast.success('Perfil atualizado');
      // O token guarda nome, e-mail e CRO: busca um novo com os dados atualizados.
      refreshSession().then(ok => {
        if (!ok) console.warn('Perfil salvo, mas não foi possível renovar o token agora.');
      });
    } catch (err) {
      const { fieldErrors, general } = splitApiErrors<InfoField>(
        err,
        { nome: 'nome', email: 'email', telefone: 'telefone', cro: 'cro' },
        'Não foi possível salvar o perfil.',
      );
      setInfoErrors(fieldErrors);
      general.forEach(message => toast.error(message));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSenha) return;
    const errors: Errors<SenhaField> = {};
    if (!senha.senhaAtual) errors.senhaAtual = 'Informe a sua senha atual.';
    if (senha.novaSenha.length < MIN_SENHA) errors.novaSenha = `A nova senha precisa ter pelo menos ${MIN_SENHA} caracteres.`;
    else if (senha.novaSenha === senha.senhaAtual) errors.novaSenha = 'A nova senha precisa ser diferente da atual.';
    if (!senha.confirmacao) errors.confirmacao = 'Repita a nova senha.';
    else if (senha.confirmacao !== senha.novaSenha) errors.confirmacao = 'As senhas não conferem.';
    setSenhaErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingSenha(true);
    try {
      await alterarSenha({ senhaAtual: senha.senhaAtual, novaSenha: senha.novaSenha });
      setSenha(emptySenha);
      setSenhaErrors({});
      toast.success('Senha alterada com sucesso');
    } catch (err) {
      const { fieldErrors, general } = splitApiErrors<SenhaField>(
        err,
        { senhaatual: 'senhaAtual', novasenha: 'novaSenha' },
        'Não foi possível alterar a senha.',
      );
      // "Senha atual incorreta." pode vir sem target: mostra no campo, que é onde o usuário vai corrigir.
      const wrongCurrent = general.findIndex(m => /senha atual/i.test(m));
      if (wrongCurrent >= 0 && !fieldErrors.senhaAtual) fieldErrors.senhaAtual = general.splice(wrongCurrent, 1)[0];
      setSenhaErrors(fieldErrors);
      general.forEach(message => toast.error(message));
    } finally {
      setSavingSenha(false);
    }
  };

  const id = (name: string) => `${uid}-${name}`;

  return (
    <div className="pf-page animate-fade-in">
      <header className="glass-panel pf-header">
        <div className="pf-avatar" aria-hidden="true">{initials(perfil.nome || perfil.email)}</div>
        <div className="pf-identity">
          <h1>{perfil.nome}</h1>
          <p className="pf-email">{perfil.email}</p>
          <div className="pf-tags">
            {perfilLabel && <span className={`pf-badge is-${perfil.perfil}`}>{perfilLabel}</span>}
            {perfil.clinicaNome && (
              <span className="pf-clinic"><Building2 size={14} aria-hidden="true" /> {perfil.clinicaNome}</span>
            )}
          </div>
        </div>
      </header>

      <div className="pf-grid">
        {/* Informações pessoais */}
        <form className="glass-panel pf-card" onSubmit={handleSaveInfo} noValidate>
          <h2 className="pf-card-title"><UserRound size={20} aria-hidden="true" /> Informações pessoais</h2>

          <div className="pf-fields">
            <Field id={id('nome')} label="Nome" required error={infoErrors.nome}>
              {describedBy => (
                <input
                  id={id('nome')}
                  className="input-field"
                  value={form.nome}
                  onChange={e => setInfo('nome', e.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  aria-invalid={!!infoErrors.nome || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>

            <Field
              id={id('email')}
              label="E-mail"
              required
              error={infoErrors.email}
              hint="Este e-mail é o seu login. Se mudar, use o novo e-mail para entrar no sistema."
            >
              {describedBy => (
                <input
                  id={id('email')}
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={e => setInfo('email', e.target.value)}
                  maxLength={100}
                  autoComplete="email"
                  aria-invalid={!!infoErrors.email || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>

            <div className={isProfissional ? 'pf-row' : undefined}>
              <Field id={id('telefone')} label="Telefone" error={infoErrors.telefone} hint="Opcional. Deixe em branco para remover.">
                {describedBy => (
                  <input
                    id={id('telefone')}
                    type="tel"
                    inputMode="numeric"
                    className="input-field"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={e => setInfo('telefone', applyPhoneMask(e.target.value))}
                    maxLength={15}
                    autoComplete="tel-national"
                    aria-invalid={!!infoErrors.telefone || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              {isProfissional && (
                <Field id={id('cro')} label="CRO" error={infoErrors.cro}>
                  {describedBy => (
                    <input
                      id={id('cro')}
                      className="input-field"
                      placeholder="00000-SP"
                      value={form.cro}
                      onChange={e => setInfo('cro', applyCroMask(e.target.value))}
                      maxLength={15}
                      aria-invalid={!!infoErrors.cro || undefined}
                      aria-describedby={describedBy}
                    />
                  )}
                </Field>
              )}
            </div>

            {perfil.clinicaNome && (
              <div className="pf-field">
                <span className="input-label" id={id('clinica')}>Clínica</span>
                <p className="pf-readonly" aria-labelledby={id('clinica')}>
                  <Building2 size={16} aria-hidden="true" /> {perfil.clinicaNome}
                </p>
              </div>
            )}
          </div>

          <div className="pf-actions">
            {dirty && !savingInfo && (
              <button type="button" className="btn btn-secondary" onClick={() => { setForm(toForm(perfil)); setInfoErrors({}); }}>
                Descartar
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={!dirty || savingInfo}>
              {savingInfo ? <Loader2 size={16} className="pf-spin" /> : <Save size={16} />}
              {savingInfo ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>

        {/* Alterar senha */}
        <form className="glass-panel pf-card" onSubmit={handleSaveSenha} noValidate>
          <h2 className="pf-card-title"><KeyRound size={20} aria-hidden="true" /> Alterar senha</h2>

          <div className="pf-fields">
            {/* Ajuda gerenciadores de senha a associar a nova senha à conta. */}
            <input type="email" value={perfil.email} autoComplete="username" readOnly hidden />

            <Field id={id('senhaAtual')} label="Senha atual" required error={senhaErrors.senhaAtual}>
              {describedBy => (
                <PasswordInput
                  id={id('senhaAtual')}
                  value={senha.senhaAtual}
                  onChange={v => setSenhaField('senhaAtual', v)}
                  autoComplete="current-password"
                  describedBy={describedBy}
                  invalid={!!senhaErrors.senhaAtual}
                />
              )}
            </Field>

            <Field id={id('novaSenha')} label="Nova senha" required error={senhaErrors.novaSenha} hint={`Mínimo de ${MIN_SENHA} caracteres.`}>
              {describedBy => (
                <PasswordInput
                  id={id('novaSenha')}
                  value={senha.novaSenha}
                  onChange={v => setSenhaField('novaSenha', v)}
                  autoComplete="new-password"
                  describedBy={describedBy}
                  invalid={!!senhaErrors.novaSenha}
                />
              )}
            </Field>

            <Field id={id('confirmacao')} label="Confirmar nova senha" required error={senhaErrors.confirmacao}>
              {describedBy => (
                <PasswordInput
                  id={id('confirmacao')}
                  value={senha.confirmacao}
                  onChange={v => setSenhaField('confirmacao', v)}
                  autoComplete="new-password"
                  describedBy={describedBy}
                  invalid={!!senhaErrors.confirmacao}
                />
              )}
            </Field>
          </div>

          <div className="pf-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingSenha || !senha.senhaAtual || !senha.novaSenha || !senha.confirmacao}
            >
              {savingSenha ? <Loader2 size={16} className="pf-spin" /> : <KeyRound size={16} />}
              {savingSenha ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
