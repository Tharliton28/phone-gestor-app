import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart, Users, Package, PenTool, Settings, FileText, Zap,
  DollarSign, BarChart2, Edit, Plus, RefreshCw, History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { calcResumoVendas, periodoPadrao } from '../domain/relatorioCalculos';
import { serieVendasDiarias, topVendedoresChart } from '../domain/dashboardSeries';
import { getRelatorioVendas } from '../services/relatorioService';
import { listVendas } from '../services/vendaService';
import { listOrdensServico } from '../services/osService';
import { listRupturasEstoque } from '../services/rupturaService';
import { listHomePatrociniosAtivos } from '../services/homePatrocinioService';
import { formatBRL, truncate } from '../utils/formatters';
import DashboardSponsorCarousel from './DashboardSponsorCarousel';
import './dashboard.css';

function isSameLocalDay(dateValue, ref = new Date()) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return (
    d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate()
  );
}

function periodoUltimosDias(dias = 14, referencia = new Date()) {
  const fim = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const inicio = new Date(fim);
  inicio.setDate(fim.getDate() - (dias - 1));
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function rotuloStatus(status) {
  const map = {
    concluido: 'Concluída',
    pre_venda: 'Pré-venda',
    cancelada: 'Cancelada',
    cancelado: 'Cancelada',
  };
  return map[status] || status || '—';
}

function descricaoItens(itens = []) {
  if (!itens.length) return '—';
  const nomes = itens.map((i) => i.descricao || i.produto?.nome || 'Item').filter(Boolean);
  if (nomes.length === 1) return truncate(nomes[0], 42);
  return truncate(`${nomes[0]} +${nomes.length - 1}`, 42);
}

function formatAxisMoney(value) {
  const n = Number(value) || 0;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f111a',
      border: '1px solid #2a2e3f',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 12,
    }}
    >
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} style={{ color: '#e2e8f0', fontWeight: 700 }}>
          {item.name}: {item.dataKey === 'faturamento' || item.dataKey === 'total'
            ? `R$ ${formatBRL(item.value)}`
            : item.value}
        </div>
      ))}
    </div>
  );
}

const Dashboard = ({ aoClicarEmNovaVenda, aoMudarTela }) => {
  const { alert } = useDialog();
  const { lojaAtivaId, lojaAtiva, perfil } = useLoja();
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [resumoMes, setResumoMes] = useState({ quantidade: 0, faturamento: 0, ticketMedio: 0 });
  const [resumoHoje, setResumoHoje] = useState({ quantidade: 0, faturamento: 0, ticketMedio: 0 });
  const [serie7d, setSerie7d] = useState([]);
  const [topVendedores, setTopVendedores] = useState([]);
  const [osAbertas, setOsAbertas] = useState(0);
  const [rupturas, setRupturas] = useState(0);
  const [patrocinios, setPatrocinios] = useState(null);
  const [ultimasVendas, setUltimasVendas] = useState([]);

  const nomeLoja = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'sua loja';
  const nomeUser = (perfil?.nome?.trim().split(/\s+/)?.[0]) || 'olá';
  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const todosAtalhos = useMemo(() => [
    { id: 1, nome: 'Nova Venda', icon: <ShoppingCart size={18} />, acao: aoClicarEmNovaVenda },
    { id: 2, nome: 'Clientes', icon: <Users size={18} />, acao: () => aoMudarTela?.('clientes') },
    { id: 3, nome: 'Estoque', icon: <Package size={18} />, acao: () => aoMudarTela?.('consulta-estoque') },
    { id: 4, nome: 'Ordem de Serviço', icon: <PenTool size={18} />, acao: () => aoMudarTela?.('listagem-os') },
    { id: 5, nome: 'Financeiro', icon: <DollarSign size={18} />, acao: () => aoMudarTela?.('contas-receber') },
    { id: 6, nome: 'Relatórios', icon: <BarChart2 size={18} />, acao: () => aoMudarTela?.('relatorios') },
    { id: 7, nome: 'Orçamentos', icon: <FileText size={18} />, acao: () => aoMudarTela?.('orcamentos') },
    { id: 8, nome: 'PDV Rápido', icon: <Zap size={18} />, acao: aoClicarEmNovaVenda },
    { id: 9, nome: 'Configurações', icon: <Settings size={18} />, acao: () => aoMudarTela?.('config') },
    { id: 10, nome: 'Histórico', icon: <History size={18} />, acao: () => aoMudarTela?.('historico') },
  ], [aoClicarEmNovaVenda, aoMudarTela]);

  const [atalhosAtivos, setAtalhosAtivos] = useState([1, 2, 3, 4, 6]);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);

    const periodoMes = periodoPadrao();
    const periodoSerie = periodoUltimosDias(14);

    const [mesResult, serieResult, ultimasResult, osResult, rupturaResult, adsResult] = await Promise.all([
      getRelatorioVendas(lojaAtivaId, periodoMes),
      getRelatorioVendas(lojaAtivaId, periodoSerie),
      listVendas(lojaAtivaId, { limit: 7 }),
      listOrdensServico(lojaAtivaId),
      listRupturasEstoque(lojaAtivaId),
      listHomePatrociniosAtivos(),
    ]);

    if (mesResult.error) {
      await alert(mesResult.error.message ?? 'Erro ao carregar resumo do mês.', {
        type: 'error',
        title: 'Dashboard',
      });
    } else {
      const vendasMes = mesResult.data?.vendas ?? [];
      setResumoMes(mesResult.data?.resumo ?? calcResumoVendas(vendasMes));
      setResumoHoje(calcResumoVendas(
        vendasMes.filter((v) => isSameLocalDay(v.data_venda || v.created_at))
      ));
    }

    if (!serieResult.error) {
      const vendasSerie = serieResult.data?.vendas ?? [];
      setSerie7d(serieVendasDiarias(vendasSerie, 7));
      setTopVendedores(topVendedoresChart(vendasSerie, 5));
    } else {
      setSerie7d(serieVendasDiarias([], 7));
      setTopVendedores([]);
    }

    if (ultimasResult.error) {
      setUltimasVendas([]);
    } else {
      // Home: não misturar canceladas como se fossem faturamento recente
      setUltimasVendas((ultimasResult.data ?? []).filter((v) => v.status !== 'cancelada'));
    }

    if (!osResult.error) {
      const abertas = (osResult.data ?? []).filter(
        (os) => !['finalizada', 'cancelada', 'entregue'].includes(os.status)
      );
      setOsAbertas(abertas.length);
    } else {
      setOsAbertas(0);
    }

    setRupturas(rupturaResult.error ? 0 : (rupturaResult.data ?? []).length);
    setPatrocinios(adsResult.data ?? null);

    setCarregando(false);
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const toggleAtalho = (id) => {
    if (atalhosAtivos.includes(id)) {
      setAtalhosAtivos(atalhosAtivos.filter((itemId) => itemId !== id));
      return;
    }
    if (atalhosAtivos.length >= 6) {
      alert('Limite de 6 atalhos. Remova um para adicionar outro.', {
        type: 'warning',
        title: 'Atalhos',
      });
      return;
    }
    setAtalhosAtivos([...atalhosAtivos, id]);
  };

  const temSerie = serie7d.some((d) => d.quantidade > 0 || d.faturamento > 0);

  return (
    <div className="dashboard-home">
      <header className="dashboard-home__header">
        <div>
          <p className="dashboard-home__eyebrow">Tela inicial</p>
          <h1 className="dashboard-home__title">
            {saudacao}, {nomeUser}
          </h1>
          <p className="dashboard-home__store">{truncate(nomeLoja, 48)}</p>
          <p className="dashboard-home__subtitle">
            Operação do dia, tendência da semana e espaço premium para fornecedores parceiros.
          </p>
        </div>
        <div className="dashboard-home__actions">
          <button type="button" className="dashboard-home__btn dashboard-home__btn--ghost" onClick={carregar} disabled={carregando}>
            <RefreshCw size={15} /> {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
          <button type="button" className="dashboard-home__btn dashboard-home__btn--primary" onClick={aoClicarEmNovaVenda}>
            <ShoppingCart size={15} /> Nova venda
          </button>
        </div>
      </header>

      {carregando && patrocinios === null ? (
        <div className="dashboard-home__skeleton-banner" aria-hidden="true" />
      ) : patrocinios?.length ? (
        <DashboardSponsorCarousel slots={patrocinios} />
      ) : null}

      <section className="dashboard-home__kpis" aria-label="Indicadores">
        <article className="dashboard-home__kpi dashboard-home__kpi--blue">
          <p className="dashboard-home__kpi-label">Faturamento hoje</p>
          <p className="dashboard-home__kpi-value">{carregando ? '—' : `R$ ${formatBRL(resumoHoje.faturamento)}`}</p>
          <p className="dashboard-home__kpi-meta">{resumoHoje.quantidade} venda(s) concluída(s)</p>
        </article>
        <article className="dashboard-home__kpi dashboard-home__kpi--blue">
          <p className="dashboard-home__kpi-label">Vendas no mês</p>
          <p className="dashboard-home__kpi-value">{carregando ? '—' : resumoMes.quantidade}</p>
          <p className="dashboard-home__kpi-meta">R$ {formatBRL(resumoMes.faturamento)} faturados</p>
        </article>
        <article className="dashboard-home__kpi dashboard-home__kpi--blue">
          <p className="dashboard-home__kpi-label">Ticket médio (mês)</p>
          <p className="dashboard-home__kpi-value">{carregando ? '—' : `R$ ${formatBRL(resumoMes.ticketMedio)}`}</p>
          <p className="dashboard-home__kpi-meta">Somente vendas concluídas</p>
        </article>
        <article className="dashboard-home__kpi dashboard-home__kpi--violet">
          <p className="dashboard-home__kpi-label">OS · rupturas</p>
          <p className="dashboard-home__kpi-value">{carregando ? '—' : `${osAbertas} / ${rupturas}`}</p>
          <p className="dashboard-home__kpi-meta">
            <button type="button" className="dashboard-home__link" onClick={() => aoMudarTela?.('listagem-os')}>OS</button>
            {' · '}
            <button type="button" className="dashboard-home__link" onClick={() => aoMudarTela?.('ruptura-estoque')}>Estoque baixo</button>
          </p>
        </article>
      </section>

      <section className="dashboard-home__grid-main">
        <article className="dashboard-home__card">
          <div className="dashboard-home__card-head">
            <h2 className="dashboard-home__card-title">Faturamento · últimos 7 dias</h2>
            <p className="dashboard-home__card-hint">Vendas concluídas</p>
          </div>
          {temSerie ? (
            <div className="dashboard-home__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie7d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2233" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={52} tickFormatter={formatAxisMoney} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    name="Faturamento"
                    stroke="#38bdf8"
                    fill="url(#fatFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-home__empty-chart">
              Ainda sem vendas concluídas nos últimos 7 dias.<br />O gráfico aparece assim que houver movimento.
            </div>
          )}
        </article>

        <article className="dashboard-home__card">
          <div className="dashboard-home__card-head">
            <h2 className="dashboard-home__card-title">Top vendedores · 14 dias</h2>
            <p className="dashboard-home__card-hint">Por faturamento</p>
          </div>
          {topVendedores.length ? (
            <div className="dashboard-home__chart dashboard-home__chart--sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendedores} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke="#1f2233" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={formatAxisMoney} />
                  <YAxis type="category" dataKey="nome" width={88} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-home__empty-chart">
              Sem ranking ainda. Assim que houver vendas com vendedor, o top aparece aqui.
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-home__mid">
        <article className="dashboard-home__card">
          <div className="dashboard-home__card-head">
            <h2 className="dashboard-home__card-title">Atalhos ({atalhosAtivos.length}/6)</h2>
            <button type="button" className="dashboard-home__link" onClick={() => setModalAberto(true)}>
              <Edit size={12} style={{ marginRight: 4 }} /> Editar
            </button>
          </div>
          <div className="dashboard-home__shortcuts-grid">
            {todosAtalhos.filter((a) => atalhosAtivos.includes(a.id)).map((atalho, index) => (
              <button
                key={atalho.id}
                type="button"
                className={`dashboard-home__shortcut${index === 0 ? ' dashboard-home__shortcut--primary' : ''}`}
                onClick={atalho.acao}
              >
                {atalho.icon} {atalho.nome}
              </button>
            ))}
            {Array.from({ length: Math.max(0, 6 - atalhosAtivos.length) }).map((_, idx) => (
              <button
                key={`empty-${idx}`}
                type="button"
                className="dashboard-home__shortcut-empty"
                onClick={() => setModalAberto(true)}
              >
                <Plus size={16} color="#334155" />
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-home__card">
          <div className="dashboard-home__card-head">
            <h2 className="dashboard-home__card-title">Últimas 7 vendas</h2>
            <button type="button" className="dashboard-home__link" onClick={() => aoMudarTela?.('listagem')}>
              Ver todas
            </button>
          </div>
          <div className="dashboard-home__table-wrap">
            <table className="dashboard-home__table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr><td colSpan={6} className="dashboard-home__empty-td">Carregando…</td></tr>
                )}
                {!carregando && ultimasVendas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="dashboard-home__empty-td">
                      Nenhuma venda ainda. Comece pelo PDV.
                    </td>
                  </tr>
                )}
                {!carregando && ultimasVendas.map((venda) => (
                  <tr
                    key={venda.id}
                    onClick={() => aoMudarTela?.('venda-detalhes', 'home', { vendaId: venda.id })}
                  >
                    <td style={{ fontWeight: 700 }}>{venda.codigo ?? '—'}</td>
                    <td>
                      {venda.data_venda || venda.created_at
                        ? new Date(venda.data_venda || venda.created_at).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td>{rotuloStatus(venda.status)}</td>
                    <td>{venda.cliente?.nome || 'Consumidor'}</td>
                    <td>{descricaoItens(venda.itens)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>R$ {formatBRL(venda.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {modalAberto && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#11131c', border: '1px solid #2a2e3f', borderRadius: 10,
            width: 'min(520px, 92vw)', padding: 24,
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Personalizar atalhos</h3>
              <button type="button" onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Até 6 atalhos ({atalhosAtivos.length}/6).</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {todosAtalhos.map((atalho) => {
                const ativo = atalhosAtivos.includes(atalho.id);
                return (
                  <button
                    key={atalho.id}
                    type="button"
                    onClick={() => toggleAtalho(atalho.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${ativo ? '#38bdf8' : '#2a2e3f'}`,
                      background: ativo ? 'rgba(56,189,248,0.08)' : '#161925',
                      color: ativo ? '#38bdf8' : '#e2e8f0',
                    }}
                  >
                    {atalho.icon} {atalho.nome}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="dashboard-home__btn dashboard-home__btn--primary"
                onClick={() => setModalAberto(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
