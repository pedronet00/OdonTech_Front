import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, ArrowRight, Sparkles, CalendarCheck, Users, Shield
} from 'lucide-react';
import './RegistroSucesso.css';

export function RegistroSucesso() {
  const navigate = useNavigate();

  return (
    <div className="sucesso-page">
      {/* Decorative background elements */}
      <div className="sucesso-bg-glow sucesso-bg-glow-1" />
      <div className="sucesso-bg-glow sucesso-bg-glow-2" />

      <div className="sucesso-content">
        {/* Animated success icon */}
        <div className="sucesso-icon-wrapper">
          <div className="sucesso-icon-ring" />
          <div className="sucesso-icon-circle">
            <CheckCircle2 size={44} strokeWidth={2.2} />
          </div>
          <div className="sucesso-sparkle sucesso-sparkle-1">
            <Sparkles size={16} />
          </div>
          <div className="sucesso-sparkle sucesso-sparkle-2">
            <Sparkles size={12} />
          </div>
          <div className="sucesso-sparkle sucesso-sparkle-3">
            <Sparkles size={14} />
          </div>
        </div>

        <h1 className="sucesso-title">Cadastro Realizado!</h1>
        <p className="sucesso-subtitle">
          Sua clínica foi registrada com sucesso no <strong>OdonTech</strong>.
          Agora você pode acessar a plataforma e começar a gerenciar tudo em um só lugar.
        </p>

        {/* What's next cards */}
        <div className="sucesso-next-steps">
          <div className="sucesso-step-card">
            <div className="sucesso-step-icon">
              <Users size={20} />
            </div>
            <div>
              <h4>Cadastre seus pacientes</h4>
              <p>Adicione pacientes e mantenha seus dados organizados.</p>
            </div>
          </div>

          <div className="sucesso-step-card">
            <div className="sucesso-step-icon">
              <CalendarCheck size={20} />
            </div>
            <div>
              <h4>Monte sua agenda</h4>
              <p>Organize consultas e agendamentos da equipe.</p>
            </div>
          </div>

          <div className="sucesso-step-card">
            <div className="sucesso-step-icon">
              <Shield size={20} />
            </div>
            <div>
              <h4>Dados sempre seguros</h4>
              <p>Suas informações protegidas com criptografia.</p>
            </div>
          </div>
        </div>

        <button
          className="sucesso-cta-btn"
          onClick={() => navigate('/entrar')}
        >
          Acessar o Sistema
          <ArrowRight size={18} />
        </button>

        <p className="sucesso-hint">
          Use o email e a senha que você cadastrou para fazer login.
        </p>
      </div>
    </div>
  );
}
