import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle, XCircle, 
  Search, Filter, ChevronDown, 
  MessageCircle, Ban, Settings, Lock, AlertCircle, Info, FileSpreadsheet, TableProperties
} from 'lucide-react';

const RecibosNotas = ({ aoMudarTela }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  
  // Modal de Aviso Customizado
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', tipo: 'info', acaoOk: null });

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

  const mockNotas = [
    { id: 'REC-00896', refVenda: '#6349496', cliente: 'EVERTON SOUSA DE LIMA', data: '03/07/2026', tipo: 'Recibo de Venda', valor: '2.800,00', status: 'Emitido' },
    { id: 'GAR-00895', refVenda: '#6347117', cliente: 'MANOEL MESSIAS DOS SANTOS', data: '03/07/2026', tipo: 'Termo de Garantia', valor: '2.300,00', status: 'Emitido' },
    { id: 'REC-00894', refVenda: '#6344393', cliente: 'NATAN COVIDEIRA', data: '02/07/2026', tipo: 'Recibo de Venda', valor: '2.550,00', status: 'Emitido' },
    { id: 'REC-00893', refVenda: '#6344336', cliente: 'ANTONIA DEBORA FELIPE CONRRADO', data: '02/07/2026', tipo: 'Recibo de Venda', valor: '2.300,00', status: 'Cancelado' },
  ];

  const renderStatus = (status) => {
    if (status === 'Emitido') {
      return <span style={styles.badgeSuccess}><CheckCircle size={12} /> {status}</span>;
    }
    return <span style={styles.badgeError}><XCircle size={12} /> {status}</span>;
  };

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnOutline}>
            <Filter size={14} /> Filtros Avançados
          </button>
        </div>
        <div style={styles.rightActions}>
          
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOutline} onClick={toggleMenuExportar}>
              <Download size={14} /> Exportar Listagem <ChevronDown size={14} />
            </button>
            {menuExportarAberto && (
              <div style={styles.dropdownExport} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('PDF Gerado', 'O PDF da listagem foi gerado com sucesso.', 'sucesso'); }}>
                  <FileText size={14} color="#ef4444" /> Exportar para PDF
                </div>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('Excel Gerado', 'A planilha Excel foi baixada com sucesso.', 'sucesso'); }}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Exportar para Excel
                </div>
                <div style={styles.dropdownItem} onClick={() => { setMenuExportarAberto(false); mostrarAviso('CSV Gerado', 'Arquivo CSV gerado com sucesso.', 'sucesso'); }}>
                  <TableProperties size={14} color="#38bdf8" /> Exportar para CSV
                </div>
              </div>
            )}
          </div>

          <button style={styles.btnPremium} onClick={() => mostrarAviso('Módulo Fiscal Premium', 'Emita NF-e e NFC-e diretamente pelo sistema de forma automatizada com a Sefaz. Entre em contato com o suporte para assinar este módulo.', 'info')}>
            <Lock size={14} color="#fbbf24" /> Integrar Sefaz (NF-e)
          </button>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nº Documento</th>
              <th style={styles.th}>Ref. Venda</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Data Emissão</th>
              <th style={styles.th}>Tipo de Documento</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
              <th style={styles.th}>Status</th>
              <th style={{...styles.th, textAlign: 'center'}}>Ações</th>
            </tr>
            {/* Linha de Busca */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Nº Doc..." /></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Venda..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar cliente..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td colSpan="5" style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {mockNotas.map((item, index) => (
              <tr key={index} style={{...styles.tr, opacity: item.status === 'Cancelado' ? 0.6 : 1}}>
                <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0', textDecoration: item.status === 'Cancelado' ? 'line-through' : 'none'}}>{item.id}</td>
                <td style={{...styles.td, color: '#94a3b8'}}>{item.refVenda}</td>
                <td style={{...styles.td, color: '#93c5fd'}}>{item.cliente}</td>
                <td style={styles.td}>{item.data}</td>
                <td style={styles.td}>{item.tipo}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{item.valor}</td>
                <td style={styles.td}>{renderStatus(item.status)}</td>
                
                {/* MENU DE AÇÕES INTELIGENTE */}
                <td style={{...styles.td, textAlign: 'center'}}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <Settings size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Passando a origem 'recibos-notas' */}
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoMudarTela('recibo-garantia', 'recibos-notas'); }}>
                          <FileText size={14} color="#38bdf8" /> Visualizar / Imprimir
                        </div>
                        
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); window.print(); }}>
                          <Download size={14} color="#94a3b8" /> Baixar PDF
                        </div>

                        {item.status !== 'Cancelado' && (
                          <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => { setMenuAberto(null); mostrarAviso('WhatsApp', 'Redirecionando para o WhatsApp Web com o link do recibo...', 'sucesso'); }}>
                            <MessageCircle size={14} color="#4ade80" /> Enviar por WhatsApp
                          </div>
                        )}

                        {item.status !== 'Cancelado' && (
                          <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); mostrarAviso('Cancelamento', 'O recibo foi cancelado internamente e invalidado.', 'erro'); }}>
                            <Ban size={14} color="#ef4444" /> Cancelar Recibo
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CUSTOMIZADO PARA AVISOS */}
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
              <p style={{color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{modalAviso.mensagem}</p>
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
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh', position: 'relative' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex', gap: '10px' },
  
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnPremium: { backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' },
  
  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '150px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#e2e8f0', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#161925', transition: 'background-color 0.2s, opacity 0.3s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px', outline: 'none' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  
  badgeSuccess: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeError: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },

  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer', margin: '0 auto' },
  
  dropdownMenu: { position: 'absolute', top: '30px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '200px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownExport: { position: 'absolute', top: '40px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContentSmall: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '400px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  modalFooter: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #1f2233', paddingTop: '15px' },
  btnSaveModal: { color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }
};

export default RecibosNotas;