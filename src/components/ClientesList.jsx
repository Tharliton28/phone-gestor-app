import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, RefreshCw, Plus, Eraser, Download, ChevronDown, 
  Search, Settings, Edit, ShoppingBag, MessageCircle, Trash2,
  FileText, FileSpreadsheet, TableProperties, ChevronLeft, ChevronRight,
  X, AlertCircle, CheckCircle, Info
} from 'lucide-react';

const ClientesList = ({ aoClicarEmCadastrar, aoMudarTela }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  
  // Modais
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });
  const [modalHistorico, setModalHistorico] = useState({ aberto: false, cliente: null });

  const [filtros, setFiltros] = useState({
    codigo: '', nome: '', cpf: '', telefone: '', produto: '', data: ''
  });

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

  const mostrarAviso = (titulo, mensagem, tipo = 'info', acaoOk = null) => {
    setModalAviso({ aberto: true, titulo, mensagem, tipo, acaoOk });
  };

  const limparFiltros = () => {
    setFiltros({ codigo: '', nome: '', cpf: '', telefone: '', produto: '', data: '' });
  };

  const abrirHistoricoCliente = (cliente) => {
    setMenuAberto(null);
    setModalHistorico({ aberto: true, cliente });
  };

  const mockClientes = [
    { id: '8217798', nome: 'EVERTON SOUSA DE LIMA', cpf: '000.000.000-00', telefone: '(85) 98857-8165', ultimoProduto: 'iPhone 14 Plus', dataCompra: '01/07/2026' },
    { id: '8216461', nome: 'MANOEL MESSIAS DOS SANTOS', cpf: '062.493.715-16', telefone: '(85) 92158-1071', ultimoProduto: 'iPhone 13', dataCompra: '01/07/2026' },
    { id: '8215122', nome: 'THAIS LOPES', cpf: '111.222.333-44', telefone: '(85) 99430-0841', ultimoProduto: 'iPhone 13 Pro Max', dataCompra: '01/07/2026' },
    { id: '8214300', nome: 'NATAN COVIDEIRA', cpf: '555.444.333-22', telefone: '(85) 99999-8888', ultimoProduto: 'Capa MagSafe', dataCompra: '30/06/2026' },
    { id: '8213888', nome: 'ANTONIA DEBORA FELIPE', cpf: '777.888.999-00', telefone: '(85) 97777-6666', ultimoProduto: 'Xiaomi Redmi Note 13', dataCompra: '02/07/2026' },
  ];

  // Filtros dinâmicos
  const clientesFiltrados = mockClientes.filter(cliente => {
    const matchCodigo = cliente.id.includes(filtros.codigo);
    const matchNome = cliente.nome.toLowerCase().includes(filtros.nome.toLowerCase());
    const matchCpf = cliente.cpf.includes(filtros.cpf);
    const matchTelefone = cliente.telefone.includes(filtros.telefone);
    const matchProduto = cliente.ultimoProduto.toLowerCase().includes(filtros.produto.toLowerCase());
    const matchData = filtros.data === '' || cliente.dataCompra === filtros.data.split('-').reverse().join('/'); 

    return matchCodigo && matchNome && matchCpf && matchTelefone && matchProduto && matchData;
  });

  const qtdFiltrosAtivos = Object.values(filtros).filter(val => val !== '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: '80vh' }}>
      
      {/* CARDS DE MÉTRICAS */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><Users size={20} color="#38bdf8" /></div>
          <div>
            <div style={styles.metricLabel}>Total de pessoas</div>
            <div style={styles.metricValue}>468</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><UserCheck size={20} color="#38bdf8" /></div>
          <div>
            <div style={styles.metricLabel}>Total de clientes</div>
            <div style={styles.metricValue}>416</div>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIconBox}><RefreshCw size={20} color="#c084fc" /></div>
          <div>
            <div style={styles.metricLabel}>Índice de recompra (%)</div>
            <div style={styles.metricValue}>18.02%</div>
          </div>
        </div>
      </div>

      {/* CONTAINER DA LISTAGEM */}
      <div style={styles.container}>
        <div style={styles.actionHeader}>
          <div style={styles.leftActions}>
            <button style={styles.btnPrimary} onClick={aoClicarEmCadastrar}>
              <Plus size={16} /> Cadastrar
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
                  <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('PDF', 'Relatório de clientes gerado.', 'sucesso'); }}><FileText size={14} color="#ef4444" /> Exportar PDF</div>
                  <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('Excel', 'Planilha de clientes gerada.', 'sucesso'); }}><FileSpreadsheet size={14} color="#22c55e" /> Exportar Excel</div>
                  <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('CSV', 'Arquivo CSV gerado.', 'sucesso'); }}><TableProperties size={14} color="#38bdf8" /> Exportar CSV</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cód.</th>
                <th style={styles.th}>Nome do Cliente</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>Último Produto Comprado</th>
                <th style={styles.th}>Data Última Compra</th>
                <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
              </tr>
              {/* LINHA DE FILTROS NA TABELA */}
              <tr style={styles.filterRow}>
                <td style={styles.tdFilter}>
                  {/* BLOQUEIO VIA REGEX: Apenas números no Código */}
                  <input 
                    style={styles.filterInput} 
                    placeholder="Nº..." 
                    value={filtros.codigo} 
                    onChange={(e) => setFiltros({...filtros, codigo: e.target.value.replace(/[^0-9]/g, '')})} 
                  />
                </td>
                <td style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input style={styles.filterInput} placeholder="Buscar por nome..." value={filtros.nome} onChange={(e) => setFiltros({...filtros, nome: e.target.value})} />
                    <Search size={12} color="#64748b" style={styles.innerIcon} />
                  </div>
                </td>
                <td style={styles.tdFilter}>
                  {/* BLOQUEIO VIA REGEX: Apenas números, ponto, hífen e barra */}
                  <input 
                    style={styles.filterInput} 
                    placeholder="000.000.000-00" 
                    value={filtros.cpf} 
                    onChange={(e) => setFiltros({...filtros, cpf: e.target.value.replace(/[^0-9.\-/]/g, '')})} 
                  />
                </td>
                <td style={styles.tdFilter}>
                  {/* BLOQUEIO VIA REGEX: Apenas números, parênteses, espaço e hífen */}
                  <input 
                    style={styles.filterInput} 
                    placeholder="(00) 00000-0000" 
                    value={filtros.telefone} 
                    onChange={(e) => setFiltros({...filtros, telefone: e.target.value.replace(/[^0-9()\-\s]/g, '')})} 
                  />
                </td>
                <td style={styles.tdFilter}>
                  <div style={styles.inputWithIcon}>
                    <input style={styles.filterInput} placeholder="Buscar produto..." value={filtros.produto} onChange={(e) => setFiltros({...filtros, produto: e.target.value})} />
                    <Search size={12} color="#64748b" style={styles.innerIcon} />
                  </div>
                </td>
                <td style={styles.tdFilter}><input style={styles.filterInput} type="date" value={filtros.data} onChange={(e) => setFiltros({...filtros, data: e.target.value})} /></td>
                <td style={styles.tdFilter}></td>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Nenhum cliente encontrado.</td></tr>
              ) : (
                clientesFiltrados.map((item, index) => (
                  <tr key={index} style={styles.tr}>
                    <td style={{...styles.td, color: '#e2e8f0'}}>{item.id}</td>
                    <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}}>{item.nome}</td>
                    <td style={styles.td}>{item.cpf}</td>
                    <td style={styles.td}>{item.telefone}</td>
                    <td style={{...styles.td, color: '#38bdf8'}}>{item.ultimoProduto}</td>
                    <td style={styles.td}>{item.dataCompra}</td>
                    
                    {/* MENU DE AÇÕES INTELIGENTE */}
                    <td style={{...styles.td, textAlign: 'center'}}>
                      <div style={{position: 'relative', display: 'inline-block'}}>
                        <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                          <Settings size={14} /> <ChevronDown size={12} />
                        </button>

                        {menuAberto === index && (
                          <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoClicarEmCadastrar(); }}>
                              <Edit size={14} color="#e2e8f0" /> Editar Cadastro
                            </div>
                            
                            {/* ABRE O MODAL DEDICADO DO CLIENTE */}
                            <div style={styles.dropdownItem} onClick={() => abrirHistoricoCliente(item)}>
                              <ShoppingBag size={14} color="#38bdf8" /> Histórico de Compras
                            </div>
                            
                            <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => { setMenuAberto(null); mostrarAviso('WhatsApp', `Redirecionando para falar com ${item.nome}...`, 'sucesso'); }}>
                              <MessageCircle size={14} color="#4ade80" /> Chamar no WhatsApp
                            </div>

                            <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} 
                                 onClick={() => { setMenuAberto(null); mostrarAviso('Atenção', 'Você não pode excluir um cliente que já possui vendas atreladas a ele.', 'erro'); }}>
                              <Trash2 size={14} color="#ef4444" /> Excluir Registro
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTAGEM DE REGISTROS */}
        <div style={styles.paginationArea}>
          <div style={{color: '#64748b', fontSize: '12px'}}>
            Mostrando {clientesFiltrados.length > 0 ? 1 : 0} a {clientesFiltrados.length} de {clientesFiltrados.length} registros
          </div>
          <div style={styles.paginationControls}>
            <button style={styles.btnPage} disabled><ChevronLeft size={16}/></button>
            <button style={styles.btnPageActive}>1</button>
            <button style={styles.btnPage} disabled><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* MODAL: HISTÓRICO DE COMPRAS DO CLIENTE */}
      {modalHistorico.aberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentLarge}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{margin: '0 0 5px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <ShoppingBag size={20} color="#38bdf8" />
                  Histórico de Compras
                </h3>
                <span style={{color: '#94a3b8', fontSize: '13px'}}>Cliente: <strong style={{color: '#e2e8f0'}}>{modalHistorico.cliente?.nome}</strong></span>
              </div>
              <button style={styles.btnClose} onClick={() => setModalHistorico({ aberto: false, cliente: null })}><X size={20}/></button>
            </div>
            
            <div style={{padding: '20px 0', overflowY: 'auto', maxHeight: '400px'}}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Cód. Venda</th>
                    <th style={styles.th}>Produto(s)</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Valor Total</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tr}>
                    <td style={styles.td}>{modalHistorico.cliente?.dataCompra}</td>
                    <td style={{...styles.td, color: '#e2e8f0'}}>#6349496</td>
                    <td style={{...styles.td, color: '#38bdf8'}}>{modalHistorico.cliente?.ultimoProduto}</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>R$ 2.800,00</td>
                    <td style={styles.td}><span style={styles.badgeSuccess}>Concluído</span></td>
                  </tr>
                  {/* Mock extra apenas para visualização de que o modal funciona como uma lista */}
                  <tr style={styles.tr}>
                    <td style={styles.td}>15/01/2026</td>
                    <td style={{...styles.td, color: '#e2e8f0'}}>#5001223</td>
                    <td style={{...styles.td, color: '#38bdf8'}}>Película de Vidro 3D</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>R$ 50,00</td>
                    <td style={styles.td}><span style={styles.badgeSuccess}>Concluído</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setModalHistorico({ aberto: false, cliente: null })}>Fechar Histórico</button>
              <button style={styles.btnPrimary} onClick={() => { setModalHistorico({ aberto: false, cliente: null }); aoMudarTela('nova-venda'); }}>Nova Venda para este Cliente</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO CUSTOMIZADO */}
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
              <button 
                style={{...styles.btnSaveModal, backgroundColor: modalAviso.tipo === 'erro' ? '#ef4444' : '#3b82f6', width: '100%'}} 
                onClick={() => {
                  setModalAviso({...modalAviso, aberto: false});
                  if (modalAviso.acaoOk) modalAviso.acaoOk();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  metricCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
  metricIconBox: { backgroundColor: '#161925', padding: '12px', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  metricLabel: { color: '#94a3b8', fontSize: '13px', marginBottom: '4px' },
  metricValue: { color: '#fff', fontSize: '24px', fontWeight: 'bold' },

  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' },
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
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '8px', color: '#64748b' },
  
  badgeSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },

  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '210px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '35px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1f2233' },
  paginationControls: { display: 'flex', gap: '5px' },
  btnPage: { backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'not-allowed', padding: '4px 8px', display: 'flex', alignItems: 'center' },
  btnPageActive: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', display: 'flex', flexDirection: 'column' },
  modalContentLarge: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '700px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnSaveModal: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }
};

export default ClientesList;