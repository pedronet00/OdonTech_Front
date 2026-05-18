import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Clock, Calendar as CalendarIcon, UserPlus, PlayCircle } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, isBefore, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Agendamento, Patient, Profissional, NovoAgendamento } from '../../domain/models/types';
import toast from 'react-hot-toast';
import './Schedule.css';

export function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Data State
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>('all');

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedProfissionalId, setSelectedProfissionalId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [duration, setDuration] = useState('30');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');

  const fetchData = async () => {
    if (!user?.clinica_id) return;
    try {
      setLoading(true);

      const appointmentsUrl = filterProfessionalId === 'all' 
        ? `/agendamentos/clinica/${user.clinica_id}`
        : `/agendamentos/profissional/${filterProfessionalId}`;

      const [aData, pData, profData] = await Promise.all([
        ApiClient.get<Agendamento[]>(appointmentsUrl),
        ApiClient.get<Patient[]>(`/pacientes/clinica/${user.clinica_id}`),
        ApiClient.get<Profissional[]>(`/profissionais/clinica/${user.clinica_id}`).catch(() => [] as Profissional[])
      ]);

      setAppointments(aData);
      setPatients(pData);
      setProfessionals(profData.length > 0 ? profData : [
        { id: '08deae4d-edca-4250-8e1f-0d51dd5b2fc2', nome: 'pedro', email: '', cro: '', clinicaId: user.clinica_id }
      ]);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados da agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.clinica_id, filterProfessionalId]);

  const handleCreateAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedProfissionalId || !selectedTimeSlot) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const appointmentDate = new Date(selectedDate);
    const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    if (isBefore(appointmentDate, new Date())) {
      toast.error('Não é possível agendar para datas ou horários passados.');
      return;
    }

    try {
      setIsSaving(true);
      const dataHoraInicio = format(appointmentDate, "yyyy-MM-dd'T'HH:mm:ss");
      const dataHoraFim = format(addMinutes(appointmentDate, parseInt(duration)), "yyyy-MM-dd'T'HH:mm:ss");

      const payload: NovoAgendamento = {
        pacienteId: selectedPatientId,
        profissionalId: selectedProfissionalId,
        dataHoraInicio,
        dataHoraFim,
        observacao
      };

      await ApiClient.post('/agendamentos', payload);

      toast.success('Agendamento realizado com sucesso!');
      setIsModalOpen(false);
      fetchData();

      setSelectedPatientId('');
      setSelectedProfissionalId('');
      setObservacao('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar agendamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, action: 'confirmar' | 'cancelar' | 'falta') => {
    try {
      await ApiClient.patch(`/agendamentos/${id}/${action}`);

      toast.success(`Agendamento ${action === 'confirmar' ? 'confirmado' : action === 'cancelar' ? 'cancelado' : 'marcado como falta'}!`);

      // Update local state for immediate feedback if in detail modal
      if (selectedAgendamento && selectedAgendamento.id === id) {
        const statusMap: any = { confirmar: 'Confirmado', cancelar: 'Cancelado', falta: 'Falta' };
        setSelectedAgendamento({ ...selectedAgendamento, status: statusMap[action] });
      }

      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGerarAtendimento = async () => {
    if (!selectedAgendamento) return;

    try {
      setIsSaving(true);
      const now = new Date();
      const appointmentDate = parseISO(selectedAgendamento.dataHoraInicio);

      const payload: any = {
        descricao: `Atendimento gerado a partir do agendamento. Obs: ${selectedAgendamento.observacao || 'Nenhuma'}`,
        dente: null,
        tipoAtendimento: 1 // Consulta
      };

      // Se a data/hora atual for posterior à do agendamento, envia a atual
      if (isBefore(appointmentDate, now)) {
        payload.dataAtendimento = format(now, "yyyy-MM-dd'T'HH:mm:ss");
      }

      await ApiClient.post(`/atendimentos/agendamento/${selectedAgendamento.id}`, payload);

      toast.success('Atendimento gerado com sucesso! Redirecionando para o prontuário...');
      setIsDetailModalOpen(false);

      // Navigate to patient's records
      navigate(`/prontuarios/${selectedAgendamento.pacienteId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedAgendamento || !newRescheduleDate || !newRescheduleTime) {
      toast.error('Informe a nova data e horário.');
      return;
    }

    try {
      const start = new Date(`${newRescheduleDate}T${newRescheduleTime}`);
      const end = addMinutes(start, selectedAgendamento.duracaoMinutos);

      await ApiClient.patch(`/agendamentos/${selectedAgendamento.id}/reagendar`, {
        dataHoraInicio: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        dataHoraFim: format(end, "yyyy-MM-dd'T'HH:mm:ss")
      });

      toast.success('Reagendamento concluído!');
      setIsDetailModalOpen(false);
      setIsRescheduling(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openDetailModal = async (id: string) => {
    try {
      const data = await ApiClient.get<Agendamento>(`/agendamentos/${id}`);
      setSelectedAgendamento(data);
      setIsDetailModalOpen(true);
      setNewRescheduleDate(format(parseISO(data.dataHoraInicio), 'yyyy-MM-dd'));
      setNewRescheduleTime(format(parseISO(data.dataHoraInicio), 'HH:mm'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Calendar Engine
  const renderHeader = () => (
    <div className="calendar-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ textTransform: 'capitalize', margin: 0, minWidth: '180px' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        
        <select 
          className="input-field" 
          style={{ width: '220px', height: '40px', fontSize: '0.9rem' }}
          value={filterProfessionalId}
          onChange={(e) => setFilterProfessionalId(e.target.value)}
        >
          <option value="all">Todos os Profissionais</option>
          {professionals.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={20} />
        </button>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(new Date())}>
          Hoje
        </button>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { locale: ptBR });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="calendar-day-header" key={i}>
          {format(addDays(startDate, i), "EEE", { locale: ptBR })}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayApps = appointments.filter(app => isSameDay(parseISO(app.dataHoraInicio), cloneDay));

        days.push(
          <div
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? "inactive" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""}`}
            key={day.toISOString()}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="calendar-date">{format(day, "d")}</div>
            {dayApps.slice(0, 2).map(a => (
              <div
                key={a.id}
                className={`calendar-event-indicator status-${a.status.toLowerCase()}`}
                title={a.nomePaciente}
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailModal(a.id);
                }}
              >
                {format(parseISO(a.dataHoraInicio), 'HH:mm')} - {a.nomePaciente.split(' ')[0]}
              </div>
            ))}
            {dayApps.length > 2 && <div className="calendar-event-more">+{dayApps.length - 2} mais</div>}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-grid" key={day.toISOString()}>{days}</div>);
      days = [];
    }
    return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{rows}</div>;
  };

  const dailyAppointments = appointments.filter(app => isSameDay(parseISO(app.dataHoraInicio), selectedDate));

  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const handleOpenSchedule = (time: string) => {
    const checkDate = new Date(selectedDate);
    const [h, m] = time.split(':').map(Number);
    checkDate.setHours(h, m, 0, 0);

    if (isBefore(checkDate, new Date())) {
      toast.error('Não é possível agendar horários no passado.');
      return;
    }

    setSelectedTimeSlot(time);
    if (filterProfessionalId !== 'all') {
      setSelectedProfissionalId(filterProfessionalId);
    }
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Agenda</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie horários e disponibilidade</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-main">
          {renderHeader()}
          {renderDays()}
          <div style={{ position: 'relative', flex: 1, minHeight: '400px' }}>
            {loading ? <div className="loading-overlay">Carregando...</div> : renderCells()}
          </div>
        </div>

        <div className="day-panel">
          <div className="day-panel-header">
            <h3>{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h3>
            <p>{format(selectedDate, "EEEE", { locale: ptBR })}</p>
          </div>

          <div className="day-timeline">
            {timeSlots.map(time => {
              const appsAtTime = dailyAppointments.filter(a => format(parseISO(a.dataHoraInicio), 'HH:mm') === time);

              return (
                <div key={time} className="time-slot" style={{ minHeight: appsAtTime.length > 1 ? 'auto' : '80px' }}>
                  <div className="time-label">{time}</div>
                  <div className="time-content-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {appsAtTime.length > 0 ? (
                      appsAtTime.map(app => (
                        <div
                          key={app.id}
                          className={`time-content occupied status-card-${app.status.toLowerCase()}`}
                          title={app.nomePaciente}
                          style={{ height: 'auto', padding: '12px', width: '100%' }}
                          onClick={() => openDetailModal(app.id)}
                        >
                          <div className="flex-col gap-1 w-full">
                            <div className="flex-row justify-between items-start w-full">
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{app.nomePaciente}</div>
                              <span className={`status-badge ${app.status.toLowerCase()}`}>{app.status}</span>
                            </div>
                            <div className="flex-col gap-0" style={{ marginTop: '4px' }}>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prof. {app.nomeProfissional}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.duracaoMinutos} minutos de duração</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="time-content free" onClick={() => handleOpenSchedule(time)} style={{ width: '100%' }}>
                        <span><UserPlus size={14} /> Horário Livre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Agendar Paciente</h3>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateAgendamento} className="flex-col gap-4">
              <div className="flex-row gap-4" style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <span className="input-label"><CalendarIcon size={14} /> Data</span>
                  <div style={{ fontWeight: 600 }}>{format(selectedDate, "dd/MM/yyyy")}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <span className="input-label"><Clock size={14} /> Horário</span>
                  <div style={{ fontWeight: 600 }}>{selectedTimeSlot}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Paciente</label>
                <select className="input-field" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} required>
                  <option value="">Selecione o paciente...</option>
                  {patients.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Profissional</label>
                <select className="input-field" value={selectedProfissionalId} onChange={e => setSelectedProfissionalId(e.target.value)} required>
                  <option value="">Selecione o dentista...</option>
                  {professionals.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                </select>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="input-label">Duração</label>
                  <select className="input-field" value={duration} onChange={e => setDuration(e.target.value)}>
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Observação</label>
                  <input type="text" className="input-field" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Avaliação" maxLength={500} />
                </div>
              </div>

              <div className="flex-row gap-3" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedAgendamento && (
        <div className="modal-overlay" onClick={() => { setIsDetailModalOpen(false); setIsRescheduling(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes do Agendamento</h3>
              <button className="action-btn" onClick={() => { setIsDetailModalOpen(false); setIsRescheduling(false); }}><X size={20} /></button>
            </div>

            <div className="flex-col gap-4">
              <div className="flex-row items-center gap-4 p-4" style={{ background: 'var(--bg-main)', borderRadius: '12px' }}>
                <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 600 }}>
                  {selectedAgendamento.nomePaciente.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{selectedAgendamento.nomePaciente}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Status: <span className={`status-badge ${selectedAgendamento.status.toLowerCase()}`}>{selectedAgendamento.status}</span>
                  </div>
                </div>
              </div>

              {!isRescheduling ? (
                <>
                  <div className="grid-cols-2 gap-4">
                    <div className="p-3" style={{ background: 'var(--bg-surface-hover)', borderRadius: '8px' }}>
                      <span className="input-label">Data e Hora</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{format(parseISO(selectedAgendamento.dataHoraInicio), "dd/MM/yyyy 'às' HH:mm")}</p>
                    </div>
                    <div className="p-3" style={{ background: 'var(--bg-surface-hover)', borderRadius: '8px' }}>
                      <span className="input-label">Profissional</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedAgendamento.nomeProfissional}</p>
                    </div>
                  </div>

                  {selectedAgendamento.observacao && (
                    <div className="p-3" style={{ background: 'var(--bg-surface-hover)', borderRadius: '8px' }}>
                      <span className="input-label">Observação</span>
                      <p style={{ fontSize: '0.9rem' }}>{selectedAgendamento.observacao}</p>
                    </div>
                  )}

                  <div className="flex-col gap-3" style={{ marginTop: '16px' }}>
                    {selectedAgendamento.status !== 'Realizado' && 
                     selectedAgendamento.status !== 'Concluido' && 
                     selectedAgendamento.status !== 'Cancelado' && (
                      <>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Gerenciamento do Horário</p>

                        <div className="flex-col gap-2">
                          {selectedAgendamento.status === 'Confirmado' ? (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', border: 'none', background: 'linear-gradient(135deg, var(--primary), #2563eb)' }}
                              onClick={handleGerarAtendimento}
                              disabled={isSaving}
                            >
                              <PlayCircle size={22} /> {isSaving ? 'Gerando...' : 'Iniciar Atendimento'}
                            </button>
                          ) : selectedAgendamento.status === 'Agendado' ? (
                            <button
                              className="btn btn-success"
                              style={{ padding: '14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                              onClick={() => handleUpdateStatus(selectedAgendamento.id, 'confirmar')}
                            >
                              Confirmar Presença
                            </button>
                          ) : null}

                          {(selectedAgendamento.status === 'Agendado' || selectedAgendamento.status === 'Confirmado') && (
                            <div className="grid-cols-2 gap-2" style={{ width: '100%' }}>
                              <button className="btn btn-warning"
                                style={{ padding: '12px', borderRadius: '10px', fontWeight: 600, width: '100%', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}
                                onClick={() => handleUpdateStatus(selectedAgendamento.id, 'falta')}>
                                Marcar Falta
                              </button>
                              <button className="btn btn-danger"
                                style={{ padding: '12px', borderRadius: '10px', fontWeight: 600, width: '100%', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}
                                onClick={() => handleUpdateStatus(selectedAgendamento.id, 'cancelar')}>
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>

                        <button className="btn btn-secondary w-full"
                          style={{ marginTop: '8px', padding: '12px', borderRadius: '10px', borderStyle: 'dashed', fontWeight: 500 }}
                          onClick={() => setIsRescheduling(true)}>
                          Reagendar para outra data
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-col gap-4 animate-fade-in">
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>Alterar data e horário:</p>
                  <div className="grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="input-label">Nova Data</label>
                      <input type="date" className="input-field" value={newRescheduleDate} onChange={e => setNewRescheduleDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Novo Horário</label>
                      <input type="time" className="input-field" value={newRescheduleTime} onChange={e => setNewRescheduleTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex-row gap-2">
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsRescheduling(false)}>Voltar</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleReschedule}>Confirmar Reagendamento</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
