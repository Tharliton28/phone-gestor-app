import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, Eraser, Download, ChevronDown, 
  Search, Calendar, FilePen, Edit, FileText, 
  PackageCheck, Printer, XCircle 
} from 'lucide-react';

const OrdemCompraList = ({ aoClicarEmNova }) => {
  const [menuAberto, setMenuAberto] = useState(null);

  // Mágica para fechar o menu ao clicar fora
  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  // Funções de ação simuladas
  const handleVerDetalhes = () => {
    alert("Simulação: Abrindo a tela de Detalhes da Ordem de Compra...");
  };

  const handleDarEntrada = () => {
    alert("Simulação: Abrindo painel para confirmar o recebimento dos produtos no estoque.");
  };

  const handleImprimir = () => {
    alert("Simulação: Gerando PDF da Ordem de Compra para envio ao fornecedor...");
  };

  const handleCancelar = () => {
    if(window.confirm("Tem certeza que deseja cancelar esta Ordem de Compra?")) {
      alert("Simulação: Ordem de compra cancelada com sucesso!");
    }
  };

  const mockOrdens = [
    { cod: 'OC-9021', fornecedor: 'Apple Brasil LTDA', dataEmissao: '01/07/2026', previsao: '10/07/2026', valor: '35.400,00', status: 'Pendente' },
    { cod: 'OC-9020', fornecedor: 'Fornecedor Capas SP', dataEmissao: '28/06/2026', previsao: '05/07/2026', valor: '1.250,00', status: 'Recebido' },
    { cod: 'OC-9019', fornecedor: 'Baterias Originais S/A', dataEmissao: '25/06/2026', previsao: '30/06/2026', valor: '850,00', status: 'Recebido' },
    { cod: 'OC-9018', fornecedor: 'Samsung Eletrônica', dataEmissao: '15/06/2026', previsao: '22/06/2026', valor: '12.000,00', status: 'Cancelado' },
  ];

  const renderStatus = (status) => {
    let color = '';
    let bg = '';
    if (status === 'Pendente') { color = '#fbbf24'; bg = 'rgba(251, 191, 36, 0.1)'; }
    if (status === 'Recebido') { color = '#4ade80'; bg = 'rgba(34, 197, 94, 0.1)'; }
    if (status === 'Cancelado') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
    
    return (
      <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
        {status}
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
          <button style={styles.btnOutlineWarning}><Eraser size={14} /> Limpar filtros</button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}><Download size={14} /> Exportar <ChevronDown size={14} /></button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Fornecedor</th>
              <th style={styles.th}>Data de Emissão</th>
              <th style={styles.th}>Previsão de Entrega</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor Total (R$)</th>
              <th style={styles.th}>Status</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Buscar Cód..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar fornecedor..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select style={styles.filterInput}>
                  <option>Todos</option>
                  <option>Pendente</option>
                  <option>Recebido</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody>
            {mockOrdens.map((item, index) => (
              <tr key={index} style={styles.tr}>
                {/* --- BOTÃO DE AÇÕES COM MENU SUSPENSO --- */}
                <td style={styles.td}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <FilePen size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        
                        {/* AÇÕES COM FUNCIONALIDADE ADICIONADA */}
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoClicarEmNova(); }}>
                          <Edit size={14} color="#38bdf8" /> Editar Ordem
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleVerDetalhes(); }}>
                          <FileText size={14} color="#94a3b8" /> Ver Detalhes
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleDarEntrada(); }}>
                          <PackageCheck size={14} color="#22c55e" /> Dar Entrada (Receber)
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleImprimir(); }}>
                          <Printer size={14} color="#94a3b8" /> Imprimir / PDF
                        </div>
                        <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); handleCancelar(); }}>
                          <XCircle size={14} color="#ef4444" /> Cancelar Ordem
                        </div>

                      </div>
                    )}
                  </div>
                </td>
                <td style={{...styles.td, fontWeight: '500', color: '#e2e8f0'}}>{item.cod}</td>
                <td style={{...styles.td, color: '#93c5fd'}}>{item.fornecedor}</td>
                <td style={styles.td}>{item.dataEmissao}</td>
                <td style={styles.td}>{item.previsao}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{item.valor}</td>
                <td style={styles.td}>{renderStatus(item.status)}</td>
              </tr>
            ))}
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
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default OrdemCompraList;