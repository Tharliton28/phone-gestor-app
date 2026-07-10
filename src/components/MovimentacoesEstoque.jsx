import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, Calendar, Search, Filter, Download, 
  ChevronDown, FilePen, FileText, RotateCcw
} from 'lucide-react';

const MovimentacoesEstoque = () => {
  const [menuAberto, setMenuAberto] = useState(null);

  // Transformamos o mock em um Estado para podermos atualizar a tela na hora
  const [movimentacoes, setMovimentacoes] = useState([
    { id: 'MOV-1025', data: '05/07/2026 14:20', produto: 'Apple iPhone 15 Pro Max 256GB', tipo: 'Entrada', qtd: 5, motivo: 'Ordem de Compra OC-9021', operador: 'Wesley de Sousa Viana', estornado: false },
    { id: 'MOV-1024', data: '03/07/2026 12:11', produto: 'Apple iPhone 14 Plus 128GB', tipo: 'Saída', qtd: 1, motivo: 'Venda Código #6349496', operador: 'Wesley de Sousa Viana', estornado: false },
    { id: 'MOV-1023', data: '03/07/2026 10:30', produto: 'Apple iPhone 13 128GB', tipo: 'Saída', qtd: 1, motivo: 'Venda Código #6347117', operador: 'Wesley de Sousa Viana', estornado: false },
    { id: 'MOV-1022', data: '02/07/2026 16:45', produto: 'Capa de Silicone Transparente MagSafe', tipo: 'Ajuste', qtd: -2, motivo: 'Ajuste Manual - Item Danificado', operador: 'Wesley de Sousa Viana', estornado: false },
    { id: 'MOV-1021', data: '01/07/2026 09:15', produto: 'Cabo USB-C para Lightning 1m', tipo: 'Entrada', qtd: 50, motivo: 'Ajuste Manual - Balanço Inicial', operador: 'Wesley de Sousa Viana', estornado: false },
  ]);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const handleVerDetalhes = () => alert("Simulação: Abrindo janela com os detalhes e logs completos desta movimentação.");
  
  // Função que executa o Estorno
  const handleEstornar = (index) => {
    if(window.confirm("Atenção: Deseja estornar (reverter) esta movimentação? O saldo será recalculado e a ação ficará registrada no log do sistema.")) {
      const novaLista = [...movimentacoes];
      novaLista[index].estornado = true; // Marca o item específico como estornado
      setMovimentacoes(novaLista); // Atualiza a tela
      alert("Movimentação estornada com sucesso! O registro foi atualizado.");
    }
  };

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnFilter}>
            <Filter size={14} /> Filtros Avançados
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}>
            <Download size={14} /> Exportar Extrato <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Tabela de Extrato de Movimentações */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>ID Mov.</th>
              <th style={styles.th}>Data / Hora</th>
              <th style={styles.th}>Produto</th>
              <th style={{...styles.th, textAlign: 'center'}}>Tipo</th>
              <th style={{...styles.th, textAlign: 'center'}}>Qtd.</th>
              <th style={styles.th}>Motivo / Origem</th>
              <th style={styles.th}>Responsável</th>
            </tr>
            {/* Linha de Busca */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="ID..." /></td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" style={styles.filterInput} /><Calendar size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}><div style={styles.inputWithIcon}><input type="text" placeholder="Filtrar por produto..." style={styles.filterInput} /><Search size={14} style={styles.innerIcon} /></div></td>
              <td style={styles.tdFilter}>
                <select style={styles.filterInput}>
                  <option>Todos</option>
                  <option>Entrada</option>
                  <option>Saída</option>
                  <option>Ajuste</option>
                  <option>Estornados</option>
                </select>
              </td>
              <td colSpan="3" style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((item, index) => {
              const isEstornado = item.estornado;
              
              return (
                <tr key={index} style={{...styles.tr, opacity: isEstornado ? 0.6 : 1}}>
                  <td style={styles.td}>
                    <div style={{position: 'relative', display: 'inline-block'}}>
                      <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                        <FilePen size={14} /> <ChevronDown size={12} />
                      </button>

                      {menuAberto === index && (
                        <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleVerDetalhes(); }}>
                            <FileText size={14} color="#94a3b8" /> Ver Detalhes / Log
                          </div>
                          
                          {/* Só exibe a opção de estornar se o item NÃO estiver estornado */}
                          {!isEstornado && (
                            <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); handleEstornar(index); }}>
                              <RotateCcw size={14} color="#ef4444" /> Estornar Registro
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{...styles.td, fontFamily: 'monospace', color: '#64748b', textDecoration: isEstornado ? 'line-through' : 'none'}}>{item.id}</td>
                  <td style={{...styles.td, textDecoration: isEstornado ? 'line-through' : 'none'}}>{item.data}</td>
                  <td style={{...styles.td, fontWeight: '500', color: isEstornado ? '#64748b' : '#e2e8f0', textDecoration: isEstornado ? 'line-through' : 'none'}}>{item.produto}</td>
                  
                  <td style={{...styles.td, textAlign: 'center'}}>
                    {isEstornado ? (
                      <span style={styles.badgeEstornado}><RotateCcw size={12} /> Estornado</span>
                    ) : item.tipo === 'Entrada' ? (
                      <span style={styles.badgeEntrada}><ArrowUpRight size={12} /> Entrada</span>
                    ) : item.tipo === 'Saída' ? (
                      <span style={styles.badgeSaida}><ArrowDownLeft size={12} /> Saída</span>
                    ) : (
                      <span style={styles.badgeAjuste}><FilePen size={12} /> Ajuste</span>
                    )}
                  </td>
                  
                  <td style={{
                    ...styles.td, 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    color: isEstornado ? '#64748b' : (item.qtd > 0 ? '#4ade80' : '#ef4444'),
                    textDecoration: isEstornado ? 'line-through' : 'none'
                  }}>
                    {item.qtd > 0 ? `+${item.qtd}` : item.qtd}
                  </td>
                  
                  <td style={{...styles.td, color: isEstornado ? '#64748b' : '#93c5fd'}}>{item.motivo}</td>
                  <td style={styles.td}>{item.operador}</td>
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
  leftActions: { display: 'flex' },
  rightActions: { display: 'flex' },
  btnFilter: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  tableWrapper: { overflow: 'visible', marginTop: '20px', paddingBottom: '150px' },
  
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s, opacity 0.3s' },
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  
  badgeEntrada: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeSaida: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeAjuste: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeEstornado: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },

  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default MovimentacoesEstoque;