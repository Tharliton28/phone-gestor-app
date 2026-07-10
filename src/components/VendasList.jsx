import React, { useState, useEffect } from 'react';
import { 
  Plus, Eraser, Download, Settings, 
  ChevronDown, Edit, FileText, MessageCircle, RefreshCw, 
  XCircle, Paperclip, Search, FileSpreadsheet, TableProperties,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const VendasList = ({ aoClicarEmNovaVenda, aoMudarTela }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Transformado em Estado para permitir cancelamento na hora
  const [vendas, setVendas] = useState([
    { cod: '4146187', cliente: 'THAIS LOPES', vendedor: 'Wesley de Sousa', data: '01/12/2026', produto: 'iPhone 13 Pro Max', tipo: 'Cliente Recorrente', valor: '6.500,00', status: 'Concluído' },
    { cod: '6344393', cliente: 'NATAN COVIDEIRA', vendedor: 'Wesley de Sousa', data: '02/07/2026', produto: 'Capa MagSafe + Película', tipo: 'Cliente Recorrente', valor: '200,00', status: 'Concluído' },
    { cod: '6344336', cliente: 'ANTONIA DEBORA FELIPE', vendedor: 'Wesley de Sousa', data: '02/07/2026', produto: 'Xiaomi Redmi Note 13', tipo: 'Cliente Novo', valor: '2.300,00', status: 'Concluído' },
    { cod: '6334201', cliente: 'OTONIEL BARBOSA', vendedor: 'Wesley de Sousa', data: '02/07/2026', produto: 'iPhone 11 64GB', tipo: 'Cliente Novo', valor: '2.100,00', status: 'Pré-Venda' },
    { cod: '6328609', cliente: 'ANA CAROLINE FURTADO', vendedor: 'Wesley de Sousa', data: '01/07/2026', produto: 'Samsung Galaxy S23', tipo: 'Cliente Novo', valor: '2.700,00', status: 'Cancelada' },
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

  const cancelarVenda = (cod) => {
    if(window.confirm(`Tem certeza que deseja CANCELAR a venda #${cod}? Esta ação não pode ser desfeita e estornará o estoque.`)) {
      setVendas(vendas.map(v => v.cod === cod ? { ...v, status: 'Cancelada' } : v));
    }
    setMenuAberto(null);
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmNovaVenda} style={styles.btnPrimary}>
            <Plus size={14} /> Nova Venda
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnDangerOutline}>
            <Eraser size={14} /> Limpar filtros
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOutline} onClick={toggleMenuExportar}>
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>
            {menuExportarAberto && (
              <div style={styles.dropdownExport} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando PDF...')}>
                  <FileText size={14} color="#ef4444" /> Exportar para PDF
                </div>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando Excel...')}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Exportar para Excel
                </div>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando CSV...')}>
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
              <th style={{...styles.th, width: '80px'}}>Cód.</th>
              <th style={{...styles.th, minWidth: '180px'}}>Cliente</th>
              <th style={{...styles.th, minWidth: '140px'}}>Vendedor</th>
              <th style={{...styles.th, width: '120px'}}>Data da venda</th>
              <th style={{...styles.th, minWidth: '160px'}}>Produto Principal</th>
              <th style={{...styles.th, width: '120px'}}>Tipo de venda</th>
              <th style={{...styles.th, width: '100px', textAlign: 'right'}}>Valor (R$)</th>
              <th style={{...styles.th, width: '110px'}}>Status</th>
              <th style={{...styles.th, width: '100px', textAlign: 'center'}}>Ações</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Nº..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar cliente..." style={styles.filterInputComIcone} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select style={{...styles.filterInput, width: '100%'}}>
                  <option>Todos</option>
                  <option>Wesley de Sousa</option>
                </select>
              </td>
              <td style={styles.tdFilter}>
                <input type="date" style={{...styles.filterInput, width: '100%', padding: '8px 4px'}} />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar produto..." style={styles.filterInputComIcone} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select style={{...styles.filterInput, width: '100%'}}>
                  <option>Todos</option>
                  <option>Recorrente</option>
                  <option>Novo</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select style={{...styles.filterInput, width: '100%'}}>
                  <option>Todos</option>
                  <option>Concluído</option>
                  <option>Pré-Venda</option>
                  <option>Cancelada</option>
                </select>
              </td>
              <td style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {vendas.map((venda, index) => (
              <tr key={venda.cod} style={styles.tr}>
                <td style={{...styles.td, color: '#e2e8f0'}}>{venda.cod}</td>
                <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}} title={venda.cliente}>{venda.cliente}</td>
                <td style={styles.td}>{venda.vendedor}</td>
                <td style={styles.td}>{venda.data}</td>
                <td style={{...styles.td, color: '#93c5fd'}} title={venda.produto}>{venda.produto}</td>
                <td style={styles.td}>{venda.tipo}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{venda.valor}</td>
                <td style={styles.td}>
                  {venda.status === 'Concluído' && <span style={styles.badgeConcluido}>{venda.status}</span>}
                  {venda.status === 'Pré-Venda' && <span style={styles.badgePreVenda}>{venda.status}</span>}
                  {venda.status === 'Cancelada' && <span style={styles.badgeCancelada}>{venda.status}</span>}
                </td>
                
                <td style={{...styles.td, textAlign: 'center', overflow: 'visible'}}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.btnGerenciar} onClick={(e) => toggleMenu(index, e)}>
                      <Settings size={12} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        
                        {venda.status !== 'Cancelada' && (
                          <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) aoMudarTela('nova-venda'); }}>
                            <Edit size={14} color="#94a3b8" /> Editar Venda
                          </div>
                        )}
                        
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) aoMudarTela('venda-detalhes'); }}>
                          <FileText size={14} color="#e2e8f0" /> Detalhes
                        </div>

                        {/* LÓGICA CONDICIONAL: Só mostra Recibo e Troca se for Concluído */}
                        {venda.status === 'Concluído' && (
                          <>
                            <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) aoMudarTela('recibo-garantia'); }}>
                              <FileText size={14} color="#38bdf8" /> Recibo e Garantia
                            </div>
                            <div style={styles.dropdownItem} onClick={() => alert('Iniciando processo de troca...')}>
                              <RefreshCw size={14} color="#94a3b8" /> Devolução/Troca
                            </div>
                          </>
                        )}
                        
                        {venda.status !== 'Cancelada' && (
                          <>
                            <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => alert('Abrindo WhatsApp Web...')}>
                              <MessageCircle size={14} color="#4ade80" /> WhatsApp
                            </div>
                            <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', paddingTop: '8px', marginTop: '4px'}} onClick={() => cancelarVenda(venda.cod)}>
                              <XCircle size={14} color="#ef4444" /> Cancelar a venda
                            </div>
                          </>
                        )}

                        <div style={styles.dropdownItem} onClick={() => alert('Abrindo gerenciador de anexos...')}>
                          <Paperclip size={14} color="#94a3b8" /> Anexos
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINAÇÃO ADICIONADA */}
      {vendas.length > 0 && (
        <div style={styles.paginationArea}>
          <span style={styles.paginationText}>Mostrando 1 a {vendas.length} de {vendas.length} registros</span>
          
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

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex', gap: '10px' },
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnDangerOutline: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  // PADDING BOTTOM ADICIONADO AQUI PARA MATAR A SCROLLBAR
  tableWrapper: { overflowX: 'auto', marginTop: '10px', paddingBottom: '160px' },
  
  table: { width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box', width: '100%' },
  filterInputComIcone: { padding: '8px 28px 8px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box', width: '100%' },
  
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  badgeConcluido: { backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgePreVenda: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  badgeCancelada: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  
  btnGerenciar: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '40px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  // ESTILOS DA PAGINAÇÃO
  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 0 0', marginTop: '10px', borderTop: '1px solid #1f2233' },
  paginationText: { color: '#64748b', fontSize: '13px' },
  paginationButtons: { display: 'flex', alignItems: 'center', gap: '5px' },
  pageBtn: { backgroundColor: '#11131c', border: '1px solid #1f2233', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' },
  pageBtnActive: { backgroundColor: '#3b82f6', border: '1px solid #3b82f6', color: '#fff', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', fontSize: '13px', fontWeight: 'bold' },
  pageBtnNav: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.2s' }
};

export default VendasList;