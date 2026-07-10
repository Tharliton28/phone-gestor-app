import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Eraser, Search, Settings, ChevronDown, 
  Edit, MessageCircle, ShoppingBag, Trash2, 
  ChevronLeft, ChevronRight, Users, UserCheck, RefreshCw, AlertCircle,
  Download, FileText, FileSpreadsheet, TableProperties
} from 'lucide-react';

const ClientesList = ({ aoClicarEmCadastrar, aoMudarTela }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalExcluirAberto, setModalExcluirAberto] = useState({ aberto: false, id: null });

  const [clientes, setClientes] = useState([
    { cod: '8217798', nome: 'EVERTON SOUSA DE LIMA', cpf: '000.000.000-00', telefone: '(85) 98857-8165', email: 'everton@email.com', ultimoProduto: 'iPhone 14 Plus', dataCompra: '01/07/2026' },
    { cod: '8216461', nome: 'MANOEL MESSIAS DOS SANTOS', cpf: '062.493.715-16', telefone: '(85) 92158-1071', email: 'manoel@email.com', ultimoProduto: 'iPhone 13', dataCompra: '03/07/2026' },
    { cod: '8215122', nome: 'THAIS LOPES', cpf: '111.222.333-44', telefone: '(85) 99430-0841', email: 'thais@email.com', ultimoProduto: 'iPhone 13 Pro Max', dataCompra: '01/12/2026' },
    { cod: '8214300', nome: 'NATAN COVIDEIRA', cpf: '555.444.333-22', telefone: '(85) 99999-8888', email: 'natan@email.com', ultimoProduto: 'Capa MagSafe', dataCompra: '02/07/2026' },
    { cod: '8213888', nome: 'ANTONIA DEBORA FELIPE', cpf: '777.888.999-00', telefone: '(85) 97777-6666', email: 'antonia@email.com', ultimoProduto: 'Xiaomi Redmi Note 13', dataCompra: '02/07/2026' },
  ]);

  // Fecha menus ao clicar fora
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

  const confirmarExclusao = () => {
    setClientes(clientes.filter(c => c.cod !== modalExcluirAberto.id));
    setModalExcluirAberto({ aberto: false, id: null });
  };

  return (
    <div style={styles.container}>
      
      {/* CARDS DE INDICADORES */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}><Users size={24} color="#4ade80" /></div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total de pessoas</span>
            <span style={styles.statValue}>468</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}><UserCheck size={24} color="#38bdf8" /></div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total de clientes</span>
            <span style={styles.statValue}>416</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper}><RefreshCw size={24} color="#a855f7" /></div>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Índice de recompra (%)</span>
            <span style={styles.statValue}>18.02%</span>
          </div>
        </div>
      </div>

      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmCadastrar} style={styles.btnPrimary}>
            <UserPlus size={14} /> Cadastrar
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnDangerOutline}>
            <Eraser size={14} /> Limpar filtros
          </button>

          {/* NOVO: BOTÃO DE EXPORTAR */}
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
              <th style={{...styles.th, minWidth: '180px'}}>Nome do Cliente</th>
              <th style={{...styles.th, width: '130px'}}>CPF/CNPJ</th>
              <th style={{...styles.th, width: '140px'}}>Telefone</th>
              <th style={{...styles.th, minWidth: '160px'}}>Último Produto Comprado</th>
              <th style={{...styles.th, width: '130px'}}>Data Última Compra</th>
              <th style={{...styles.th, width: '100px', textAlign: 'center'}}>Ações</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Nº..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar por nome..." style={styles.filterInputComIcone} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <input type="text" placeholder="000.000.000-00" style={styles.filterInput} />
              </td>
              <td style={styles.tdFilter}>
                <input type="text" placeholder="(00) 00000-0000" style={styles.filterInput} />
              </td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar produto..." style={styles.filterInputComIcone} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <input type="date" style={{...styles.filterInput, padding: '8px 4px'}} />
              </td>
              <td style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente, index) => (
              <tr key={index} style={styles.tr}>
                <td style={{...styles.td, color: '#e2e8f0'}}>{cliente.cod}</td>
                <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}}>{cliente.nome}</td>
                <td style={styles.td}>{cliente.cpf}</td>
                <td style={styles.td}>{cliente.telefone}</td>
                <td style={{...styles.td, color: '#93c5fd'}}>{cliente.ultimoProduto}</td>
                <td style={styles.td}>{cliente.dataCompra}</td>
                
                <td style={{...styles.td, textAlign: 'center', overflow: 'visible'}}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.btnGerenciar} onClick={(e) => toggleMenu(index, e)}>
                      <Settings size={12} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) { aoMudarTela('novo-cliente'); } else { aoClicarEmCadastrar(); } }}>
                          <Edit size={14} color="#94a3b8" /> Editar Cadastro
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); if(aoMudarTela) aoMudarTela('historico'); }}>
                          <ShoppingBag size={14} color="#38bdf8" /> Histórico de Compras
                        </div>
                        <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => alert('Abrindo WhatsApp Web...')}>
                          <MessageCircle size={14} color="#4ade80" /> Chamar no WhatsApp
                        </div>
                        <div style={{...styles.dropdownItem, borderTop: '1px solid #1f2233', paddingTop: '8px', marginTop: '4px', color: '#ef4444'}} onClick={() => { setMenuAberto(null); setModalExcluirAberto({ aberto: true, id: cliente.cod }); }}>
                          <Trash2 size={14} color="#ef4444" /> Excluir Registro
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px'}}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.paginationArea}>
        <span style={styles.paginationText}>Mostrando 1 a {clientes.length} de {clientes.length} registros</span>
        
        <div style={styles.paginationButtons}>
          <button style={styles.pageBtnNav} disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => prev - 1)}>
            <ChevronLeft size={16} />
          </button>
          
          <button style={paginaAtual === 1 ? styles.pageBtnActive : styles.pageBtn} onClick={() => setPaginaAtual(1)}>1</button>
          <button style={paginaAtual === 2 ? styles.pageBtnActive : styles.pageBtn} onClick={() => setPaginaAtual(2)}>2</button>
          <button style={paginaAtual === 3 ? styles.pageBtnActive : styles.pageBtn} onClick={() => setPaginaAtual(3)}>3</button>
          <span style={{color: '#64748b', padding: '0 5px'}}>...</span>
          <button style={styles.pageBtn} onClick={() => setPaginaAtual(47)}>47</button>
          
          <button style={styles.pageBtnNav} onClick={() => setPaginaAtual(prev => prev + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {modalExcluirAberto.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <AlertCircle size={18} color="#ef4444" /> Excluir Cliente
              </h3>
            </div>
            <div style={{padding: '20px 0'}}>
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0}}>
                Tem certeza que deseja excluir permanentemente este cliente do sistema? Esta ação não pode ser desfeita.
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
  container: { backgroundColor: '#0f111a', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '85vh', position: 'relative' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
  statCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
  statIconWrapper: { backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' },
  statInfo: { display: 'flex', flexDirection: 'column' },
  statLabel: { color: '#94a3b8', fontSize: '13px', fontWeight: '500' },
  statValue: { color: '#fff', fontSize: '24px', fontWeight: 'bold' },

  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px 8px 0 0', borderBottom: 'none' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex', gap: '10px' },
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnDangerOutline: { backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  // AQUI FOI CORRIGIDO O BUG DA SCROLLBAR COM O PADDING BOTTOM
  tableWrapper: { overflowX: 'auto', backgroundColor: '#11131c', border: '1px solid #1f2233', borderTop: '1px solid #2a2e3f', borderRadius: '0 0 8px 8px', paddingBottom: '150px' },
  
  table: { width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tr: { transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
  filterInputComIcone: { width: '100%', padding: '8px 28px 8px 8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
  
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  btnGerenciar: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '40px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', marginTop: '10px' },
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

export default ClientesList; 