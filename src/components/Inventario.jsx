import React, { useState } from 'react';
import { 
  ClipboardList, Play, Save, CheckCircle, AlertTriangle, 
  Search, Filter, ChevronDown, Download, MinusCircle 
} from 'lucide-react';

const Inventario = () => {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Dados simulados para o balanço de estoque
  const mockInventario = [
    { cod: '1001', produto: 'Apple iPhone 15 Pro Max 256GB Titânio', categoria: 'Aparelho', qtdSistema: 5, qtdContada: 5, status: 'OK' },
    { cod: '1002', produto: 'Apple iPhone 13 128GB Meia Noite', categoria: 'Aparelho', qtdSistema: 12, qtdContada: 11, status: 'Faltando' },
    { cod: '2050', produto: 'Capa de Silicone Transparente MagSafe', categoria: 'Acessório', qtdSistema: 45, qtdContada: 43, status: 'Faltando' },
    { cod: '2051', produto: 'Cabo USB-C para Lightning 1m', categoria: 'Acessório', qtdSistema: 100, qtdContada: 105, status: 'Sobrando' },
    { cod: '3010', produto: 'Tela Display Frontal iPhone 11', categoria: 'Peça', qtdSistema: 2, qtdContada: 2, status: 'OK' },
  ];

  const renderStatus = (status, sistema, contado) => {
    const diferenca = contado - sistema;

    if (status === 'OK') {
      return <span style={styles.badgeOk}><CheckCircle size={12} /> Bateu</span>;
    }
    if (status === 'Faltando') {
      return <span style={styles.badgeFalta}><MinusCircle size={12} /> Faltou ({diferenca})</span>;
    }
    if (status === 'Sobrando') {
      return <span style={styles.badgeSobra}><AlertTriangle size={12} /> Sobrou (+{diferenca})</span>;
    }
  };

  const handleNovoBalanco = () => {
    alert("Simulação: Iniciando um novo Balanço Cego. Todas as contagens físicas seriam zeradas agora para a equipe recontar a loja.");
  };

  const handleSalvar = () => {
    alert("Simulação: Estoque ajustado com sucesso com base nas divergências encontradas!");
  };

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnPrimary} onClick={handleNovoBalanco}>
            <Play size={16} fill="#fff" /> Iniciar Novo Balanço
          </button>
          <button style={styles.btnOutline} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
            <Filter size={14} /> Filtros Avançados {filtrosAbertos ? '▲' : '▼'}
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnSuccess} onClick={handleSalvar}>
            <Save size={16} /> Salvar & Ajustar Estoque
          </button>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      {filtrosAbertos && (
        <div style={styles.advancedFiltersPanel}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Filtrar por Status:</label>
            <select style={styles.input}>
              <option>Mostrar Todos</option>
              <option>Apenas Divergentes (Sobra/Falta)</option>
              <option>Apenas Estoque Correto</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Marca do Produto:</label>
            <select style={styles.input}>
              <option>Todas as Marcas</option>
              <option>Apple</option>
              <option>Samsung</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Responsável pela Contagem:</label>
            <input type="text" placeholder="Nome do funcionário..." style={styles.input} />
          </div>
        </div>
      )}

      {/* Cards de Resumo do Inventário */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTextGroup}>
            <span style={styles.summaryLabel}>Total de Itens Listados</span>
            <span style={styles.summaryValue}>5</span>
          </div>
          <ClipboardList size={32} color="#38bdf8" style={{opacity: 0.8}} />
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTextGroup}>
            <span style={styles.summaryLabel}>Itens Divergentes</span>
            <span style={{...styles.summaryValue, color: '#ef4444'}}>3</span>
          </div>
          <AlertTriangle size={32} color="#ef4444" style={{opacity: 0.8}} />
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTextGroup}>
            <span style={styles.summaryLabel}>Precisão do Estoque</span>
            <span style={{...styles.summaryValue, color: '#22c55e'}}>40%</span>
          </div>
          <CheckCircle size={32} color="#22c55e" style={{opacity: 0.8}} />
        </div>
      </div>

      {/* Tabela de Contagem */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cód.</th>
              <th style={styles.th}>Produto</th>
              <th style={styles.th}>Categoria</th>
              <th style={{...styles.th, textAlign: 'center'}}>Qtd. Sistema</th>
              <th style={{...styles.th, textAlign: 'center', color: '#38bdf8'}}>Qtd. Física (Contada)</th>
              <th style={{...styles.th, textAlign: 'center'}}>Divergência</th>
              <th style={styles.th}>Status</th>
            </tr>
            {/* Linha de Busca */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Cód..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar produto..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td style={styles.tdFilter}>
                <select style={styles.filterInput}>
                  <option>Todas</option>
                  <option>Aparelho</option>
                  <option>Acessório</option>
                </select>
              </td>
              <td colSpan="4" style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {mockInventario.map((item, index) => {
              const divergencia = item.qtdContada - item.qtdSistema;
              const hasDivergencia = divergencia !== 0;

              return (
                <tr key={index} style={styles.tr}>
                  <td style={{...styles.td, color: '#64748b'}}>{item.cod}</td>
                  <td style={{...styles.td, fontWeight: '500', color: '#e2e8f0'}}>{item.produto}</td>
                  <td style={styles.td}>{item.categoria}</td>
                  <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '14px'}}>{item.qtdSistema}</td>
                  
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <input 
                      type="number" 
                      defaultValue={item.qtdContada} 
                      style={styles.inputCount} 
                    />
                  </td>
                  
                  <td style={{
                    ...styles.td, 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: hasDivergencia ? (divergencia > 0 ? '#fbbf24' : '#ef4444') : '#64748b'
                  }}>
                    {divergencia > 0 ? `+${divergencia}` : divergencia}
                  </td>
                  <td style={styles.td}>
                    {renderStatus(item.status, item.qtdSistema, item.qtdContada)}
                  </td>
                </tr>
              )
            })}
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
  
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSuccess: { backgroundColor: '#22c55e', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', transition: '0.2s' },

  advancedFiltersPanel: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '20px', backgroundColor: '#0f111a', borderBottom: '1px solid #1f2233', borderRadius: '0 0 8px 8px', marginTop: '-20px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#94a3b8' },
  input: { backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px', color: '#fff', fontSize: '13px', width: '100%' },

  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  summaryCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '6px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryTextGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  summaryLabel: { fontSize: '12px', color: '#94a3b8' },
  summaryValue: { fontSize: '24px', fontWeight: 'bold', color: '#fff' },

  tableWrapper: { overflowX: 'auto', marginTop: '20px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233', verticalAlign: 'middle' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  
  inputCount: { width: '80px', padding: '8px', backgroundColor: '#161925', border: '1px solid #38bdf8', borderRadius: '4px', color: '#fff', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' },

  badgeOk: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeFalta: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeSobra: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }
};

export default Inventario;