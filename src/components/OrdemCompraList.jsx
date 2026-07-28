import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Settings, Eraser, Download, ChevronDown,
  Search, Calendar, FilePen, Edit, FileText,
  PackageCheck, Printer, XCircle
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import {
  cancelarOrdemCompra,
  listOrdensCompra,
  receberOrdemCompra,
  STATUS_LABEL,
} from '../services/ordemCompraService';
import { formatBRL } from '../utils/formatters';

function formatData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const OrdemCompraList = ({ aoClicarEmNova, aoMudarTela }) => {
  const { lojaAtivaId, perfil } = useLoja();
  const [menuAberto, setMenuAberto] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({ codigo: '', fornecedor: '', status: 'Todos' });

  const carregarOrdens = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await listOrdensCompra(lojaAtivaId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar ordens de compra.');
      setOrdens([]);
    } else {
      setOrdens(data ?? []);
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregarOrdens();
  }, [carregarOrdens]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const editarOrdem = (ordem) => {
    setMenuAberto(null);
    if (aoMudarTela) {
      aoMudarTela('nova-ordem-compra', 'ordem-compra', { ordemCompraId: ordem.id });
    }
  };

  const handleVerDetalhes = (ordem) => {
    setMenuAberto(null);
    editarOrdem(ordem);
  };

  const handleDarEntrada = async (ordem) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    const confirmar = window.confirm(
      `Confirmar recebimento da ${ordem.codigo}? Os produtos entrarão no estoque automaticamente.`
    );
    if (!confirmar) return;

    const { error } = await receberOrdemCompra(lojaAtivaId, ordem.id, perfil?.id);

    if (error) {
      alert(error.message ?? 'Não foi possível receber a ordem de compra.');
      return;
    }

    carregarOrdens();
  };

  const handleCancelar = async (ordem) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    if (!window.confirm(`Cancelar a ordem ${ordem.codigo}?`)) return;

    const { error } = await cancelarOrdemCompra(lojaAtivaId, ordem.id);

    if (error) {
      alert(error.message ?? 'Não foi possível cancelar a ordem.');
      return;
    }

    carregarOrdens();
  };

  const limparFiltros = () => setFiltros({ codigo: '', fornecedor: '', status: 'Todos' });

  const ordensFiltradas = ordens.filter((item) => {
    const matchCodigo = (item.codigo ?? '').toLowerCase().includes(filtros.codigo.toLowerCase());
    const nomeFornecedor = item.fornecedor?.nome ?? '';
    const matchFornecedor = nomeFornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase());
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;
    const matchStatus =
      filtros.status === 'Todos' ||
      statusLabel.toLowerCase() === filtros.status.toLowerCase() ||
      item.status === filtros.status.toLowerCase();

    return matchCodigo && matchFornecedor && matchStatus;
  });

  const renderStatus = (status) => {
    const label = STATUS_LABEL[status] ?? status;
    let color = '#94a3b8';
    let bg = 'rgba(100, 116, 139, 0.15)';

    if (status === 'pendente') {
      color = '#fbbf24';
      bg = 'rgba(251, 191, 36, 0.1)';
    }
    if (status === 'recebido') {
      color = '#4ade80';
      bg = 'rgba(34, 197, 94, 0.1)';
    }
    if (status === 'cancelado') {
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.1)';
    }

    return (
      <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
        {label}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmNova} style={styles.btnSuccess}>
            <Plus size={16} /> Nova Ordem de Compra
          </button>
          <button style={styles.btnOutline}><Settings size={14} /> Ferramentas <ChevronDown size={14} /></button>
          <button style={styles.btnOutlineWarning} onClick={limparFiltros}>
            <Eraser size={14} /> Limpar filtros
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}><Download size={14} /> Exportar <ChevronDown size={14} /></button>
        </div>
      </div>

      {erro && <div style={styles.erro}>{erro}</div>}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '60px' }}></th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Fornecedor</th>
              <th style={styles.th}>Data de Emissão</th>
              <th style={styles.th}>Previsão de Entrega</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Valor Total (R$)</th>
              <th style={styles.th}>Status</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <input
                  type="text"
                  style={styles.filterInput}
                  placeholder="Buscar Cód..."
                  value={filtros.codigo}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, codigo: e.target.value }))}
                />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input
                    type="text"
                    placeholder="Buscar fornecedor..."
                    style={styles.filterInput}
                    value={filtros.fornecedor}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, fornecedor: e.target.value }))}
                  />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} disabled /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} disabled /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select
                  style={styles.filterInput}
                  value={filtros.status}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option>Todos</option>
                  <option>Pendente</option>
                  <option>Recebido</option>
                  <option>Cancelado</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  Carregando ordens de compra...
                </td>
              </tr>
            ) : ordensFiltradas.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                  Nenhuma ordem de compra encontrada.
                </td>
              </tr>
            ) : (
              ordensFiltradas.map((item, index) => (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                        <FilePen size={14} /> <ChevronDown size={12} />
                      </button>

                      {menuAberto === index && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.dropdownItem} onClick={() => editarOrdem(item)}>
                            <Edit size={14} color="#38bdf8" /> Editar / Ver Ordem
                          </div>
                          <div style={styles.dropdownItem} onClick={() => handleVerDetalhes(item)}>
                            <FileText size={14} color="#94a3b8" /> Ver Detalhes
                          </div>
                          {item.status === 'pendente' && (
                            <div style={styles.dropdownItem} onClick={() => handleDarEntrada(item)}>
                              <PackageCheck size={14} color="#22c55e" /> Dar Entrada (Receber)
                            </div>
                          )}
                          <div style={styles.dropdownItem} onClick={() => alert('Impressão/PDF em breve.')}>
                            <Printer size={14} color="#94a3b8" /> Imprimir / PDF
                          </div>
                          {item.status === 'pendente' && (
                            <div
                              style={{
                                ...styles.dropdownItem,
                                color: '#ef4444',
                                borderTop: '1px solid #1f2233',
                                marginTop: '4px',
                                paddingTop: '8px',
                              }}
                              onClick={() => handleCancelar(item)}
                            >
                              <XCircle size={14} color="#ef4444" /> Cancelar Ordem
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontWeight: '500', color: '#e2e8f0' }}>{item.codigo}</td>
                  <td style={{ ...styles.td, color: '#93c5fd' }}>{item.fornecedor?.nome ?? '—'}</td>
                  <td style={styles.td}>{formatData(item.data_emissao)}</td>
                  <td style={styles.td}>{formatData(item.previsao_entrega)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{formatBRL(item.valor_total)}</td>
                  <td style={styles.td}>{renderStatus(item.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnSuccess: { backgroundColor: '#4ade80', color: '#0b0c10', padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutlineWarning: { backgroundColor: 'transparent', border: '1px solid #fbbf24', color: '#fbbf24', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  erro: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' },
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
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },
};

export default OrdemCompraList;
