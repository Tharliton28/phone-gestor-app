import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Eraser, Download, ChevronDown, 
  Settings, Edit, List, Printer, Ban, 
  Search, CheckCircle, AlertCircle, Info,
  FileText, FileSpreadsheet, TableProperties, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { formatBRL } from '../utils/formatters';
import {
  cancelarVenda,
  concluirPreVenda,
  getVendaById,
  listVendas,
  mapVendaToRecibo,
  resumoProdutoVenda,
  STATUS_LABEL,
} from '../services/vendaService';

function formatDataVenda(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
}

function mapVendaRow(venda) {
  return {
    id: venda.id,
    codigo: venda.codigo,
    cliente: venda.cliente?.nome ?? 'Consumidor Final',
    vendedor: venda.vendedor?.nome ?? '—',
    data: formatDataVenda(venda.data_venda),
    dataIso: venda.data_venda,
    produto: resumoProdutoVenda(venda),
    tipo: venda.tipo_venda ?? '—',
    valor: venda.valor_total,
    status: STATUS_LABEL[venda.status] ?? venda.status,
    statusDb: venda.status,
  };
}

const VendasList = ({ aoClicarEmNovaVenda, aoMudarTela, mensagemFlash = null }) => {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert, confirm } = useDialog();
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [vendas, setVendas] = useState([]);
  
  // MODAL EVOLUÍDO: suporta confirmações (Sim/Não) e ações dinâmicas
  const [modalAviso, setModalAviso] = useState({ 
    aberto: false, 
    titulo: '', 
    mensagem: '', 
    tipo: 'info', 
    isConfirmacao: false, 
    acaoOk: null 
  });

  const [filtros, setFiltros] = useState({
    codigo: '', cliente: '', vendedor: 'Todos', data: '', produto: '', tipoVenda: 'Todos', status: 'Todos'
  });

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    setErro(null);

    const { data, error } = await listVendas(lojaAtivaId);

    if (error) {
      setErro(error.message ?? 'Erro ao carregar vendas.');
      setVendas([]);
    } else {
      setVendas((data ?? []).map(mapVendaRow));
    }

    setLoading(false);
  }, [lojaAtivaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!mensagemFlash) return;
    alert(mensagemFlash, { type: 'success', title: 'Sucesso' });
  }, [mensagemFlash, alert]);

  useEffect(() => {
    const handleClickFora = () => {
      setMenuAberto(null);
      setMenuExportarAberto(false);
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation(); 
    setMenuAberto(menuAberto === index ? null : index);
    setMenuExportarAberto(false);
  };

  const toggleMenuExportar = (e) => {
    e.stopPropagation();
    setMenuExportarAberto(!menuExportarAberto);
    setMenuAberto(null);
  };

  const mostrarAviso = (titulo, mensagem, tipo = 'info', isConfirmacao = false, acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, isConfirmacao, acaoOk });
  };

  const limparFiltros = () => {
    setFiltros({ codigo: '', cliente: '', vendedor: 'Todos', data: '', produto: '', tipoVenda: 'Todos', status: 'Todos' });
  };

  const handleCancelarVenda = async (vendaId) => {
    if (!lojaAtivaId) return;

    const confirmar = await confirm('Tem certeza que deseja estornar e cancelar esta venda?', {
      title: 'Cancelar Venda',
    });
    if (!confirmar) return;

    const { error } = await cancelarVenda(lojaAtivaId, vendaId, perfil?.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível cancelar a venda.', { type: 'error', title: 'Erro' });
      return;
    }

    await alert('Venda cancelada com sucesso.', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const handleConcluirPreVenda = async (vendaId) => {
    if (!lojaAtivaId) return;

    const confirmar = await confirm('Concluir esta pré-venda e baixar o estoque?', {
      title: 'Concluir Pré-Venda',
      confirmLabel: 'Concluir',
      confirmVariant: 'primary',
    });
    if (!confirmar) return;

    const { error } = await concluirPreVenda(lojaAtivaId, vendaId, perfil?.id);
    if (error) {
      await alert(error.message ?? 'Não foi possível concluir a pré-venda.', { type: 'error', title: 'Erro' });
      return;
    }

    await alert('Pré-venda concluída com sucesso.', { type: 'success', title: 'Sucesso' });
    carregar();
  };

  const handleImprimirRecibo = async (item) => {
    setMenuAberto(null);
    if (!lojaAtivaId) return;

    const { data, error } = await getVendaById(lojaAtivaId, item.id);
    if (error || !data) {
      await alert(error?.message ?? 'Não foi possível carregar a venda.', { type: 'error', title: 'Erro' });
      return;
    }

    aoMudarTela('recibo-garantia', 'listagem', mapVendaToRecibo(data));
  };

  const vendedoresUnicos = useMemo(() => {
    const nomes = [...new Set(vendas.map((v) => v.vendedor).filter(Boolean))];
    return ['Todos', ...nomes];
  }, [vendas]);

  const vendasFiltradas = vendas.filter((venda) => {
    const matchCodigo = venda.codigo.includes(filtros.codigo);
    const matchCliente = venda.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
    const matchVendedor = filtros.vendedor === 'Todos' || venda.vendedor === filtros.vendedor;
    const matchData = !filtros.data || venda.dataIso === filtros.data;
    const matchProduto = venda.produto.toLowerCase().includes(filtros.produto.toLowerCase());
    const matchTipo = filtros.tipoVenda === 'Todos' || venda.tipo === filtros.tipoVenda;
    const matchStatus = filtros.status === 'Todos' || venda.status === filtros.status;

    return matchCodigo && matchCliente && matchVendedor && matchData && matchProduto && matchTipo && matchStatus;
  });

  const qtdFiltrosAtivos = Object.values(filtros).filter(val => val !== '' && val !== 'Todos').length;

  const renderStatus = (status) => {
    if (status === 'Concluído') return <span style={styles.badgeSuccess}>{status}</span>;
    if (status === 'Pré-Venda') return <span style={styles.badgeWarning}>{status}</span>;
    if (status === 'Cancelada') return <span style={styles.badgeError}>{status}</span>;
    return <span style={styles.badgeDefault}>{status}</span>;
  };

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnPrimary} onClick={aoClicarEmNovaVenda}>
            <Plus size={16} /> Nova Venda
          </button>
        </div>
        <div style={styles.rightActions}>
          <button 
            style={{...styles.btnClear, opacity: qtdFiltrosAtivos > 0 ? 1 : 0.3, pointerEvents: qtdFiltrosAtivos > 0 ? 'auto' : 'none'}} 
            onClick={limparFiltros}
          >
            <Eraser size={14} /> Limpar filtros
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOutline} onClick={toggleMenuExportar}>
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>
            {menuExportarAberto && (
              <div style={styles.dropdownExport} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('Exportar PDF', 'Relatório em PDF gerado com sucesso.', 'sucesso'); }}>
                  <FileText size={14} color="#ef4444" /> Exportar para PDF
                </div>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('Exportar Excel', 'Planilha Excel baixada.', 'sucesso'); }}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Exportar para Excel
                </div>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('Exportar CSV', 'Arquivo CSV gerado.', 'sucesso'); }}>
                  <TableProperties size={14} color="#38bdf8" /> Exportar para CSV
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {erro && <div style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px' }}>{erro}</div>}

      {/* Tabela Principal */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando vendas...</div>
        ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cód.</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Vendedor</th>
              <th style={styles.th}>Data da venda</th>
              <th style={styles.th}>Produto Principal</th>
              <th style={styles.th}>Tipo de venda</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
              <th style={styles.th}>Status</th>
              <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
            </tr>
            {/* LINHA DE FILTROS NA TABELA */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}>
                <input 
                  style={styles.filterInput} 
                  placeholder="Nº..." 
                  value={filtros.codigo} 
                  onChange={(e) => setFiltros({...filtros, codigo: e.target.value.replace(/[^0-9]/g, '')})} 
                />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input 
                    style={styles.filterInput} 
                    placeholder="Buscar cliente..." 
                    value={filtros.cliente} 
                    onChange={(e) => setFiltros({...filtros, cliente: e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')})} 
                  />
                  <Search size={12} color="#64748b" style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select style={styles.filterSelect} value={filtros.vendedor} onChange={(e) => setFiltros({...filtros, vendedor: e.target.value})}>
                  {vendedoresUnicos.map((nome) => (
                    <option key={nome}>{nome}</option>
                  ))}
                </select>
              </td>
              <td style={styles.tdFilter}><input style={styles.filterInput} type="date" value={filtros.data} onChange={(e) => setFiltros({...filtros, data: e.target.value})} /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input style={styles.filterInput} placeholder="Buscar produto..." value={filtros.produto} onChange={(e) => setFiltros({...filtros, produto: e.target.value})} />
                  <Search size={12} color="#64748b" style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select style={styles.filterSelect} value={filtros.tipoVenda} onChange={(e) => setFiltros({...filtros, tipoVenda: e.target.value})}>
                  <option>Todos</option><option>Cliente Novo</option><option>Cliente Recorrente</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select style={styles.filterSelect} value={filtros.status} onChange={(e) => setFiltros({...filtros, status: e.target.value})}>
                  <option>Todos</option><option>Concluído</option><option>Pré-Venda</option><option>Cancelada</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.length === 0 ? (
              <tr><td colSpan="9" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
                {vendas.length === 0 ? 'Nenhuma venda cadastrada.' : 'Nenhuma venda encontrada com estes filtros.'}
              </td></tr>
            ) : (
              vendasFiltradas.map((item, index) => (
                <tr key={item.id} style={{...styles.tr, opacity: item.status === 'Cancelada' ? 0.6 : 1}}>
                  <td style={{...styles.td, color: '#e2e8f0'}}>{item.codigo}</td>
                  <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}}>{item.cliente}</td>
                  <td style={styles.td}>{item.vendedor}</td>
                  <td style={styles.td}>{item.data}</td>
                  <td style={{...styles.td, color: '#38bdf8'}}>{item.produto}</td>
                  <td style={styles.td}>{item.tipo}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{formatBRL(item.valor)}</td>
                  <td style={styles.td}>{renderStatus(item.status)}</td>
                  
                  {/* MENU DE AÇÕES INTELIGENTE */}
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <div style={{position: 'relative', display: 'inline-block'}}>
                      <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                        <Settings size={14} /> <ChevronDown size={12} />
                      </button>

                      {menuAberto === index && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          
                          <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoMudarTela('venda-detalhes', 'listagem', { vendaId: item.id }); }}>
                            <List size={14} color="#38bdf8" /> Detalhes da Venda
                          </div>
                          
                          {item.status === 'Concluído' && (
                            <div style={styles.dropdownItem} onClick={() => handleImprimirRecibo(item)}>
                              <Printer size={14} color="#4ade80" /> Imprimir Recibo/Garantia
                            </div>
                          )}

                          {item.status === 'Pré-Venda' && (
                            <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleConcluirPreVenda(item.id); }}>
                              <CheckCircle size={14} color="#4ade80" /> Concluir Pré-Venda
                            </div>
                          )}

                          {item.status !== 'Cancelada' && (
                            <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} 
                                 onClick={() => { setMenuAberto(null); handleCancelarVenda(item.id); }}>
                              <Ban size={14} color="#ef4444" /> Cancelar Venda
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Paginação ligada ao array filtrado */}
      <div style={styles.paginationArea}>
        <div style={{color: '#64748b', fontSize: '12px'}}>
          Mostrando {vendasFiltradas.length > 0 ? 1 : 0} a {vendasFiltradas.length} de {vendasFiltradas.length} registros
        </div>
        <div style={styles.paginationControls}>
          <button style={styles.btnPage} disabled><ChevronLeft size={16}/></button>
          <button style={styles.btnPageActive}>1</button>
          <button style={styles.btnPage} disabled><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* MODAL CUSTOMIZADO */}
      {modalAviso.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                {modalAviso.tipo === 'sucesso' && <CheckCircle size={18} color="#4ade80" />}
                {modalAviso.tipo === 'erro' && <AlertCircle size={18} color="#ef4444" />}
                {modalAviso.tipo === 'info' && <Info size={18} color="#3b82f6" />}
                {modalAviso.titulo}
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5'}}>{modalAviso.mensagem}</p>
            </div>
            
            <div style={styles.modalFooter}>
              {modalAviso.isConfirmacao ? (
                <>
                  <button 
                    style={styles.btnCancelModal} 
                    onClick={() => setModalAviso({...modalAviso, aberto: false})}
                  >
                    Não, voltar
                  </button>
                  <button 
                    style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6'}} 
                    onClick={() => {
                      if (modalAviso.acaoOk) modalAviso.acaoOk();
                    }}
                  >
                    Sim, confirmar
                  </button>
                </>
              ) : (
                <button 
                  style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6', width: '100%'}} 
                  onClick={() => {
                    setModalAviso({...modalAviso, aberto: false});
                    if (modalAviso.acaoOk) modalAviso.acaoOk();
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '15px' },
  rightActions: { display: 'flex', gap: '15px' },
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' },
  btnClear: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', transition: '0.2s' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  tableWrapper: { overflowX: 'auto', marginTop: '10px', paddingBottom: '80px', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '11px', fontWeight: '600', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#161925', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px 4px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '6px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' },
  filterSelect: { width: '100%', padding: '6px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },
  badgeWarning: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },
  badgeError: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },
  badgeDefault: { backgroundColor: '#1f2233', color: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },

  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '210px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '35px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1f2233' },
  paginationControls: { display: 'flex', gap: '5px' },
  btnPage: { backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'not-allowed', padding: '4px 8px', display: 'flex', alignItems: 'center' },
  btnPageActive: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnCancelModal: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  btnSaveModal: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }
};

export default VendasList;