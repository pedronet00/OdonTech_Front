import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Search, X } from 'lucide-react';
import type { EntradaFinanceira } from '../../domain/models/types';
import './EntradasList.css';

type FiltroStatus = 'todas' | 'Pendente' | 'Pago' | 'Cancelado';

interface EntradasListProps {
  entradas: EntradaFinanceira[];
  nomeMes: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// As datas vêm sem fuso ("2026-08-06T00:00:00"); usar só a parte da data evita virar o dia anterior.
const toDateKey = (iso: string) => iso.slice(0, 10);
const parseDateKey = (key: string) => new Date(`${key}T00:00:00`);

const formatDiaGrupo = (key: string) => {
  const d = parseDateKey(key);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return {
    dia: d.getDate().toString().padStart(2, '0'),
    rotulo: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
  };
};

const diasEntre = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);

export function EntradasList({ entradas, nomeMes }: EntradasListProps) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<FiltroStatus>('todas');
  const [busca, setBusca] = useState('');

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const contagem = useMemo(() => {
    const c = { todas: entradas.length, Pendente: 0, Pago: 0, Cancelado: 0 };
    entradas.forEach(e => {
      if (e.statusPagamento in c) c[e.statusPagamento as Exclude<FiltroStatus, 'todas'>]++;
    });
    return c;
  }, [entradas]);

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = entradas.filter(e => {
      if (filtro !== 'todas' && e.statusPagamento !== filtro) return false;
      if (!termo) return true;
      return [e.nomePaciente, e.descricaoAtendimento, e.nomeProfissional, e.observacao]
        .some(v => v?.toLowerCase().includes(termo));
    });

    const map = new Map<string, EntradaFinanceira[]>();
    filtradas
      .slice()
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento) || a.nomePaciente.localeCompare(b.nomePaciente))
      .forEach(e => {
        const key = toDateKey(e.dataVencimento);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      });

    return Array.from(map.entries()).map(([key, itens]) => ({
      key,
      itens,
      total: itens.filter(i => i.statusPagamento !== 'Cancelado').reduce((s, i) => s + i.valor, 0)
    }));
  }, [entradas, filtro, busca]);

  const totalFiltrado = grupos.reduce((s, g) => s + g.total, 0);
  const qtdFiltrada = grupos.reduce((s, g) => s + g.itens.length, 0);

  const filtros: { id: FiltroStatus; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'Pendente', label: 'Pendentes' },
    { id: 'Pago', label: 'Pagas' },
    ...(contagem.Cancelado > 0 ? [{ id: 'Cancelado' as FiltroStatus, label: 'Canceladas' }] : [])
  ];

  const renderSituacao = (e: EntradaFinanceira) => {
    if (e.statusPagamento === 'Pago') {
      return e.dataPagamento
        ? `Pago em ${parseDateKey(toDateKey(e.dataPagamento)).toLocaleDateString('pt-BR')}`
        : 'Pago';
    }
    if (e.statusPagamento === 'Cancelado') return 'Cancelado';

    const dias = diasEntre(parseDateKey(toDateKey(e.dataVencimento)), hoje);
    if (dias > 0) return dias === 1 ? 'Vencido há 1 dia' : `Vencido há ${dias} dias`;
    if (dias === 0) return 'Vence hoje';
    return dias === -1 ? 'Vence amanhã' : `Vence em ${-dias} dias`;
  };

  const isVencido = (e: EntradaFinanceira) =>
    e.statusPagamento === 'Pendente' && parseDateKey(toDateKey(e.dataVencimento)) < hoje;

  return (
    <section className="glass-panel entradas-panel" aria-labelledby="entradas-title">
      <header className="entradas-header">
        <div className="entradas-heading">
          <ListChecks size={18} />
          <h3 id="entradas-title">Entradas de {nomeMes}</h3>
        </div>

        <div className="entradas-tools">
          <div className="entradas-filtros" role="tablist" aria-label="Filtrar por situação">
            {filtros.map(f => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                className={`entradas-filtro ${filtro === f.id ? 'active' : ''}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
                <span>{contagem[f.id]}</span>
              </button>
            ))}
          </div>

          <div className="entradas-busca">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar paciente ou atendimento"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              aria-label="Buscar entradas"
            />
            {busca && (
              <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {grupos.length === 0 ? (
        <div className="entradas-vazio">
          {entradas.length === 0
            ? <>Nenhuma entrada em {nomeMes}. Os pagamentos registrados nos atendimentos aparecem aqui.</>
            : <>Nenhuma entrada corresponde ao filtro. <button type="button" onClick={() => { setFiltro('todas'); setBusca(''); }}>Mostrar todas</button></>}
        </div>
      ) : (
        <>
          <div className="entradas-dias">
            {grupos.map(grupo => {
              const { dia, rotulo } = formatDiaGrupo(grupo.key);
              return (
                <div key={grupo.key} className="entradas-dia">
                  <div className="entradas-dia-marker" aria-hidden="true">{dia}</div>

                  <div className="entradas-dia-body">
                    <div className="entradas-dia-header">
                      <span>{rotulo}</span>
                      <span className="entradas-valor">{formatCurrency(grupo.total)}</span>
                    </div>

                    <ul className="entradas-itens">
                      {grupo.itens.map(e => (
                        <li
                          key={e.pagamentoId}
                          className={`entrada-item status-${e.statusPagamento.toLowerCase()} ${isVencido(e) ? 'vencido' : ''}`}
                        >
                          <div className="entrada-quem">
                            <button
                              type="button"
                              className="entrada-paciente"
                              onClick={() => navigate(`/prontuarios/${e.pacienteId}`)}
                              title="Prontuário"
                            >
                              {e.nomePaciente}
                            </button>
                            <span className="entrada-descricao" title={e.observacao ?? undefined}>
                              {e.descricaoAtendimento || e.observacao || 'Pagamento avulso'}
                              {e.nomeProfissional && <> com {e.nomeProfissional}</>}
                            </span>
                          </div>

                          <span className="entrada-forma">{e.formaPagamento}</span>

                          <span className="entrada-situacao">
                            <i aria-hidden="true" />
                            {renderSituacao(e)}
                          </span>

                          <span className="entradas-valor entrada-valor">{formatCurrency(e.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="entradas-footer">
            <span>{qtdFiltrada === 1 ? '1 entrada' : `${qtdFiltrada} entradas`}{filtro !== 'todas' || busca ? ' no filtro' : ''}</span>
            <span className="entradas-valor">{formatCurrency(totalFiltrado)}</span>
          </footer>
        </>
      )}
    </section>
  );
}
