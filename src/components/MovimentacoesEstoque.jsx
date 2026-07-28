import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Calendar, Search, Filter, Download,
  ChevronDown, FilePen, FileText, RotateCcw, Plus, X
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { listProdutos } from '../services/produtoService';
import {
  createMovimentacaoManual,
  estornarMovimentacao,
  listMovimentacoes,
  ORIGEM_LABEL,
  TIPO_LABEL,
} from '../services/movimentacaoService';

const EMPTY_FORM = {
  produtoId: '',
  tipo: 'entrada',
  quantidade: '',
  motivo: '',
};

function formatDataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function descricaoMotivo(item) {
  if (item.motivo) return item.motivo;
  return ORIGEM_LABEL[item.origem] ?? item.origem ?? '—';
}

const MovimentacoesEstoque = () => {
  const { lojaAtivaId, perfil } = useLoja();
  const [menuAberto, setMenuAberto] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filtros, setFiltros] = useState({
    codigo: '',
    produto: '',
    tipo: 'Todos',
  });

  const carregarMovimentacoes = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await listMovimentacoes(lojaAtivaId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar movimentações.');
      setMovimentacoes([]);
    } else {
      setMovimentacoes(data ?? []);
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregarMovimentacoes();
  }, [carregarMovimentacoes]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const abrirModal = async () => {
    if (!lojaAtivaId) return;

    setForm(EMPTY_FORM);
    setModalAberto(true);

    const { data } = await listProdutos(lojaAtivaId);
    setProdutos(data ?? []);
  };

  const salvarMovimentacao = async () => {
    if (!lojaAtivaId || !form.produtoId) {
      alert('Selecione um produto.');
      return;
    }

    setSalvando(true);
    const { error } = await createMovimentacaoManual(lojaAtivaId, {
      produtoId: form.produtoId,
      tipo: form.tipo,
      quantidade: form.quantidade,
      motivo: form.motivo,
      operadorId: perfil?.id,
    });
    setSalvando(false);

    if (error) {
      alert(error.message ?? 'Não foi possível registrar a movimentação.');
      return;
    }

    setModalAberto(false);
    carregarMovimentacoes();
  };

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const handleVerDetalhes = (item) => {
    alert(
      `Movimentação ${item.codigo}\n` +
        `Produto: ${item.produto?.nome ?? '—'}\n` +
        `Saldo: ${item.quantidade_anterior} → ${item.quantidade_posterior}\n` +
        `Motivo: ${descricaoMotivo(item)}`
    );
  };

  const handleEstornar = async (item) => {
    if (!lojaAtivaId) return;

    const confirmar = window.confirm(
      'Deseja estornar esta movimentação? O saldo do produto será revertido.'
    );
    if (!confirmar) return;

    const { error } = await estornarMovimentacao(lojaAtivaId, item.id, perfil?.id);

    if (error) {
      alert(error.message ?? 'Não foi possível estornar a movimentação.');
      return;
    }

    carregarMovimentacoes();
  };

  const movimentacoesFiltradas = movimentacoes.filter((item) => {
    const matchCodigo = (item.codigo ?? '')
      .toLowerCase()
      .includes(filtros.codigo.toLowerCase());
    const nomeProduto = item.produto?.nome ?? '';
    const matchProduto = nomeProduto.toLowerCase().includes(filtros.produto.toLowerCase());

    let matchTipo = true;
    if (filtros.tipo === 'Estornados') {
      matchTipo = item.estornado === true;
    } else if (filtros.tipo === 'Entrada') {
      matchTipo = item.tipo === 'entrada' && !item.estornado;
    } else if (filtros.tipo === 'Saída') {
      matchTipo = item.tipo === 'saida' && !item.estornado;
    } else if (filtros.tipo === 'Ajuste') {
      matchTipo = item.tipo === 'ajuste' && !item.estornado;
    }

    return matchCodigo && matchProduto && matchTipo;
  });

  return (
    <div style={styles.container}>

      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnPrimary} onClick={abrirModal}>
            <Plus size={14} /> Nova Movimentação Manual
          </button>
          <button style={styles.btnFilter}>
            <Filter size={14} /> Filtros Avançados
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}>
            <Download size={14} /> Exportar Extrato <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '60px' }}></th>
              <th style={styles.th}>ID Mov.</th>
              <th style={styles.th}>Data / Hora</th>
              <th style={styles.th}>Produto</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Tipo</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Qtd.</th>
              <th style={styles.th}>Motivo / Origem</th>
              <th style={styles.th}>Responsável</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <input
                  type="text"
                  style={styles.filterInput}
                  placeholder="ID..."
                  value={filtros.codigo}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, codigo: e.target.value }))}
                />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" style={styles.filterInput} disabled placeholder="—" />
                  <Calendar size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input
                    type="text"
                    placeholder="Filtrar por produto..."
                    style={styles.filterInput}
                    value={filtros.produto}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, produto: e.target.value }))}
                  />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select
                  style={styles.filterInput}
                  value={filtros.tipo}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, tipo: e.target.value }))}
                >
                  <option>Todos</option>
                  <option>Entrada</option>
                  <option>Saída</option>
                  <option>Ajuste</option>
                  <option>Estornados</option>
                </select>
              </td>
              <td colSpan="3" style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  Carregando movimentações...
                </td>
              </tr>
            ) : movimentacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              movimentacoesFiltradas.map((item, index) => {
                const isEstornado = item.estornado;
                const tipoLabel = TIPO_LABEL[item.tipo] ?? item.tipo;

                return (
                  <tr key={item.id} style={{ ...styles.tr, opacity: isEstornado ? 0.6 : 1 }}>
                    <td style={styles.td}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                          <FilePen size={14} /> <ChevronDown size={12} />
                        </button>

                        {menuAberto === index && (
                          <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div
                              style={styles.dropdownItem}
                              onClick={() => {
                                setMenuAberto(null);
                                handleVerDetalhes(item);
                              }}
                            >
                              <FileText size={14} color="#94a3b8" /> Ver Detalhes / Log
                            </div>

                            {!isEstornado && item.origem === 'manual' && (
                              <div
                                style={{
                                  ...styles.dropdownItem,
                                  color: '#ef4444',
                                  borderTop: '1px solid #1f2233',
                                  marginTop: '4px',
                                  paddingTop: '8px',
                                }}
                                onClick={() => {
                                  setMenuAberto(null);
                                  handleEstornar(item);
                                }}
                              >
                                <RotateCcw size={14} color="#ef4444" /> Estornar Registro
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontFamily: 'monospace',
                        color: '#64748b',
                        textDecoration: isEstornado ? 'line-through' : 'none',
                      }}
                    >
                      {item.codigo}
                    </td>
                    <td style={{ ...styles.td, textDecoration: isEstornado ? 'line-through' : 'none' }}>
                      {formatDataHora(item.created_at)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: '500',
                        color: isEstornado ? '#64748b' : '#e2e8f0',
                        textDecoration: isEstornado ? 'line-through' : 'none',
                      }}
                    >
                      {item.produto?.nome ?? '—'}
                    </td>

                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {isEstornado ? (
                        <span style={styles.badgeEstornado}>
                          <RotateCcw size={12} /> Estornado
                        </span>
                      ) : item.tipo === 'entrada' ? (
                        <span style={styles.badgeEntrada}>
                          <ArrowUpRight size={12} /> {tipoLabel}
                        </span>
                      ) : item.tipo === 'saida' ? (
                        <span style={styles.badgeSaida}>
                          <ArrowDownLeft size={12} /> {tipoLabel}
                        </span>
                      ) : (
                        <span style={styles.badgeAjuste}>
                          <FilePen size={12} /> {tipoLabel}
                        </span>
                      )}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: isEstornado ? '#64748b' : item.quantidade > 0 ? '#4ade80' : '#ef4444',
                        textDecoration: isEstornado ? 'line-through' : 'none',
                      }}
                    >
                      {item.quantidade > 0 ? `+${item.quantidade}` : item.quantidade}
                    </td>

                    <td style={{ ...styles.td, color: isEstornado ? '#64748b' : '#93c5fd' }}>
                      {descricaoMotivo(item)}
                    </td>
                    <td style={styles.td}>{item.operador?.nome ?? '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nova Movimentação Manual</h3>
              <button style={styles.modalClose} onClick={() => setModalAberto(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Produto</label>
                <select
                  style={styles.input}
                  value={form.produtoId}
                  onChange={(e) => setForm((prev) => ({ ...prev, produtoId: e.target.value }))}
                >
                  <option value="">Selecionar produto...</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      #{produto.codigo} — {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Tipo</label>
                <select
                  style={styles.input}
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste (+ ou -)</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantidade</label>
                <input
                  style={styles.input}
                  type="number"
                  value={form.quantidade}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantidade: e.target.value }))}
                  placeholder={form.tipo === 'ajuste' ? 'Ex: -2 ou 5' : 'Ex: 1'}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Motivo</label>
                <input
                  style={styles.input}
                  value={form.motivo}
                  onChange={(e) => setForm((prev) => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ex: Balanço inicial, item danificado..."
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button style={styles.btnPrimary} onClick={salvarMovimentacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Registrar Movimentação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnPrimary: { backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' },
  btnFilter: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  erro: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' },

  tableWrapper: { overflow: 'visible', marginTop: '20px', paddingBottom: '150px' },

  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s, opacity 0.3s' },
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },

  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },

  badgeEntrada: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeSaida: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeAjuste: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeEstornado: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },

  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modal: { backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '8px', width: '100%', maxWidth: '480px', margin: '20px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1f2233' },
  modalTitle: { color: '#e2e8f0', fontSize: '16px', margin: 0 },
  modalClose: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #1f2233' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },
};

export default MovimentacoesEstoque;
