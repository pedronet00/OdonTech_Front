import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Calendar, Briefcase, PieChart, ArrowUpRight, X } from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { FinanceDashboard, MonthData } from '../../domain/models/types';
import toast from 'react-hot-toast';

export function Finance() {
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user?.clinica_id) return;
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterDate) {
          params.append('data', filterDate);
        }
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const data = await ApiClient.get<FinanceDashboard>(`/dashboard/financeiro/${user.clinica_id}/${currentYear}${queryString}`);
        setDashboard(data);

        // Select current month or first available
        if (data.meses.length > 0) {
          if (filterDate) {
            const filterMonth = new Date(filterDate).getMonth() + 1;
            const month = data.meses.find(m => m.mes === filterMonth) || data.meses[0];
            setSelectedMonth(month);
          } else {
            const currentMonthIdx = new Date().getMonth() + 1;
            const month = data.meses.find(m => m.mes === currentMonthIdx) || data.meses[0];
            setSelectedMonth(month);
          }
        } else {
          setSelectedMonth(null);
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar dados financeiros.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.clinica_id, token, currentYear, filterDate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex-col items-center justify-center" style={{ height: '70vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando estatísticas financeiras...</p>
      </div>
    );
  }

  const hasData = dashboard && dashboard.meses.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="flex-row justify-between items-center" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Dashboard Financeiro</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acompanhe a saúde financeira da sua clínica em {currentYear}</p>
        </div>
        <div className="flex-row gap-3 items-center">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              className="input-field"
              style={{ width: '170px', paddingRight: filterDate ? '32px' : undefined }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="Filtrar por data específica"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                title="Limpar filtro de data"
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {hasData && (
            <>
              <select
                className="input-field"
                style={{ width: '180px' }}
                value={selectedMonth?.mes}
                onChange={(e) => {
                  const month = dashboard!.meses.find(m => m.mes === parseInt(e.target.value));
                  if (month) setSelectedMonth(month);
                }}
              >
                {dashboard!.meses.map(m => (
                  <option key={m.mes} value={m.mes}>{m.nomeMes.charAt(0).toUpperCase() + m.nomeMes.slice(1)}</option>
                ))}
              </select>
              <button className="btn btn-primary">
                <Calendar size={18} /> Exportar
              </button>
            </>
          )}
        </div>
      </div>

      {!hasData && (
        <div className="flex-col items-center justify-center glass-panel" style={{ padding: '64px' }}>
          <DollarSign size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>Sem dados {filterDate ? `para ${new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : `para o ano de ${currentYear}`}</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {filterDate ? 'Tente selecionar outra data no filtro acima.' : 'Comece a registrar pagamentos para ver seu dashboard.'}
          </p>
        </div>
      )}

      {selectedMonth && (
        <>
          {/* Main Stats */}
          <div className="grid-cols-3 gap-6" style={{ marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--success)' }}>
              <div className="flex-row justify-between items-start" style={{ marginBottom: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <ArrowUpRight size={14} /> Entradas
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Receita Total</p>
              <h2 style={{ fontSize: '1.5rem' }}>{formatCurrency(selectedMonth.totalEntradas)}</h2>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
              <div className="flex-row justify-between items-start" style={{ marginBottom: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{selectedMonth.statusPagamentos.totalPagos} pagos</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Valor Recebido</p>
              <h2 style={{ fontSize: '1.5rem' }}>{formatCurrency(selectedMonth.statusPagamentos.valorPago)}</h2>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--warning)' }}>
              <div className="flex-row justify-between items-start" style={{ marginBottom: '16px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--warning)' }}>
                  <CreditCard size={20} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {selectedMonth.statusPagamentos.totalPendentes} pendentes
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Valor Pendente</p>
              <h2 style={{ fontSize: '1.5rem' }}>{formatCurrency(selectedMonth.statusPagamentos.valorPendente)}</h2>
            </div>
          </div>

          <div className="grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
                <PieChart size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem' }}>Formas de Pagamento</h3>
              </div>
              <div className="flex-col gap-6">
                {selectedMonth.formasPagamento.map((f, i) => (
                  <div key={i} className="flex-col gap-2">
                    <div className="flex-row justify-between" style={{ fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 500 }}>{f.formaPagamento}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(f.total)} ({f.percentual.toFixed(1)}%)</span>
                    </div>
                    <div style={{ background: 'var(--bg-main)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        background: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--success)' : 'var(--warning)',
                        height: '100%',
                        width: `${f.percentual}%`,
                        transition: 'width 1s ease-out'
                      }} />
                    </div>
                  </div>
                ))}
                {selectedMonth.formasPagamento.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum dado registrado.</p>
                )}
              </div>
            </div>

            {/* Professional Performance */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
                <Briefcase size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem' }}>Receita por Profissional</h3>
              </div>
              <div className="flex-col gap-4">
                {selectedMonth.receitaPorProfissional.map((p, i) => (
                  <div key={i} className="flex-row items-center justify-between p-3" style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '12px' }}>
                    <div className="flex-row items-center gap-3">
                      <div style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        {p.nomeProfissional.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{p.nomeProfissional}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profissional da Saúde</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(p.totalGerado)}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>+ {((p.totalGerado / selectedMonth.totalEntradas) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
                {selectedMonth.receitaPorProfissional.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum dado registrado.</p>
                )}
              </div>
            </div>

            {/* Treatment Types */}
            <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
              <div className="flex-row items-center gap-2" style={{ marginBottom: '24px' }}>
                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem' }}>Distribuição por Categorias de Atendimento</h3>
              </div>
              <div className="grid-cols-3 gap-6">
                {selectedMonth.receitaPorTipoAtendimento.map((t, i) => (
                  <div key={i} className="flex-col gap-2" style={{ 
                    background: 'var(--bg-main)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-subtle)',
                    padding: '20px',
                    transition: 'all 0.2s ease'
                  }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      {t.tipoAtendimento}
                    </p>
                    <div className="flex-row justify-between items-center">
                      <h4 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 600 }}>{formatCurrency(t.totalGerado)}</h4>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--primary)', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        padding: '6px 12px', 
                        borderRadius: '8px',
                        fontWeight: 700,
                        border: '1px solid rgba(59, 130, 246, 0.15)'
                      }}>
                        {((t.totalGerado / selectedMonth.totalEntradas) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedMonth.receitaPorTipoAtendimento.length === 0 && (
                <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum dado registrado.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
