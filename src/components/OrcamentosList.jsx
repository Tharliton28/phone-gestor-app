import React, { useState, useEffect } from 'react';
import { 
  Plus, Eraser, Download, Settings, ChevronDown, 
  Edit, FileText, Trash2, Search, FileSpreadsheet, 
  TableProperties, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle
} from 'lucide-react';

const OrcamentosList = ({ aoClicarEmCadastrar, aoMudarTela }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    codigo: '', cliente: '', vendedor: 'Todos', data: '', validade: '', status: 'Todos'
  });

  // Estados para os Modais Customizados
  const [modalExcluirAberto, setModalExcluirAberto] = useState({ aberto: false, id: null });
  const [modalAprovarAberto, setModalAprovarAberto] = useState({ aberto: false, id: null });
  const [modalRejeitarAberto, setModalRejeitarAberto] = useState({ aberto: false, id: null });

  const [orcamentos, setOrcamentos] = useState([
    { cod: '9001', cliente: 'CARLOS EDUARDO', vendedor: 'Wesley de Sousa', data: '08/07/2026', validade: '15/07/2026', valor: '4.500,00', status: 'Pendente' },
    { cod: '9002', cliente: 'MARIA JOAQUINA', vendedor: 'Wesley de Sousa', data: '07/07/2026', validade: '10/07/2026', valor: '350,00', status: 'Aprovado' },
    { cod: '9003', cliente: 'EMPRESA XPTO LTDA', vendedor: 'Wesley de Sousa', data: '05/07/2026', validade: '12/07/2026', valor: '1.850,00', status: 'Rejeitado' },
    { cod: '9004', cliente: 'FERNANDO SILVA', vendedor: 'Wesley de Sousa', data: '01/07/2026', validade: '05/07/2026', valor: '120,00', status: 'Aprovado' },
  ]);

  useEffect(() => {
    const handleClickFora = () => { setMenuAberto(null); setMenuExportarAberto(false); };
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

  // Funções de Ação dos Modais
  const confirmarExclusao = () => {
    setOrcamentos(orcamentos.filter(o => o.cod !== modalExcluirAberto.id));
    setModalExcluirAberto({ aberto: false, id: null });
  };

  const confirmarRejeicao = () => {
    setOrcamentos(orcamentos.map(o => o.cod === modalRejeitarAberto.id ? { ...o, status: 'Rejeitado' } : o));
    setModalRejeitarAberto({ aberto: false, id: null });
  };

  const confirmarAprovacao = () => {
    setOrcamentos(orcamentos.map(o => o.cod === modalAprovarAberto.id ? { ...o, status: 'Aprovado' } : o));
    setModalAprovarAberto({ aberto: false, id: null });
    if (aoMudarTela) {
      aoMudarTela('nova-venda'); // Envia para o PDV
    }
  };

  const limparFiltros = () => {
    setFiltros({ codigo: '', cliente: '', vendedor: 'Todos', data: '', validade: '', status: 'Todos' });
  };

  // Função para abrir o PDF (redireciona para o formulário no modo impressão)
  const handleGerarPdf = (orc) => {
    setMenuAberto(null);
    if(aoMudarTela) {
        // Envia o orçamento selecionado e uma flag para abrir o modal de impressão diretamente
        aoMudarTela('novo-orcamento', 'orcamentos', { orcamentoSelecionado: orc, autoImprimir: true });
    }
  };

  const orcamentosFiltrados = orcamentos.filter(orc => {
    const matchCodigo = orc.cod.includes(filtros.codigo);
    const matchCliente = orc.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
    const matchVendedor = filtros.vendedor === 'Todos' || orc.vendedor === filtros.vendedor;
    const matchData = filtros.data === '' || orc.data === filtros.data.split('-').reverse().join('/');
    const matchValidade = filtros.validade === '' || orc.validade === filtros.validade.split('-').reverse().join('/');
    const matchStatus = filtros.status === 'Todos' || orc.status === filtros.status;

    return matchCodigo && matchCliente && matchVendedor && matchData && matchValidade && matchStatus;
  });

  return (
    <div style={styles.container}>
      
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmCadastrar} style={styles.btnPrimary}>
            <Plus size={14} /> Novo Orçamento de Venda
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnDangerOutline} onClick={limparFiltros}>
            <Eraser size={14} /> Limpar filtros
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOutline} onClick={toggleMenuExportar}>
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>
            {menuExportarAberto && (
              <div style={styles.dropdownExport} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropdownItem}>
                  <FileText size={14} color="#ef4444" /> Exportar para PDF
                </div>
                <div style={styles.dropdownItem}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Exportar para Excel
                </div>
                <div style={styles.dropdownItem}>
                  <TableProperties size={14} color="#38bdf8" /> Exportar para CSV
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '10%'}}>Cód.</th>
              <th style={{...styles.th, width: '25%'}}>Cliente</th>
              <th style={{...styles.th, width: '15%'}}>Vendedor</th>
              <th style={{...styles.th, width: '12%'}}>Data</th>
              <th style={{...styles.th, width: '12%'}}>Validade</th>
              <th style={{...styles.th, width: '14%', textAlign: 'right'}}>Valor Total (R$)</th>
              <th style={{...styles.th, width: '12%'}}>Status</th>
              <th style={{...styles.th, width: '10%', textAlign: 'center'}}>Ações</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}>
                <input 
                  type="text" 
                  style={styles.filterInput} 
                  placeholder="Nº..." 
                  value={filtros.codigo}
                  onChange={(e) => setFiltros({...filtros, codigo: e.target.value.replace(/[^0-9]/g, '')})}
                />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input 
                    type="text" 
                    placeholder="Buscar cliente..." 
                    style={styles.filterInputComIcone} 
                    value={filtros.cliente}
                    onChange={(e) => setFiltros({...filtros, cliente: e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')})}
                  />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select 
                  style={{...styles.filterInput, width: '100%'}}
                  value={filtros.vendedor}
                  onChange={(e) => setFiltros({...filtros, vendedor: e.target.value})}
                >
                  <option>Todos</option>
                  <option>Wesley de Sousa</option>
                </select>
              </td>
              <td style={styles.tdFilter}>
                <input 
                  type="date" 
                  style={{...styles.filterInput, width: '100%', padding: '8px 4px'}} 
                  value={filtros.data}
                  onChange={(e) => setFiltros({...filtros, data: e.target.value})}
                />
              </td>
              <td style={styles.tdFilter}>
                <input 
                  type="date" 
                  style={{...styles.filterInput, width: '100%', padding: '8px 4px'}} 
                  value={filtros.validade}
                  onChange={(e) => setFiltros({...filtros, validade: e.target.value})}
                />
              </td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select 
                  style={{...styles.filterInput, width: '100%'}}
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option>Todos</option>
                  <option>Pendente</option>
                  <option>Aprovado</option>
                  <option>Rejeitado</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {orcamentosFiltrados.map((orc, index) => (
              <tr key={orc.cod} style={styles.tr}>
                <td style={{...styles.td, color: '#e2e8f0'}}>{orc.cod}</td>
                <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}} title={orc.cliente}>{orc.cliente}</td>
                <td style={styles.td} title={orc.vendedor}>{orc.vendedor}</td>
                <td style={styles.td}>{orc.data}</td>
                <td style={styles.td}>{orc.validade}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{orc.valor}</td>
                <td style={styles.td}>
                  {orc.status === 'Aprovado' && <span style={styles.badgeVerde}>{orc.status}</span>}
                  {orc.status === 'Pendente' && <span style={styles.badgeAmarelo}><Clock size={10} style={{marginRight: '4px'}}/> {orc.status}</span>}
                  {orc.status === 'Rejeitado' && <span style={styles.badgeVermelho}>{orc.status}</span>}
                </td>
                
                <td style={{...styles.td, textAlign: 'center', overflow: 'visible'}}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.btnGerenciar} onClick={(e) => toggleMenu(index, e)}>
                      <Settings size={12} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) { aoMudarTela('novo-orcamento', 'orcamentos', { orcamentoSelecionado: orc }); } else { aoClicarEmCadastrar(); } }}>
                          <Edit size={14} color="#94a3b8" /> Editar Orçamento
                        </div>
                        
                        <div style={styles.dropdownItem} onClick={() => handleGerarPdf(orc)}>
                          <FileText size={14} color="#38bdf8" /> Gerar PDF / Imprimir
                        </div>
                        
                        {/* Renderização Condicional baseada no status DESTE orçamento específico */}
                        {orc.status === 'Pendente' && (
                          <>
                            <div style={{...styles.dropdownItem, color: '#4ade80', borderTop: '1px solid #1f2233', paddingTop: '8px', marginTop: '4px'}} onClick={() => { setMenuAberto(null); setModalAprovarAberto({ aberto: true, id: orc.cod }); }}>
                              <CheckCircle size={14} color="#4ade80" /> Aprovar (Gerar Venda)
                            </div>
                            <div style={{...styles.dropdownItem, color: '#ef4444'}} onClick={() => { setMenuAberto(null); setModalRejeitarAberto({ aberto: true, id: orc.cod }); }}>
                              <XCircle size={14} color="#ef4444" /> Rejeitar Orçamento
                            </div>
                          </>
                        )}

                        <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', paddingTop: '8px', marginTop: '4px'}} onClick={() => { setMenuAberto(null); setModalExcluirAberto({ aberto: true, id: orc.cod }); }}>
                          <Trash2 size={14} color="#ef4444" /> Excluir Registro
                        </div>
                        
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orcamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan="8" style={{textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px'}}>
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {orcamentosFiltrados.length > 0 && (
        <div style={styles.paginationArea}>
          <span style={styles.paginationText}>Mostrando 1 a {orcamentosFiltrados.length} de {orcamentosFiltrados.length} registros</span>
          
          <div style={styles.paginationButtons}>
            <button style={styles.pageBtnNav} disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => prev - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button style={paginaAtual === 1 ? styles.pageBtnActive : styles.pageBtn} onClick={() => setPaginaAtual(1)}>1</button>
            <button style={styles.pageBtnNav} disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAIS ================= */}

      {/* MODAL: APROVAR ORÇAMENTO E GERAR VENDA */}
      {modalAprovarAberto.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <CheckCircle size={18} color="#4ade80" /> Aprovar Orçamento #{modalAprovarAberto.id}
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
                Os itens deste orçamento serão transferidos para o PDV para finalização da venda. Deseja prosseguir?
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalAprovarAberto({aberto: false, id: null})}>Cancelar</button>
              <button style={{...styles.btnSaveModal, backgroundColor: '#22c55e', color: '#0f111a'}} onClick={confirmarAprovacao}>Sim, Gerar Venda</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJEITAR ORÇAMENTO */}
      {modalRejeitarAberto.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <XCircle size={18} color="#ef4444" /> Rejeitar Orçamento #{modalRejeitarAberto.id}
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
                O cliente recusou este orçamento? O status será alterado para Rejeitado.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalRejeitarAberto({aberto: false, id: null})}>Cancelar</button>
              <button style={{...styles.btnSaveModal, backgroundColor: '#ef4444'}} onClick={confirmarRejeicao}>Sim, Rejeitar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {modalExcluirAberto.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <AlertCircle size={18} color="#ef4444" /> Excluir Orçamento
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
                Tem certeza que deseja excluir permanentemente o orçamento <strong>#{modalExcluirAberto.id}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setModalExcluirAberto({aberto: false, id: null})}>Cancelar</button>
              <button style={{...styles.btnSaveModal, backgroundColor: '#ef4444'}} onClick={confirmarExclusao}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh', position: 'relative' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex', gap: '10px' },
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnDangerOutline: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  tableWrapper: { overflowX: 'auto', marginTop: '10px', paddingBottom: '200px' },
  table: { width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box', width: '100%' },
  filterInputComIcone: { padding: '8px 28px 8px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box', width: '100%' },
  
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  badgeVerde: { backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgeAmarelo: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' },
  badgeVermelho: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  
  btnGerenciar: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '40px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 0 0', marginTop: '10px', borderTop: '1px solid #1f2233' },
  paginationText: { color: '#64748b', fontSize: '13px' },
  paginationButtons: { display: 'flex', alignItems: 'center', gap: '5px' },
  pageBtn: { backgroundColor: '#11131c', border: '1px solid #1f2233', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' },
  pageBtnActive: { backgroundColor: '#3b82f6', border: '1px solid #3b82f6', color: '#fff', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', fontSize: '13px', fontWeight: 'bold' },
  pageBtnNav: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.2s' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnSaveModal: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
};

export default OrcamentosList;