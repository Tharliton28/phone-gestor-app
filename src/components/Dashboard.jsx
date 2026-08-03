import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart, Users, Package, PenTool, AlertTriangle,
  Settings, FileText, Zap, DollarSign, BarChart2, Edit, Plus,
  Banknote, ShoppingBasket, RefreshCw,
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { calcResumoVendas, periodoPadrao } from '../domain/relatorioCalculos';
import { getRelatorioVendas } from '../services/relatorioService';
import { listVendas } from '../services/vendaService';
import { formatBRL, truncate } from '../utils/formatters';

function isSameLocalDay(dateValue, ref = new Date()) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return (
    d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate()
  );
}

function rotuloStatus(status) {
  const map = {
    concluido: 'Concluída',
    pre_venda: 'Pré-venda',
    cancelado: 'Cancelada',
  };
  return map[status] || status || '—';
}

function descricaoItens(itens = []) {
  if (!itens.length) return '—';
  const nomes = itens.map((i) => i.descricao || i.produto?.nome || 'Item').filter(Boolean);
  if (nomes.length === 1) return truncate(nomes[0], 48);
  return truncate(`${nomes[0]} +${nomes.length - 1}`, 48);
}

const Dashboard = ({ aoClicarEmNovaVenda, aoMudarTela }) => {
  const { alert } = useDialog();
  const { lojaAtivaId } = useLoja();
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [resumoMes, setResumoMes] = useState({ quantidade: 0, faturamento: 0, ticketMedio: 0 });
  const [resumoHoje, setResumoHoje] = useState({ quantidade: 0, faturamento: 0, ticketMedio: 0 });
  const [ultimasVendas, setUltimasVendas] = useState([]);

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
    {
      id: 10,
      nome: 'Histórico',
      icon: <AlertTriangle size={18} />,
      acao: () => aoMudarTela?.('historico'),
    },
  ], [aoClicarEmNovaVenda, aoMudarTela]);

  const [atalhosAtivos, setAtalhosAtivos] = useState([1, 2, 3, 4, 6]);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);

    const periodo = periodoPadrao();
    const [mesResult, ultimasResult] = await Promise.all([
      getRelatorioVendas(lojaAtivaId, periodo),
      listVendas(lojaAtivaId, { limit: 7 }),
    ]);

    if (mesResult.error) {
      await alert(mesResult.error.message ?? 'Erro ao carregar resumo do mês.', {
        type: 'error',
        title: 'Dashboard',
      });
    } else {
      const vendasMes = mesResult.data?.vendas ?? [];
      setResumoMes(mesResult.data?.resumo ?? calcResumoVendas(vendasMes));
      const hoje = vendasMes.filter((v) => isSameLocalDay(v.data_venda || v.created_at));
      setResumoHoje(calcResumoVendas(hoje));
    }

    if (ultimasResult.error) {
      await alert(ultimasResult.error.message ?? 'Erro ao carregar últimas vendas.', {
        type: 'error',
        title: 'Dashboard',
      });
      setUltimasVendas([]);
    } else {
      setUltimasVendas(ultimasResult.data ?? []);
    }

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
      alert('Você já atingiu o limite máximo de 6 atalhos. Remova um para adicionar outro.', {
        type: 'warning',
        title: 'Limite de atalhos',
      });
      return;
    }
    setAtalhosAtivos([...atalhosAtivos, id]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <div style={styles.shortcutsCard}>
          <div style={styles.cardHeader}>
            <span style={styles.activeTab}>Atalhos rápidos ({atalhosAtivos.length}/6)</span>
            <button type="button" style={styles.btnConfigShortcut} onClick={() => setModalAberto(true)}>
              <Edit size={14} /> Editar
            </button>
          </div>

          <div style={styles.shortcutsGrid}>
            {todosAtalhos.filter((a) => atalhosAtivos.includes(a.id)).map((atalho, index) => (
              <button
                key={atalho.id}
                type="button"
                style={index === 0 ? { ...styles.shortcutBtn, ...styles.btnPrimary } : styles.shortcutBtn}
                onClick={atalho.acao || undefined}
              >
                {atalho.icon} {atalho.nome}
              </button>
            ))}

            {Array.from({ length: 6 - atalhosAtivos.length }).map((_, idx) => (
              <button key={`empty-${idx}`} type="button" style={styles.shortcutBtnEmpty} onClick={() => setModalAberto(true)}>
                <Plus size={18} color="#2a2e3f" />
              </button>
            ))}
          </div>
        </div>

        <div style={styles.bannerCard}>
          <div style={styles.bannerContent}>
            <h2 style={styles.bannerTitle}>
              PhoneGestor <span style={{ color: '#38bdf8' }}>ERP</span>
            </h2>
            <p style={styles.bannerSubtitle}>Painel da loja com dados reais do mês e do dia.</p>
            <p style={styles.bannerText}>
              Use os atalhos ou abra Relatórios para análises mais profundas. Lucro detalhado entra quando o custo do estoque estiver completo no fluxo.
            </p>
            <button type="button" style={styles.bannerBtn} onClick={aoClicarEmNovaVenda}>
              Nova venda
            </button>
          </div>
        </div>
      </div>

      <div style={styles.dailySection}>
        <div style={styles.widgetsHeader}>
          <h3 style={styles.sectionTitle}>Resumo de vendas</h3>
          <button type="button" style={styles.btnGhost} onClick={carregar} disabled={carregando}>
            <RefreshCw size={14} /> {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        <div style={styles.metricsGrid}>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>{formatBRL(resumoHoje.faturamento)}</span>
              <span style={styles.metricProj}>Hoje · {resumoHoje.quantidade} venda(s)</span>
              <span style={styles.metricLabel}>Faturamento do dia (R$)</span>
            </div>
            <Banknote size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardBlue}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>{resumoMes.quantidade}</span>
              <span style={styles.metricProj}>Mês atual · R$ {formatBRL(resumoMes.faturamento)}</span>
              <span style={styles.metricLabel}>Qtd. vendas no mês</span>
            </div>
            <ShoppingBasket size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>{formatBRL(resumoMes.ticketMedio)}</span>
              <span style={styles.metricProj}>Média das vendas concluídas</span>
              <span style={styles.metricLabel}>Ticket médio (mês)</span>
            </div>
            <Banknote size={60} style={styles.metricIconBg} />
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <div style={styles.tableHeader}>
            <h4 style={styles.tableTitle}>Últimas 7 vendas</h4>
            <button type="button" style={styles.linkBtn} onClick={() => aoMudarTela?.('listagem')}>
              Ver todas
            </button>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Vendedor</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Itens</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr>
                    <td colSpan={7} style={styles.emptyTd}>Carregando vendas…</td>
                  </tr>
                )}
                {!carregando && ultimasVendas.length === 0 && (
                  <tr>
                    <td colSpan={7} style={styles.emptyTd}>
                      Nenhuma venda ainda. Faça a primeira pelo PDV.
                    </td>
                  </tr>
                )}
                {!carregando && ultimasVendas.map((venda) => (
                  <tr
                    key={venda.id}
                    style={styles.tr}
                    onClick={() => aoMudarTela?.('venda-detalhes', 'home', { vendaId: venda.id })}
                  >
                    <td style={{ ...styles.td, fontWeight: 700 }}>{venda.codigo ?? '—'}</td>
                    <td style={styles.td}>
                      {venda.data_venda || venda.created_at
                        ? new Date(venda.data_venda || venda.created_at).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td style={styles.td}>{rotuloStatus(venda.status)}</td>
                    <td style={styles.td}>{venda.vendedor?.nome || '—'}</td>
                    <td style={styles.td}>{venda.cliente?.nome || 'Consumidor'}</td>
                    <td style={styles.td}>{descricaoItens(venda.itens)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>
                      {formatBRL(venda.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Personalizar atalhos</h3>
              <button type="button" style={styles.btnClose} onClick={() => setModalAberto(false)}>×</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
              Selecione até 6 atalhos ({atalhosAtivos.length}/6).
            </p>
            <div style={styles.modalGrid}>
              {todosAtalhos.map((atalho) => {
                const isActive = atalhosAtivos.includes(atalho.id);
                return (
                  <button
                    key={atalho.id}
                    type="button"
                    style={{
                      ...styles.modalItem,
                      borderColor: isActive ? '#38bdf8' : '#2a2e3f',
                      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.05)' : '#161925',
                    }}
                    onClick={() => toggleAtalho(atalho.id)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: isActive ? '#38bdf8' : '#e2e8f0' }}>
                      {atalho.icon} {atalho.nome}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnSaveModal} onClick={() => setModalAberto(false)}>
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, paddingBottom: '40px' },
  topRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  shortcutsCard: {
    backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233',
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #1f2233', paddingBottom: '15px',
  },
  activeTab: { color: '#e2e8f0', fontSize: '14px', fontWeight: 500 },
  btnConfigShortcut: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
    border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
  },
  shortcutsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  shortcutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0',
    padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
  },
  shortcutBtnEmpty: {
    backgroundColor: 'transparent', border: '1px dashed #2a2e3f', padding: '15px',
    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#ffffff', border: 'none' },
  bannerCard: {
    backgroundColor: '#0b0c10', borderRadius: '8px', border: '1px solid #1f2233',
    padding: '32px', backgroundImage: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 50%)',
  },
  bannerContent: { position: 'relative', zIndex: 2 },
  bannerTitle: { fontSize: '28px', color: '#fff', marginBottom: '10px', fontWeight: 800 },
  bannerSubtitle: { fontSize: '16px', color: '#e2e8f0', marginBottom: '8px' },
  bannerText: { fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 },
  bannerBtn: {
    backgroundColor: '#3b82f6', color: '#ffffff', border: 'none',
    padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer',
  },
  dailySection: {
    backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233',
    padding: '20px', display: 'flex', flexDirection: 'column',
  },
  widgetsHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #1f2233', paddingBottom: '15px',
  },
  sectionTitle: { fontSize: '16px', color: '#e2e8f0', fontWeight: 600, margin: 0 },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent',
    border: '1px solid #2a2e3f', color: '#94a3b8', borderRadius: '6px',
    padding: '8px 10px', cursor: 'pointer', fontSize: '12px',
  },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '20px' },
  metricCardGreen: {
    backgroundColor: '#22c55e', borderRadius: '8px', padding: '20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  metricCardBlue: {
    backgroundColor: '#3b82f6', borderRadius: '8px', padding: '20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  metricContent: { display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 },
  metricValue: { fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-1px' },
  metricProj: { fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 },
  metricLabel: { fontSize: '14px', color: '#ffffff', marginTop: '4px', fontWeight: 500 },
  metricIconBg: {
    position: 'absolute', right: '-10px', bottom: '-10px',
    color: 'rgba(255, 255, 255, 0.2)', transform: 'rotate(-10deg)', zIndex: 1,
  },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  tableTitle: { fontSize: '14px', color: '#e2e8f0', margin: 0, fontWeight: 500 },
  linkBtn: {
    background: 'none', border: 'none', color: '#38bdf8', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer',
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', borderTop: '1px solid #1f2233' },
  th: { padding: '12px', color: '#a1a1aa', fontSize: '12px', fontWeight: 500, borderBottom: '1px solid #1f2233' },
  td: { padding: '12px', color: '#e2e8f0', fontSize: '12px', borderBottom: '1px solid #1f2233' },
  emptyTd: { padding: '28px 12px', color: '#64748b', fontSize: '13px', textAlign: 'center' },
  tr: { transition: 'background-color 0.2s', cursor: 'pointer' },
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px',
    width: 'min(500px, 92vw)', padding: '24px',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  btnClose: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '22px' },
  modalGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
    maxHeight: '300px', overflowY: 'auto',
  },
  modalItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', border: '1px solid', borderRadius: '6px', cursor: 'pointer',
    width: '100%', textAlign: 'left',
  },
  modalFooter: {
    marginTop: '24px', display: 'flex', justifyContent: 'flex-end',
    borderTop: '1px solid #1f2233', paddingTop: '16px',
  },
  btnSaveModal: {
    backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
  },
};

export default Dashboard;
