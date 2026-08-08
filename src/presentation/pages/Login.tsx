import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Mail, AlertTriangle, ExternalLink, AlertCircle,
  CalendarCheck, BarChart3, Shield
} from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const data = await ApiClient.post<any>('/auth/login', { email, senha: password });

      if (data && data.paymentLink) {
        setPaymentLink(data.paymentLink);
      } else if (data && data.accessToken) {
        login(data);
        navigate('/pacientes');
      } else {
        throw new Error('Falha ao obter tokens de acesso.');
      }
    } catch (err: any) {
      setError(err.message || 'Email ou senha inválidos. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel - Branding & Persuasion */}
      <div className="login-left">
        <div className="login-left-content">
          <img
            src="/odontech_logo_azul.svg"
            alt="OdonTech Logo"
          />
          <h2 className="login-left-tagline">
            Gerencie sua clínica com <span>inteligência</span>.
          </h2>
          <p className="login-left-desc">
            Pacientes, agendamentos, prontuários e financeiro — tudo em um só lugar, de forma simples e segura.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <CalendarCheck size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Agenda Inteligente</h4>
                <p>Gerencie horários e agendamentos com facilidade.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <BarChart3 size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Controle Financeiro</h4>
                <p>Acompanhe receitas, pagamentos e relatórios.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Shield size={20} />
              </div>
              <div className="login-feature-text">
                <h4>Seguro e Confiável</h4>
                <p>Seus dados protegidos com criptografia de ponta.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right">
        <div className="login-right-inner">
          <div className="login-right-header">
            <h1>Bem-vindo de volta</h1>
            <p>Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="login-form-group">
              <label>Email Profissional</label>
              <div className="login-input-wrapper">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="seu@email.com"
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
              {loading ? 'Acessando...' : 'Acessar Sistema'}
            </button>
          </form>

          <div className="login-register-link">
            Ainda não tem uma conta? <a href="/registro">Registre-se</a>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentLink && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-icon">
              <AlertTriangle size={48} />
            </div>
            <h2 className="payment-modal-title">Pagamento Pendente</h2>
            <p className="payment-modal-description">
              Para liberar o acesso ao sistema, é necessário realizar o pagamento da sua assinatura.
            </p>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="payment-modal-btn"
            >
              <ExternalLink size={18} />
              Realizar Pagamento
            </a>
            <p className="payment-modal-hint">
              Após o pagamento, faça login novamente para acessar o sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
