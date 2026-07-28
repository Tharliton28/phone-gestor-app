import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Filter, ChevronDown, Wrench, Clock, CheckCircle,
  FilePen, Edit, Printer, MessageCircle, DollarSign, Ban, FileText, AlertTriangle
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { formatBRL } from '../utils/formatters';
import {
  cancelarOrdemServico,
  finalizarOrdemServico,
  getOrdemServicoStats,
  listOrdensServico,
  STATUS_COLORS,
  STATUS_LABEL,
} from '../services/osService';

function resumoServico(os) {
  const relato = os.relato_cliente?.trim();
  if (relato) return relato.length > 60 ? `${relato.slice(0, 60)}…` : relato;
  return '—';
}

const OSList = ({ aoClicarEmNova, aoMudarTela }) => {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const [ordens, setOrdens] = useState([]);
  const [stats, setStats] = useState({ abertas: 0, emManutencao: 0, aguardandoPeca: 0, finalizadas: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const [listResult, statsResult] = await Promise.all([
      listOrdensServico(lojaAtivaId),
      getOrdemServicoStats(lojaAtivaId),
    ]);

    if (listResult.error) {
      setErro(listResult.error.message ?? 'Erro ao carregar ordens de serviço.');
      setOrdens([]);
    } else {
      setOrdens(listResult.data ?? []);
    }

    if (!statsResult.error) {
      setStats(statsResult);
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === id ? null : id);
  };

  const editarOS = (os) => {
    setMenuAberto(null);
    if (aoMudarTela) {
      aoMudarTela('nova-os', 'listagem-os', { osId: os.id });
    }
  };

  const handleFinalizar = async (os) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    const confirmar = await confirm(
      `Finalizar a ${os.codigo}? Peças vinculadas serão baixadas do estoque automaticamente.`,
      { title: 'Finalizar OS', confirmLabel: 'Finalizar', confirmVariant: 'primary' }
    );
    if (!confirmar) return;

    const { error } = await finalizarOrdemServico(lojaAtivaId, os.id, perfil?.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível finalizar a OS.', { type: 'error', title: 'Erro' });
      return;
    }

    await alert('OS finalizada com sucesso!', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const handleCancelar = async (os) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    const confirmar = await confirm(`Cancelar a ${os.codigo}?`, { title: 'Cancelar OS' });
    if (!confirmar) return;

    const { error } = await cancelarOrdemServico(lojaAtivaId, os.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível cancelar a OS.', { type: 'error', title: 'Erro' });
      return;
    }

    carregar();
  };

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((os) => {
      if (filtroStatus !== 'todos' && os.status !== filtroStatus) return false;

      if (!busca.trim()) return true;

      const termo = busca.toLowerCase();
      return (
        os.codigo?.toLowerCase().includes(termo) ||
        os.cliente?.nome?.toLowerCase().includes(termo) ||
        os.aparelho_modelo?.toLowerCase().includes(termo) ||
        os.relato_cliente?.toLowerCase().includes(termo)
      );
    });
  }, [ordens, busca, filtroStatus]);

  const renderStatus = (status) => {
    const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.aberta;
    return (
      <span
        style={{
          color: cfg.color,
          backgroundColor: cfg.bg,
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <Clock size={22} color="#94a3b8" />
          <div>
            <div style={styles.metricLabel}>Abertas</div>
            <div style={styles.metricValue}>{stats.abertas}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <Wrench size={22} color="#38bdf8" />
          <div>
            <div style={styles.metricLabel}>Em Manutenção</div>
            <div style={{ ...styles.metricValue, color: '#38bdf8' }}>{stats.emManutencao}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <AlertTriangle size={22} color="#fbbf24" />
          <div>
            <div style={styles.metricLabel}>Aguardando Peça</div>
            <div style={{ ...styles.metricValue, color: '#fbbf24' }}>{stats.aguardandoPeca}</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <CheckCircle size={22} color="#4ade80" />
          <div>
            <div style={styles.metricLabel}>Finalizadas</div>
            <div style={{ ...styles.metricValue, color: '#4ade80' }}>{stats.finalizadas}</div>
          </div>
        </div>
      </div>

      <div style={styles.header}>
        <button onClick={aoClicarEmNova} style={styles.btnPrimary}>
          <Plus size={16} /> Nova Ordem de Serviço
        </button>
        <div style={styles.rightActions}>
          <div style={styles.inputWithIcon}>
            <input
              type="text"
              placeholder="Buscar OS, cliente ou aparelho..."
              style={styles.searchInput}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Search size={14} style={styles.innerIcon} />
          </div>
          <button style={styles.btnOutline} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
            <Filter size={14} /> Filtros {filtrosAbertos ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {filtrosAbertos && (
        <div style={styles.filtersPanel}>
          <label style={styles.filterLabel}>Status</label>
          <select
            style={styles.filterSelect}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_manutencao">Em Manutenção</option>
            <option value="aguardando_peca">Aguardando Peça</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      )}

      {erro && <div style={styles.erro}>{erro}</div>}

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando OS...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}></th>
                <th style={styles.th}>Nº OS</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Aparelho</th>
                <th style={styles.th}>Serviço / Relato</th>
                <th style={styles.th}>Técnico</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    {ordens.length === 0
                      ? 'Nenhuma ordem de serviço cadastrada.'
                      : 'Nenhuma OS corresponde aos filtros.'}
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map((os) => (
                  <tr key={os.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(os.id, e)}>
                          <FilePen size={14} /> <ChevronDown size={12} />
                        </button>

                        {menuAberto === os.id && (
                          <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.dropdownItem} onClick={() => editarOS(os)}>
                              <Edit size={14} color="#38bdf8" /> Editar / Atualizar OS
                            </div>
                            <div
                              style={styles.dropdownItem}
                              onClick={() => {
                                setMenuAberto(null);
                                alert('Impressão da via do cliente em breve.', { type: 'info', title: 'Em breve' });
                              }}
                            >
                              <Printer size={14} color="#94a3b8" /> Imprimir Via do Cliente
                            </div>
                            <div
                              style={styles.dropdownItem}
                              onClick={() => {
                                setMenuAberto(null);
                                alert('Laudo técnico em breve.', { type: 'info', title: 'Em breve' });
                              }}
                            >
                              <FileText size={14} color="#94a3b8" /> Ver Laudo Técnico
                            </div>
                            <div
                              style={{ ...styles.dropdownItem, color: '#4ade80' }}
                              onClick={() => {
                                setMenuAberto(null);
                                alert('Integração WhatsApp em breve.', { type: 'info', title: 'Em breve' });
                              }}
                            >
                              <MessageCircle size={14} color="#4ade80" /> Notificar via WhatsApp
                            </div>

                            {!['finalizada', 'cancelada'].includes(os.status) && (
                              <div
                                style={{
                                  ...styles.dropdownItem,
                                  borderTop: '1px solid #1f2233',
                                  marginTop: '4px',
                                  paddingTop: '8px',
                                }}
                                onClick={() => handleFinalizar(os)}
                              >
                                <DollarSign size={14} color="#fbbf24" /> Finalizar OS
                              </div>
                            )}

                            {os.status !== 'cancelada' && os.status !== 'finalizada' && (
                              <div
                                style={{
                                  ...styles.dropdownItem,
                                  color: '#ef4444',
                                  borderTop: '1px solid #1f2233',
                                  marginTop: '4px',
                                  paddingTop: '8px',
                                }}
                                onClick={() => handleCancelar(os)}
                              >
                                <Ban size={14} color="#ef4444" /> Cancelar OS
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{os.codigo}</td>
                    <td style={{ ...styles.td, color: '#93c5fd' }}>{os.cliente?.nome ?? '—'}</td>
                    <td style={styles.td}>{os.aparelho_modelo}</td>
                    <td style={styles.td}>{resumoServico(os)}</td>
                    <td style={styles.td}>{os.tecnico?.nome ?? '—'}</td>
                    <td style={styles.td}>{renderStatus(os.status)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#e2e8f0' }}>
                      {formatBRL(os.valor_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', padding: '20px', flex: 1, minHeight: '80vh' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
  metricCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' },
  metricLabel: { color: '#94a3b8', fontSize: '12px' },
  metricValue: { color: '#fff', fontSize: '22px', fontWeight: 'bold' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' },
  btnPrimary: { backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  rightActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchInput: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#fff', padding: '10px 35px 10px 15px', borderRadius: '6px', fontSize: '13px', width: '280px' },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  filtersPanel: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', backgroundColor: '#0f111a', borderRadius: '6px', border: '1px solid #1f2233' },
  filterLabel: { color: '#94a3b8', fontSize: '12px' },
  filterSelect: { backgroundColor: '#161925', border: '1px solid #2a2e3f', color: '#fff', padding: '8px 12px', borderRadius: '4px', fontSize: '13px' },
  erro: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' },
  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '180px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: '#94a3b8', fontSize: '12px', padding: '12px', borderBottom: '1px solid #1f2233' },
  td: { color: '#e2e8f0', fontSize: '13px', padding: '15px 12px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c' },
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' },
};

export default OSList;
