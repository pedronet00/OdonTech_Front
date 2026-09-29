import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Mail, AlertCircle, ArrowLeft, Building2, ChevronRight,
  Search, ShieldCheck, Layers, KeyRound
} from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { ApiResponse } from '../../infrastructure/api/apiClient';
import { API_BASE_URL } from '../../infrastructure/config/api';
import './Login.css';
import './AdminLogin.css';

interface ClinicaAdmin {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
  estado: string;
}

interface LoginAdminResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  clinicas: ClinicaAdmin[];
  clinicaSelecionadaId: string | null;
}

interface SelecionarClinicaResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// O token da visão global ainda não pode ir para o localStorage: o app o trataria como
// sessão de clínica. Por isso a seleção usa fetch direto com o token mantido em memória.
async function selecionarClinica(globalToken: string, clinicaId: string): Promise<SelecionarClinicaResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/selecionar-clinica`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${globalToken}`
    },
    body: JSON.stringify({ clinicaId })
  });

  let result: ApiResponse<SelecionarClinicaResponse> | null = null;
  try {
    result = await response.json();
  } catch (e) {}

  if (result?.isSuccess && result.data) {
    return result.data;
  }

  if (response.status === 401) {
    throw new Error('Sua sessão administrativa expirou. Faça login novamente.');
  }

  throw new Error(result?.errors?.[0]?.message || 'Não foi possível acessar a clínica selecionada.');
}

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminSession, setAdminSession] = useState<LoginAdminResponse | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionandoId, setSelecionandoId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const clinicasFiltradas = useMemo(() => {
    if (!adminSession) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return adminSession.clinicas;
    return adminSession.clinicas.filter(c =>
      [c.nome, c.cnpj, c.cidade, c.estado].some(v => v?.toLowerCase().includes(termo))
    );
  }, [adminSession, busca]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const data = await ApiClient.post<LoginAdminResponse>('/auth/login-admin', { email, senha: password });

      if (!data || !data.accessToken) {
        throw new Error('Falha ao obter tokens de acesso.');
      }

      setAdminSession({ ...data, clinicas: data.clinicas ?? [] });
    } catch (err: any) {
      setError(err.message || 'Email ou senha inválidos. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarClinica = async (clinicaId: string) => {
    if (!adminSession || selecionandoId) return;
    setError('');
    setSelecionandoId(clinicaId);

    try {
      const data = await selecionarClinica(adminSession.accessToken, clinicaId);
      login(data);
      navigate('/pacientes');
    } catch (err: any) {
      setError(err.message);
      console.error(err);
      if (err.message?.includes('expirou')) {
        setAdminSession(null);
      }
    } finally {
      setSelecionandoId(null);
    }
  };

  const handleVoltarLogin = () => {
    setAdminSession(null);
    setBusca('');
    setError('');
    setPassword('');
  };

  return (
    <div className="login-page">
      {/* Left Panel - Branding */}
      <div className="login-left">
        <div className="login-left-content">
          <img
            src="/odontech_logo_azul.svg"
            alt="OdonTech Logo"
          />
          <h2 className="login-left-tagline">
            Área <span>administrativa</span>.
          </h2>
          <p className="login-left-desc">
            Acesso restrito à equipe OdonTech para suporte e gestão das clínicas cadastradas.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Layers size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Visão Global</h4>
                <p>Acesse qualquer clínica a partir de um único login.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <KeyRound size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Acesso Contextual</h4>
                <p>Navegue pelo sistema como um usuário da clínica escolhida.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Acesso Restrito</h4>
                <p>Somente administradores autorizados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-right-inner">
          {!adminSession ? (
            <>
              <div className="login-right-header">
                <span className="admin-login-badge">
                  <ShieldCheck size={14} />
                  Administrador
                </span>
                <h1>Área Administrativa</h1>
                <p>Entre com suas credenciais de administrador</p>
              </div>

              <form onSubmit={handleLogin} className="login-form">
                {error && (
                  <div className="login-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="login-form-group">
                  <label>Email</label>
                  <div className="login-input-wrapper">
                    <Mail size={18} />
                    <input
                      type="email"
                      placeholder="admin@odontech.app.br"
                      maxLength={100}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label>Senha</label>
                  <div className="login-input-wrapper">
                    <Lock size={18} />
                    <input
                      type="password"
                      placeholder="Sua senha secreta"
                      maxLength={255}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? 'Acessando...' : 'Entrar como Administrador'}
                </button>
              </form>

              <div className="login-register-link">
                <a href="/entrar" onClick={(e) => { e.preventDefault(); navigate('/entrar'); }}>
                  <ArrowLeft size={14} className="admin-inline-icon" />
                  Voltar ao login de clínica
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="login-right-header">
                <span className="admin-login-badge">
                  <ShieldCheck size={14} />
                  Administrador
                </span>
                <h1>Escolha a clínica</h1>
                <p>Selecione a clínica que deseja acessar</p>
              </div>

              {error && (
                <div className="login-error admin-error-spacing">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {adminSession.clinicas.length > 5 && (
                <div className="login-input-wrapper admin-clinicas-busca">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CNPJ ou cidade"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="admin-clinicas-lista">
                {adminSession.clinicas.length === 0 ? (
                  <div className="admin-clinicas-vazio">Nenhuma clínica cadastrada.</div>
                ) : clinicasFiltradas.length === 0 ? (
                  <div className="admin-clinicas-vazio">Nenhuma clínica encontrada para "{busca}".</div>
                ) : (
                  clinicasFiltradas.map(clinica => (
                    <button
                      key={clinica.id}
                      type="button"
                      className="admin-clinica-item"
                      onClick={() => handleSelecionarClinica(clinica.id)}
                      disabled={!!selecionandoId}
                    >
                      <div className="admin-clinica-icon">
                        <Building2 size={18} />
                      </div>
                      <div className="admin-clinica-info">
                        <strong>{clinica.nome}</strong>
                        <span>
                          {[clinica.cidade && clinica.estado ? `${clinica.cidade} - ${clinica.estado}` : clinica.cidade || clinica.estado, clinica.cnpj]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <div className="admin-clinica-action">
                        {selecionandoId === clinica.id ? 'Acessando...' : <ChevronRight size={18} />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="login-register-link">
                <a href="/entrar/admin" onClick={(e) => { e.preventDefault(); handleVoltarLogin(); }}>
                  <ArrowLeft size={14} className="admin-inline-icon" />
                  Entrar com outra conta
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
