import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, Play, Save, CheckCircle, AlertTriangle,
  Search, Filter, MinusCircle
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { TIPO_LABEL } from '../services/produtoService';
import {
  finalizarInventario,
  getItensInventario,
  getSessaoAberta,
  iniciarInventario,
  updateContagemItem,
} from '../services/inventarioService';

function renderStatusBadge(status, sistema, contado) {
  const divergencia = contado - sistema;

  if (status === 'ok' || divergencia === 0) {
    return <span style={styles.badgeOk}><CheckCircle size={12} /> Bateu</span>;
  }
  if (status === 'faltando' || divergencia < 0) {
    return <span style={styles.badgeFalta}><MinusCircle size={12} /> Faltou ({divergencia})</span>;
  }
  return <span style={styles.badgeSobra}><AlertTriangle size={12} /> Sobrou (+{divergencia})</span>;
}

const Inventario = () => {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const [sessao, setSessao] = useState(null);
  const [itens, setItens] = useState([]);
  const [contagens, setContagens] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroBusca, setFiltroBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data: sessaoAberta, error: sessaoError } = await getSessaoAberta(lojaAtivaId);

    if (sessaoError) {
      setErro(sessaoError.message);
      setSessao(null);
      setItens([]);
      setLoading(false);
      return;
    }

    setSessao(sessaoAberta);

    if (!sessaoAberta) {
      setItens([]);
      setContagens({});
      setLoading(false);
      return;
    }

    const { data, error: itensError } = await getItensInventario(lojaAtivaId, sessaoAberta.id);

    if (itensError) {
      setErro(itensError.message);
      setItens([]);
    } else {
      setItens(data ?? []);
      const map = {};
      (data ?? []).forEach((item) => {
        map[item.id] = item.quantidade_contada ?? item.quantidade_sistema;
      });
      setContagens(map);
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleNovoBalanco = async () => {
    if (!lojaAtivaId) return;

    const confirmar = await confirm(
      'Iniciar novo balanço? Será criada uma sessão com todos os produtos ativos do estoque.',
      { title: 'Iniciar inventário', confirmVariant: 'primary' }
    );
    if (!confirmar) return;

    setSalvando(true);
    const { error } = await iniciarInventario(lojaAtivaId, perfil?.id);
    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível iniciar o inventário.', { type: 'error', title: 'Erro' });
      return;
    }

    carregar();
  };

  const handleSalvar = async () => {
    if (!lojaAtivaId || !sessao) return;

    setSalvando(true);
    setErro(null);

    for (const item of itens) {
      const contagem = contagens[item.id];
      if (contagem == null || contagem === '') {
        setSalvando(false);
        await alert(`Informe a contagem física de "${item.produto?.nome ?? 'produto'}".`, { type: 'warning', title: 'Contagem pendente' });
        return;
      }

      const { error: updateError } = await updateContagemItem(lojaAtivaId, item.id, contagem);
      if (updateError) {
        setSalvando(false);
        await alert(updateError.message ?? 'Erro ao salvar contagem.', { type: 'error', title: 'Erro' });
        return;
      }
    }

    const { error } = await finalizarInventario(lojaAtivaId, sessao.id, perfil?.id);
    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível finalizar o inventário.', { type: 'error', title: 'Erro' });
      return;
    }

    await alert('Inventário finalizado e estoque ajustado com sucesso!', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const contada = Number(contagens[item.id] ?? item.quantidade_sistema);
      const divergencia = contada - item.quantidade_sistema;
      const nome = item.produto?.nome ?? '';

      if (filtroBusca && !nome.toLowerCase().includes(filtroBusca.toLowerCase())) {
        return false;
      }

      if (filtroStatus === 'divergentes') return divergencia !== 0;
      if (filtroStatus === 'ok') return divergencia === 0;
      return true;
    });
  }, [itens, contagens, filtroBusca, filtroStatus]);

  const resumo = useMemo(() => {
    const total = itens.length;
    let divergentes = 0;
    itens.forEach((item) => {
      const contada = Number(contagens[item.id] ?? item.quantidade_sistema);
      if (contada - item.quantidade_sistema !== 0) divergentes += 1;
    });
    const precisao = total > 0 ? Math.round(((total - divergentes) / total) * 100) : 0;
    return { total, divergentes, precisao };
  }, [itens, contagens]);

  return (
    <div style={styles.container}>
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnPrimary} onClick={handleNovoBalanco} disabled={salvando || Boolean(sessao)}>
            <Play size={16} fill="#fff" /> Iniciar Novo Balanço
          </button>
          <button style={styles.btnOutline} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
            <Filter size={14} /> Filtros Avançados {filtrosAbertos ? '▲' : '▼'}
          </button>
        </div>
        <div style={styles.rightActions}>
          {sessao && (
            <span style={styles.sessaoBadge}>Sessão {sessao.codigo} — Aberta</span>
          )}
          <button
            style={{ ...styles.btnSuccess, opacity: sessao ? 1 : 0.5 }}
            onClick={handleSalvar}
            disabled={!sessao || salvando}
          >
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar & Ajustar Estoque'}
          </button>
        </div>
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      {filtrosAbertos && (
        <div style={styles.advancedFiltersPanel}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Filtrar por Status:</label>
            <select style={styles.input} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todos">Mostrar Todos</option>
              <option value="divergentes">Apenas Divergentes (Sobra/Falta)</option>
              <option value="ok">Apenas Estoque Correto</option>
            </select>
          </div>
        </div>
      )}

      {sessao && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryTextGroup}>
              <span style={styles.summaryLabel}>Total de Itens Listados</span>
              <span style={styles.summaryValue}>{resumo.total}</span>
            </div>
            <ClipboardList size={32} color="#38bdf8" style={{ opacity: 0.8 }} />
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryTextGroup}>
              <span style={styles.summaryLabel}>Itens Divergentes</span>
              <span style={{ ...styles.summaryValue, color: '#ef4444' }}>{resumo.divergentes}</span>
            </div>
            <AlertTriangle size={32} color="#ef4444" style={{ opacity: 0.8 }} />
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryTextGroup}>
              <span style={styles.summaryLabel}>Precisão do Estoque</span>
              <span style={{ ...styles.summaryValue, color: '#22c55e' }}>{resumo.precisao}%</span>
            </div>
            <CheckCircle size={32} color="#22c55e" style={{ opacity: 0.8 }} />
          </div>
        </div>
      )}

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando inventário...</div>
        ) : !sessao ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Nenhum balanço em andamento. Clique em <strong>Iniciar Novo Balanço</strong> para começar.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cód.</th>
                <th style={styles.th}>Produto</th>
                <th style={styles.th}>Categoria</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Qtd. Sistema</th>
                <th style={{ ...styles.th, textAlign: 'center', color: '#38bdf8' }}>Qtd. Física (Contada)</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Divergência</th>
                <th style={styles.th}>Status</th>
              </tr>
              <tr style={styles.filterRow}>
                <td style={styles.tdFilter}></td>
                <td style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      style={styles.filterInput}
                      value={filtroBusca}
                      onChange={(e) => setFiltroBusca(e.target.value)}
                    />
                    <Search size={14} style={styles.innerIcon} />
                  </div>
                </td>
                <td colSpan="5" style={styles.tdFilter}></td>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Nenhum item encontrado.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const contada = Number(contagens[item.id] ?? item.quantidade_sistema);
                  const divergencia = contada - item.quantidade_sistema;

                  return (
                    <tr key={item.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: '#64748b' }}>{item.produto?.codigo}</td>
                      <td style={{ ...styles.td, fontWeight: '500', color: '#e2e8f0' }}>{item.produto?.nome}</td>
                      <td style={styles.td}>{TIPO_LABEL[item.produto?.tipo] ?? item.produto?.categoria}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {item.quantidade_sistema}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={contagens[item.id] ?? ''}
                          onChange={(e) =>
                            setContagens((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          style={styles.inputCount}
                        />
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: divergencia === 0 ? '#64748b' : divergencia > 0 ? '#fbbf24' : '#ef4444',
                        }}
                      >
                        {divergencia > 0 ? `+${divergencia}` : divergencia}
                      </td>
                      <td style={styles.td}>
                        {renderStatusBadge(item.status, item.quantidade_sistema, contada)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233', flexWrap: 'wrap', gap: '10px' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  sessaoBadge: { color: '#38bdf8', fontSize: '12px', fontWeight: '600' },
  erro: { color: '#ef4444', fontSize: '13px', marginTop: '12px' },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSuccess: { backgroundColor: '#22c55e', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  advancedFiltersPanel: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '20px', backgroundColor: '#0f111a', borderBottom: '1px solid #1f2233', borderRadius: '0 0 8px 8px', marginTop: '12px', marginBottom: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#94a3b8' },
  input: { backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px', color: '#fff', fontSize: '13px', width: '100%' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '16px' },
  summaryCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '6px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryTextGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  summaryLabel: { fontSize: '12px', color: '#94a3b8' },
  summaryValue: { fontSize: '24px', fontWeight: 'bold', color: '#fff' },
  tableWrapper: { overflowX: 'auto', marginTop: '20px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233', verticalAlign: 'middle' },
  tr: { backgroundColor: '#11131c' },
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  inputCount: { width: '80px', padding: '8px', backgroundColor: '#161925', border: '1px solid #38bdf8', borderRadius: '4px', color: '#fff', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' },
  badgeOk: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeFalta: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeSobra: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
};

export default Inventario;
