import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

      if (data && data.accessToken) {
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
    <div className="login-container">
      <div className="login-background"></div>

      <div className="login-box glass-panel animate-fade-in">
        <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/odontech_logo_azul.svg"
            alt="OdonTech Logo"
            style={{ height: '240px', width: 'auto', marginBottom: '8px' }}
          />
          <p className="login-subtitle">Software de Gestão Odontológica</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', border: '1px solid #fee2e2' }}>{error}</div>}
          <div className="form-group">
            <label className="input-label">Email Profissional</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                maxLength={100}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Senha</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="input-field"
                placeholder="Sua senha secreta"
                maxLength={255}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full login-btn" disabled={loading}>
            {loading ? 'Acessando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
