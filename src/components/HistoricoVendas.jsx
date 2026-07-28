import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Eraser, Download, ChevronDown, 
  Phone, List, FilePen, Search,
  FileText, FileSpreadsheet, TableProperties,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL, formatCpfCnpj } from '../utils/formatters';
import { listVendas, resumoProdutoVenda, STATUS_LABEL } from '../services/vendaService';

function formatDataHora(isoDate, createdAt) {
  const base = createdAt ? new Date(createdAt) : new Date(`${isoDate}T12:00:00`);
  return {
    data: base.toLocaleDateString('pt-BR'),
    hora: base.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

const HistoricoVendas = ({ aoMudarTela }) => {
  const { lojaAtivaId } = useLoja();
  const { alert } = useDialog();
  const [menuAberto, setMenuAberto] = useState(null);
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState([]);
  
  const [filtros, setFiltros] = useState({
    codigo: '', cliente: '', produto: '', data: ''
  });

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    setLoading(true);
    const { data, error } = await listVendas(lojaAtivaId, { status: 'concluido' });

    if (error) {
      await alert(error.message ?? 'Erro ao carregar histórico.', { type: 'error', title: 'Erro' });
      setVendas([]);
    } else {
      setVendas(data ?? []);
    }

    setLoading(false);
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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

  const limparFiltros = () => {
    setFiltros({ codigo: '', cliente: '', produto: '', data: '' });
  };

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((venda) => {
      const { data } = formatDataHora(venda.data_venda, venda.created_at);
      const matchCodigo = venda.codigo.includes(filtros.codigo);
      const matchCliente =
        (venda.cliente?.nome ?? '').toLowerCase().includes(filtros.cliente.toLowerCase()) ||
        formatCpfCnpj(venda.cliente?.cpf_cnpj).includes(filtros.cliente);
      const matchProduto = resumoProdutoVenda(venda).toLowerCase().includes(filtros.produto.toLowerCase());
      const matchData = !filtros.data || venda.data_venda === filtros.data;

      return matchCodigo && matchCliente && matchProduto && matchData;
    });
  }, [vendas, filtros]);

  const qtdFiltrosAtivos = Object.values(filtros).filter(val => val !== '').length;

  return (
    <div style={styles.container}>
      
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button 
            style={{...styles.btnClear, opacity: qtdFiltrosAtivos > 0 ? 1 : 0.3, pointerEvents: qtdFiltrosAtivos > 0 ? 'auto' : 'none'}} 
            onClick={limparFiltros}
          >
            <Eraser size={14} /> Limpar filtros
          </button>
        </div>
        <div style={styles.rightActions}>
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOutline} onClick={toggleMenuExportar}>
              <Download size={14} /> Exportar <ChevronDown size={14} />
            </button>
            {menuExportarAberto && (
              <div style={styles.dropdownExport} onClick={(e) => e.stopPropagation()}>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando PDF...', { type: 'info', title: 'Exportação' })}>
                  <FileText size={14} color="#ef4444" /> Exportar para PDF
                </div>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando Excel...', { type: 'info', title: 'Exportação' })}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Exportar para Excel
                </div>
                <div style={styles.dropdownItem} onClick={() => alert('Gerando CSV...', { type: 'info', title: 'Exportação' })}>
                  <TableProperties size={14} color="#38bdf8" /> Exportar para CSV
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Cód. da Venda</label>
            <input style={styles.input} placeholder="Ex: 6349496" value={filtros.codigo} onChange={(e) => setFiltros({...filtros, codigo: e.target.value})} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Cliente (Nome ou CPF)</label>
            <input style={styles.input} placeholder="Buscar cliente..." value={filtros.cliente} onChange={(e) => setFiltros({...filtros, cliente: e.target.value})} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Produto</label>
            <div style={styles.inputWithIcon}>
              <input style={{...styles.input, paddingRight: '30px'}} placeholder="Buscar aparelho..." value={filtros.produto} onChange={(e) => setFiltros({...filtros, produto: e.target.value})} />
              <Search size={14} color="#64748b" style={styles.innerIcon} />
            </div>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Data da Venda</label>
            <input style={styles.input} type="date" value={filtros.data} onChange={(e) => setFiltros({...filtros, data: e.target.value})} />
          </div>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando histórico...</div>
        ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '50px', minWidth: '50px'}}></th>
              <th style={styles.th}>Cód. Venda</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Data venda</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Aparelho</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Nenhuma venda concluída encontrada com estes filtros.</td></tr>
            ) : (
              vendasFiltradas.map((item, index) => {
                const { data, hora } = formatDataHora(item.data_venda, item.created_at);
                return (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{display: 'flex', alignItems: 'center', position: 'relative'}}>
                      <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                        <FilePen size={14} /> <ChevronDown size={12} />
                      </button>

                      {menuAberto === index && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.dropdownItem} onClick={() => alert('Integração WhatsApp em breve.', { type: 'info', title: 'Em breve' })}>
                            <Phone size={14} color="#22c55e" /> Whatsapp Recibo da venda
                          </div>
                          
                          <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoMudarTela('venda-detalhes', 'historico', { vendaId: item.id }); }}>
                            <List size={14} color="#e2e8f0" /> Detalhes da Venda
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{...styles.td, color: '#e2e8f0'}}>{item.codigo}</td>
                  <td style={{...styles.td, whiteSpace: 'normal', minWidth: '150px', fontWeight: 'bold'}}>{item.cliente?.nome ?? 'Consumidor Final'}</td>
                  <td style={styles.td}>{data} {hora}</td>
                  <td style={styles.td}><span style={styles.statusPill}>{STATUS_LABEL[item.status] ?? item.status}</span></td>
                  <td style={{...styles.td, color: '#93c5fd'}}>{resumoProdutoVenda(item)}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#e2e8f0'}}>{formatBRL(item.valor_total)}</td>
                </tr>
              );})
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* CONTAGEM DE REGISTROS E PAGINAÇÃO */}
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

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px' },
  leftActions: { display: 'flex', gap: '15px' },
  rightActions: { display: 'flex' },
  
  btnClear: { backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', transition: '0.2s' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  filterPanel: { backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '6px', padding: '15px', marginBottom: '20px' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  input: { backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },

  tableWrapper: { overflow: 'visible', paddingBottom: '30px', width: '100%', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#e2e8f0', fontSize: '11px', fontWeight: '600', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  statusPill: { backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' },
  
  dropdownMenu: { position: 'absolute', top: '30px', left: '25px', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '210px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownExport: { position: 'absolute', top: '35px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, textAlign: 'left' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' },

  paginationArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1f2233' },
  paginationControls: { display: 'flex', gap: '5px' },
  btnPage: { backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'not-allowed', padding: '4px 8px', display: 'flex', alignItems: 'center' },
  btnPageActive: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }
};

export default HistoricoVendas;