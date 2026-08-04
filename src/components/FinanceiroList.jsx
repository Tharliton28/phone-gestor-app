import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Filter, ChevronDown,
  TrendingUp, TrendingDown, DollarSign, Calendar,
  CheckCircle, Clock, XCircle, Edit, Trash2, FileText, RefreshCw
} from 'lucide-react';
import RowActionsMenu, { RowActionsItem } from './RowActionsMenu';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL } from '../utils/formatters';
import {
  listLancamentos,
  getResumoFinanceiro,
  darBaixaLancamento,
  cancelarLancamento,
} from '../services/financeiroService';

const FinanceiroList = ({ tipo, aoClicarEmNovo }) => {
  const { lojaAtivaId } = useLoja();
  const { alert, confirm } = useDialog();
  const [menuAberto, setMenuAberto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState([]);
  const [resumo, setResumo] = useState({ totalMes: 0, pendentes7d: 0, atrasados: 0 });
  const [filtros, setFiltros] = useState({ busca: '', status: 'Todos' });

  const isReceber = tipo === 'receber';
  const tipoDb = isReceber ? 'receita' : 'despesa';

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const [listaResult, resumoResult] = await Promise.all([
      listLancamentos(lojaAtivaId, {
        tipo: tipoDb,
        busca: filtros.busca,
        status: filtros.status,
      }),
      getResumoFinanceiro(lojaAtivaId, tipoDb),
    ]);

    if (listaResult.error) {
      setErro(listaResult.error.message ?? 'Erro ao carregar lançamentos.');
      setDados([]);
    } else {
      setDados(listaResult.data ?? []);
    }

    if (!resumoResult.error && resumoResult.data) {
      setResumo(resumoResult.data);
    }

    setLoading(false);
  }, [lojaAtivaId, tipoDb, filtros.busca, filtros.status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const handleDarBaixa = async (item) => {
    setMenuAberto(null);
    const ok = await confirm(
      `Confirmar ${isReceber ? 'recebimento' : 'pagamento'} de R$ ${formatBRL(item.valor)}?`,
      { title: isReceber ? 'Dar baixa — Receber' : 'Dar baixa — Pagar', confirmLabel: 'Confirmar' }
    );
    if (!ok) return;

    const { error } = await darBaixaLancamento(lojaAtivaId, item.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível liquidar o título.', { type: 'error', title: 'Erro' });
      return;
    }
    await alert('Título liquidado com sucesso.', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const handleExcluir = async (item) => {
    setMenuAberto(null);
    const ok = await confirm('Cancelar este título financeiro?', {
      title: 'Excluir título',
      confirmLabel: 'Sim, cancelar',
      type: 'danger',
    });
    if (!ok) return;

    const { error } = await cancelarLancamento(lojaAtivaId, item.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível cancelar.', { type: 'error', title: 'Erro' });
      return;
    }
    carregar();
  };

  const renderStatus = (status) => {
    let color = '';
    let bg = '';
    if (status === 'Recebido' || status === 'Pago') { color = '#4ade80'; bg = 'rgba(34, 197, 94, 0.1)'; }
    if (status === 'Pendente') { color = '#fbbf24'; bg = 'rgba(251, 191, 36, 0.1)'; }
    if (status === 'Atrasado') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }

    return (
      <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {status === 'Pendente' ? <Clock size={12} /> : status === 'Atrasado' ? <XCircle size={12} /> : <CheckCircle size={12} />} {status}
      </span>
    );
  };

  return (
    <div style={styles.container}>

      <div style={styles.cardsGrid}>
        <div style={styles.card}>
          <div style={{ ...styles.cardIconBox, backgroundColor: isReceber ? '#4ade80' : '#ef4444' }}>
            {isReceber ? <TrendingUp size={24} color="#000" /> : <TrendingDown size={24} color="#fff" />}
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>{isReceber ? 'Total a Receber (Mês)' : 'Total a Pagar (Mês)'}</span>
            <span style={styles.cardValue}>R$ {formatBRL(resumo.totalMes)}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ ...styles.cardIconBox, backgroundColor: '#fbbf24' }}>
            <Clock size={24} color="#000" />
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Pendentes (Próx. 7 dias)</span>
            <span style={styles.cardValue}>R$ {formatBRL(resumo.pendentes7d)}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ ...styles.cardIconBox, backgroundColor: '#1e293b' }}>
            <XCircle size={24} color="#ef4444" />
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Títulos Atrasados</span>
            <span style={{ ...styles.cardValue, color: '#ef4444' }}>R$ {formatBRL(resumo.atrasados)}</span>
          </div>
        </div>
      </div>

      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmNovo} style={{ ...styles.btnSuccess, backgroundColor: isReceber ? '#3b82f6' : '#ef4444', color: '#fff' }}>
            <Plus size={16} /> Novo Lançamento
          </button>
          <button style={styles.btnOutline} onClick={carregar}><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>

      {erro && (
        <div style={{ padding: '12px', marginBottom: '10px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '6px', color: '#ef4444', fontSize: '13px' }}>
          {erro}
        </div>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Documento</th>
              <th style={styles.th}>Descrição</th>
              <th style={styles.th}>{isReceber ? 'Cliente / Origem' : 'Fornecedor / Favorecido'}</th>
              <th style={styles.th}>Vencimento</th>
              <th style={styles.th}>Forma Prevista</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Valor (R$)</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Ações</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input
                    type="text"
                    placeholder="Buscar descrição..."
                    style={styles.filterInput}
                    value={filtros.busca}
                    onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select
                  style={styles.filterInput}
                  value={filtros.status}
                  onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                >
                  <option>Todos</option>
                  <option>{isReceber ? 'Recebido' : 'Pago'}</option>
                  <option>Pendente</option>
                  <option>Atrasado</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Carregando...</td></tr>
            ) : dados.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum lançamento encontrado.</td></tr>
            ) : dados.map((item, index) => (
              <tr key={item.id} style={styles.tr}>
                <td style={{ ...styles.td, fontFamily: 'monospace', color: '#64748b' }}>{item.codigo}</td>
                <td style={{ ...styles.td, fontWeight: '500', color: '#e2e8f0' }}>{item.descricao}</td>
                <td style={{ ...styles.td, color: '#93c5fd' }}>{item.pessoa}</td>
                <td style={styles.td}>{item.vencimento}</td>
                <td style={styles.td}>{item.forma}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: isReceber ? '#4ade80' : '#ef4444' }}>
                  {isReceber ? '+' : '-'} {formatBRL(item.valor)}
                </td>
                <td style={styles.td}>{renderStatus(item.status)}</td>
                <td style={{ ...styles.td, textAlign: 'center', overflow: 'visible' }}>
                  <RowActionsMenu open={menuAberto === index} onToggle={(e) => toggleMenu(index, e)}>
                    {(item.status === 'Pendente' || item.status === 'Atrasado') && (
                      <RowActionsItem style={{ color: '#4ade80', fontWeight: 'bold' }} onClick={() => handleDarBaixa(item)}>
                        <DollarSign size={14} color="#4ade80" /> Dar Baixa ({isReceber ? 'Receber' : 'Pagar'})
                      </RowActionsItem>
                    )}
                    <RowActionsItem
                      style={{ color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px' }}
                      onClick={() => handleExcluir(item)}
                    >
                      <Trash2 size={14} color="#ef4444" /> Cancelar Título
                    </RowActionsItem>
                  </RowActionsMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },

  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' },
  card: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '6px', display: 'flex', alignItems: 'center' },
  cardIconBox: { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px' },
  cardText: { padding: '15px', display: 'flex', flexDirection: 'column' },
  cardLabel: { color: '#94a3b8', fontSize: '12px', marginBottom: '4px' },
  cardValue: { color: '#fff', fontSize: '20px', fontWeight: 'bold' },

  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnSuccess: { border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '150px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#e2e8f0', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },

};

export default FinanceiroList;
