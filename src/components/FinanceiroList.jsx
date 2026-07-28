import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, ChevronDown, Download, 
  TrendingUp, TrendingDown, DollarSign, Calendar, 
  FilePen, CheckCircle, Clock, XCircle, Edit, Trash2, FileText
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

const FinanceiroList = ({ tipo, aoClicarEmNovo }) => {
  const { alert } = useDialog();
  const [menuAberto, setMenuAberto] = useState(null);
  const isReceber = tipo === 'receber';

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const mockReceber = [
    { id: 'REC-1050', descricao: 'Venda OS-5020 (Troca de Tela)', pessoa: 'Everton Sousa', vencimento: '05/07/2026', valor: '450,00', status: 'Pendente', forma: 'PIX' },
    { id: 'REC-1049', descricao: 'Venda #6349496 (iPhone 14 Plus)', pessoa: 'Thais Lopes', vencimento: '03/07/2026', valor: '6.500,00', status: 'Recebido', forma: 'Cartão de Crédito' },
    { id: 'REC-1048', descricao: 'Venda #6344336 (iPhone 13)', pessoa: 'Antonia Debora', vencimento: '02/07/2026', valor: '2.300,00', status: 'Recebido', forma: 'Dinheiro' },
    { id: 'REC-1040', descricao: 'Parcela 2/3 - Venda #633000', pessoa: 'Natan Covideira', vencimento: '01/07/2026', valor: '500,00', status: 'Atrasado', forma: 'Boleto' },
  ];

  const mockPagar = [
    { id: 'PAG-2010', descricao: 'Ordem de Compra OC-9020 (Capas)', pessoa: 'Fornecedor Capas SP', vencimento: '10/07/2026', valor: '1.250,00', status: 'Pendente', forma: 'Boleto' },
    { id: 'PAG-2009', descricao: 'Conta de Energia (Julho/26)', pessoa: 'Enel', vencimento: '08/07/2026', valor: '850,00', status: 'Pendente', forma: 'Débito Automático' },
    { id: 'PAG-2008', descricao: 'Aluguel da Loja', pessoa: 'Imobiliária Centro', vencimento: '05/07/2026', valor: '3.500,00', status: 'Pago', forma: 'PIX' },
  ];

  const dados = isReceber ? mockReceber : mockPagar;

  const renderStatus = (status) => {
    let color = ''; let bg = '';
    if (status === 'Recebido' || status === 'Pago') { color = '#4ade80'; bg = 'rgba(34, 197, 94, 0.1)'; }
    if (status === 'Pendente') { color = '#fbbf24'; bg = 'rgba(251, 191, 36, 0.1)'; }
    if (status === 'Atrasado') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
    
    return <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {status === 'Pendente' ? <Clock size={12} /> : status === 'Atrasado' ? <XCircle size={12} /> : <CheckCircle size={12} />} {status}
    </span>;
  };

  return (
    <div style={styles.container}>
      
      {/* Cards de Resumo */}
      <div style={styles.cardsGrid}>
        <div style={styles.card}>
          <div style={{...styles.cardIconBox, backgroundColor: isReceber ? '#4ade80' : '#ef4444'}}>
            {isReceber ? <TrendingUp size={24} color="#000" /> : <TrendingDown size={24} color="#fff" />}
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>{isReceber ? 'Total a Receber (Mês)' : 'Total a Pagar (Mês)'}</span>
            <span style={styles.cardValue}>{isReceber ? 'R$ 38.450,00' : 'R$ 15.200,00'}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={{...styles.cardIconBox, backgroundColor: '#fbbf24'}}>
            <Clock size={24} color="#000" />
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Pendentes (Próx. 7 dias)</span>
            <span style={styles.cardValue}>{isReceber ? 'R$ 5.200,00' : 'R$ 2.100,00'}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={{...styles.cardIconBox, backgroundColor: '#1e293b'}}>
            <XCircle size={24} color="#ef4444" />
          </div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Títulos Atrasados</span>
            <span style={{...styles.cardValue, color: '#ef4444'}}>{isReceber ? 'R$ 500,00' : 'R$ 0,00'}</span>
          </div>
        </div>
      </div>

      {/* Barra de Ações */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmNovo} style={{...styles.btnSuccess, backgroundColor: isReceber ? '#3b82f6' : '#ef4444', color: '#fff'}}>
            <Plus size={16} /> Novo Lançamento
          </button>
          <button style={styles.btnOutline}><Filter size={14} /> Filtros</button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}><Download size={14} /> Exportar Extrato <ChevronDown size={14} /></button>
        </div>
      </div>

      {/* Tabela Financeira */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Documento</th>
              <th style={styles.th}>Descrição</th>
              <th style={styles.th}>{isReceber ? 'Cliente / Origem' : 'Fornecedor / Favorecido'}</th>
              <th style={styles.th}>Vencimento</th>
              <th style={styles.th}>Forma Prevista</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
              <th style={styles.th}>Status</th>
            </tr>
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Doc..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar descrição..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Pessoa..." /></td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}>
                <select style={styles.filterInput}>
                  <option>Todos</option>
                  <option>{isReceber ? 'Recebido' : 'Pago'}</option>
                  <option>Pendente</option>
                  <option>Atrasado</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => (
              <tr key={index} style={styles.tr}>
                {/* MENU DE AÇÕES FINANCEIRAS */}
                <td style={styles.td}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <FilePen size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        
                        {(item.status === 'Pendente' || item.status === 'Atrasado') && (
                          <div style={{...styles.dropdownItem, color: '#4ade80', fontWeight: 'bold'}} onClick={() => { setMenuAberto(null); alert('Abrindo modal de liquidação (Baixa)...', { type: 'info', title: 'Liquidação' }); }}>
                            <DollarSign size={14} color="#4ade80" /> Dar Baixa ({isReceber ? 'Receber' : 'Pagar'})
                          </div>
                        )}

                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoClicarEmNovo(); }}>
                          <Edit size={14} color="#38bdf8" /> Editar Lançamento
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); alert('Gerando recibo/comprovante...', { type: 'info', title: 'Recibo' }); }}>
                          <FileText size={14} color="#94a3b8" /> Gerar Recibo
                        </div>
                        <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); alert('Título excluído!', { type: 'success', title: 'Exclusão' }); }}>
                          <Trash2 size={14} color="#ef4444" /> Excluir Título
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{...styles.td, fontFamily: 'monospace', color: '#64748b'}}>{item.id}</td>
                <td style={{...styles.td, fontWeight: '500', color: '#e2e8f0'}}>{item.descricao}</td>
                <td style={{...styles.td, color: '#93c5fd'}}>{item.pessoa}</td>
                <td style={styles.td}>{item.vencimento}</td>
                <td style={styles.td}>{item.forma}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: isReceber ? '#4ade80' : '#ef4444'}}>
                  {isReceber ? '+' : '-'} {item.valor}
                </td>
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
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', minHeight: '80vh' },
  
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' },
  card: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '6px', display: 'flex', alignItems: 'center' },
  cardIconBox: { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px' },
  cardText: { padding: '15px', display: 'flex', flexDirection: 'column' },
  cardLabel: { color: '#94a3b8', fontSize: '12px', marginBottom: '4px' },
  cardValue: { color: '#fff', fontSize: '20px', fontWeight: 'bold' },

  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnSuccess: { border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
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
  
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '200px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default FinanceiroList;