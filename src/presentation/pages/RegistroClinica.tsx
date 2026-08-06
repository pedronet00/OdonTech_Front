import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, User, CreditCard, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Eye, EyeOff, Users, UserCheck,
  Check, X, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../infrastructure/config/api';
import { applyPhoneMask, applyCepMask, applyCnpjMask, applyCroMask } from '../../utils/masks';
import './RegistroClinica.css';

interface Plano {
  id: string;
  nome: string;
  precoMensal: number;
  limiteProfissionais: number;
  limitePacientes: number;
  permiteAutocadastroPaciente: boolean;
}

function getPasswordStrength(password: string): { level: number; label: string; key: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: score, label: 'Fraca', key: 'weak' };
  if (score <= 3) return { level: score, label: 'Média', key: 'medium' };
  return { level: score, label: 'Forte', key: 'strong' };
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function RegistroClinica() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Planos
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosLoading, setPlanosLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    // Clínica
    clinicaNome: '',
    clinicaCnpj: '',
    clinicaTelefone: '',
    // Endereço
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    // Responsável
    nome: '',
    email: '',
    senha: '',
    cro: '',
    // Plano
    planoId: ''
  });

  const steps = [
    { number: 1, label: 'Clínica', icon: Building2 },
    { number: 2, label: 'Endereço', icon: MapPin },
    { number: 3, label: 'Responsável', icon: User },
    { number: 4, label: 'Plano', icon: CreditCard },
  ];

  // Fetch planos on mount
  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    setPlanosLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Planos`);
      const result = await response.json();
      if (result.isSuccess && result.data) {
        setPlanos(result.data);
      } else {
        toast.error('Erro ao carregar planos disponíveis.');
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setPlanosLoading(false);
    }
  };

  // CEP auto-fill
  const handleCepBlur = async () => {
    const cepClean = formData.cep.replace(/\D/g, '');
    if (cepClean.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: data.complemento || prev.complemento,
        }));
      }
    } catch (err) {
      // Silently fail - user can fill manually
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Validations per step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        if (!formData.clinicaNome.trim()) { setError('Informe o nome da clínica.'); return false; }
        const cnpjClean = formData.clinicaCnpj.replace(/\D/g, '');
        if (cnpjClean.length !== 14) { setError('CNPJ inválido. Deve conter 14 dígitos.'); return false; }
        const phoneClean = formData.clinicaTelefone.replace(/\D/g, '');
        if (phoneClean.length < 10) { setError('Telefone inválido.'); return false; }
        return true;
      }
      case 2: {
        if (!formData.logradouro.trim()) { setError('Informe o logradouro.'); return false; }
        if (!formData.numero.trim()) { setError('Informe o número.'); return false; }
        if (!formData.bairro.trim()) { setError('Informe o bairro.'); return false; }
        if (!formData.cidade.trim()) { setError('Informe a cidade.'); return false; }
        if (!formData.estado) { setError('Selecione o estado.'); return false; }
        const cepClean = formData.cep.replace(/\D/g, '');
        if (cepClean.length !== 8) { setError('CEP inválido.'); return false; }
        return true;
      }
      case 3: {
        if (!formData.nome.trim()) { setError('Informe o nome do responsável.'); return false; }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) { setError('Email inválido.'); return false; }
        if (formData.senha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return false; }
        if (!formData.cro.trim()) { setError('Informe o CRO.'); return false; }
        return true;
      }
      case 4: {
        if (!formData.planoId) { setError('Selecione um plano.'); return false; }
        return true;
      }
      default: return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError('');
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setSubmitting(true);
    setError('');

    const payload = {
      clinicaNome: formData.clinicaNome.trim(),
      clinicaCnpj: formData.clinicaCnpj.replace(/\D/g, ''),
      clinicaTelefone: formData.clinicaTelefone.replace(/\D/g, ''),
      logradouro: formData.logradouro.trim(),
      numero: parseInt(formData.numero) || 0,
      complemento: formData.complemento.trim() || null,
      bairro: formData.bairro.trim(),
      cidade: formData.cidade.trim(),
      estado: formData.estado,
      cep: formData.cep.replace(/\D/g, ''),
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      senha: formData.senha,
      cro: formData.cro.trim(),
      planoId: formData.planoId
    };

    try {
      const response = await fetch(`${API_BASE_URL}/CadastroPublico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.isSuccess) {
        setSuccess(true);
        toast.success('Clínica registrada com sucesso!');
      } else {
        const errMsg = result.errors && result.errors.length > 0
          ? result.errors[0].message
          : 'Erro ao registrar clínica.';
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao conectar com o servidor.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.senha);

  // Success state
  if (success) {
    return (
      <div className="registro-container">
        <div className="registro-success animate-fade-in">
          <div className="registro-success-circle">
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-main)' }}>
            Cadastro Realizado!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px', maxWidth: '400px' }}>
            Sua clínica foi registrada com sucesso. Agora você pode acessar o sistema com seu email e senha.
          </p>
          <button
            className="registro-btn registro-btn-primary"
            onClick={() => navigate('/entrar')}
          >
            Acessar o Sistema <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registro-container">
      {/* Header */}
      <div className="registro-header">
        <img
          src="/odontech_logo_azul.svg"
          alt="OdonTech Logo"
        />
        <p>Registre sua clínica e comece agora</p>
      </div>

      {/* Stepper */}
      <div className="registro-stepper">
        {steps.map((step, idx) => (
          <React.Fragment key={step.number}>
            <div className="registro-step">
              <div className={`registro-step-dot ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                {currentStep > step.number ? <CheckCircle2 size={18} /> : step.number}
              </div>
              <span className={`registro-step-label ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`registro-step-line ${currentStep > step.number ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Card */}
      <div className="registro-card" key={currentStep}>
        {error && (
          <div className="registro-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Step 1: Clínica */}
        {currentStep === 1 && (
          <>
            <div className="registro-section-title">
              <Building2 size={22} /> Dados da Clínica
            </div>
            <div className="registro-form-grid">
              <div className="registro-form-group full-width">
                <label>Nome da Clínica <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Ex: Clínica OdontoSorriso"
                  value={formData.clinicaNome}
                  onChange={e => handleChange('clinicaNome', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="registro-form-group">
                <label>CNPJ <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={applyCnpjMask(formData.clinicaCnpj)}
                  onChange={e => handleChange('clinicaCnpj', e.target.value.replace(/\D/g, ''))}
                  maxLength={18}
                />
              </div>
              <div className="registro-form-group">
                <label>Telefone <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={applyPhoneMask(formData.clinicaTelefone)}
                  onChange={e => handleChange('clinicaTelefone', e.target.value.replace(/\D/g, ''))}
                  maxLength={15}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Endereço */}
        {currentStep === 2 && (
          <>
            <div className="registro-section-title">
              <MapPin size={22} /> Endereço da Clínica
            </div>
            <div className="registro-form-grid">
              <div className="registro-form-group">
                <label>CEP <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={applyCepMask(formData.cep)}
                  onChange={e => handleChange('cep', e.target.value.replace(/\D/g, ''))}
                  onBlur={handleCepBlur}
                  maxLength={9}
                />
                <span className="input-hint">Preencha o CEP para autocompletar</span>
              </div>
              <div className="registro-form-group">
                <label>Estado <span className="required">*</span></label>
                <select
                  value={formData.estado}
                  onChange={e => handleChange('estado', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {ESTADOS_BR.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div className="registro-form-group full-width">
                <label>Logradouro <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Rua, avenida, travessa..."
                  value={formData.logradouro}
                  onChange={e => handleChange('logradouro', e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="registro-form-group">
                <label>Número <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="123"
                  value={formData.numero}
                  onChange={e => handleChange('numero', e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                />
              </div>
              <div className="registro-form-group">
                <label>Complemento</label>
                <input
                  type="text"
                  placeholder="Sala, bloco, andar..."
                  value={formData.complemento}
                  onChange={e => handleChange('complemento', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="registro-form-group">
                <label>Bairro <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={formData.bairro}
                  onChange={e => handleChange('bairro', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="registro-form-group">
                <label>Cidade <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={formData.cidade}
                  onChange={e => handleChange('cidade', e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 3: Responsável */}
        {currentStep === 3 && (
          <>
            <div className="registro-section-title">
              <User size={22} /> Dados do Responsável
            </div>
            <div className="registro-form-grid">
              <div className="registro-form-group full-width">
                <label>Nome Completo <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={e => handleChange('nome', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="registro-form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="registro-form-group">
                <label>CRO <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Número do CRO"
                  value={applyCroMask(formData.cro)}
                  onChange={e => handleChange('cro', e.target.value)}
                  maxLength={15}
                />
              </div>
              <div className="registro-form-group full-width">
                <label>Senha <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.senha}
                    onChange={e => handleChange('senha', e.target.value)}
                    maxLength={255}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formData.senha && (
                  <>
                    <div className="password-strength-bar">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`password-strength-segment ${i <= passwordStrength.level ? `filled ${passwordStrength.key}` : ''}`}
                        />
                      ))}
                    </div>
                    <span className={`password-strength-label ${passwordStrength.key}`}>
                      Força: {passwordStrength.label}
                    </span>
                  </>
                )}
                <span className="input-hint">Use letras maiúsculas, números e caracteres especiais</span>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Plano */}
        {currentStep === 4 && (
          <>
            <div className="registro-section-title">
              <CreditCard size={22} /> Escolha seu Plano
            </div>
            {planosLoading ? (
              <div className="registro-loading">
                <div className="spinner" />
                <span>Carregando planos...</span>
              </div>
            ) : (
              <div className="planos-grid">
                {planos.map(plano => (
                  <div
                    key={plano.id}
                    className={`plano-card ${formData.planoId === plano.id ? 'selected' : ''}`}
                    onClick={() => handleChange('planoId', plano.id)}
                  >
                    <span className="plano-nome">{plano.nome}</span>
                    <span className="plano-preco">
                      R$ {plano.precoMensal.toFixed(2).replace('.', ',')}
                      <span>/mês</span>
                    </span>
                    <ul className="plano-features">
                      <li>
                        <Users size={14} color="var(--primary)" />
                        Até {plano.limiteProfissionais} profissionais
                      </li>
                      <li>
                        <UserCheck size={14} color="var(--primary)" />
                        Até {plano.limitePacientes} pacientes
                      </li>
                      <li>
                        {plano.permiteAutocadastroPaciente
                          ? <Check size={14} color="var(--success)" />
                          : <X size={14} color="var(--text-muted)" />
                        }
                        Autocadastro de paciente
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="registro-actions">
          {currentStep > 1 ? (
            <button
              className="registro-btn registro-btn-secondary"
              onClick={handlePrev}
              type="button"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              className="registro-btn registro-btn-primary"
              onClick={handleNext}
              type="button"
            >
              Próximo <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="registro-btn registro-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              type="button"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="spinner" style={{ border: 'none', width: '18px', height: '18px' }} />
                  Registrando...
                </>
              ) : (
                <>
                  Registrar Clínica <CheckCircle2 size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Login link */}
      <div className="registro-login-link">
        Já possui uma conta? <a href="/entrar">Faça login</a>
      </div>
    </div>
  );
}
