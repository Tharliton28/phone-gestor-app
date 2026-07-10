import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, RefreshCw, Download, ChevronDown, 
  Search, FilePen, TrendingDown, PackagePlus, 
  Package, List, ShoppingCart 
} from 'lucide-react';

const VendidosSemEstoque = () => {
  const [menuAberto, setMenuAberto] = useState(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  // Funções simuladas
  const handleAjustarSaldo = () => alert("Simulação: Abrindo modal para dar Entrada Manual e corrigir o saldo negativo.");
  const handleVerProduto = () => alert("Simulação: Redirecionando para o histórico de movimentações deste produto.");
  const handleVerVenda = () => alert("Simulação: Abrindo os detalhes da venda que causou esta ruptura.");
  const handleGerarCompra = () => alert("Simulação: Adicionando este item em uma nova Ordem de Compra urgente.");

  const mockFuros = [
    { cod: '1005', produto: 'Apple iPhone 11 64GB Preto', categoria: 'Aparelho', dataVenda: '05/07/2026', qtdVendida: 2, saldoAtual: -2, valor: '3.600,00', vendedor: 'Wesley de Sousa Viana' },
    { cod: '2080', produto: 'Película de Vidro 3D iPhone 15', categoria: 'Acessório', dataVenda: '04/07/2026', qtdVendida: 10, saldoAtual: -8, valor: '300,00', vendedor: 'Wesley de Sousa Viana' },
    { cod: '2092', produto: 'Carregador Turbo 20W USB-C', categoria: 'Acessório', dataVenda: '04/07/2026', qtdVendida: 3, saldoAtual: -1, valor: '450,00', vendedor: 'Wesley de Sousa Viana' },
  ];

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnRefresh}>
            <RefreshCw size={14} /> Atualizar Lista
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}>
            <Download size={14} /> Exportar Relatório de Ruptura <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Card de Alerta de Gravidade */}
      <div style={styles.alertBanner}>
        <div style={styles.alertIcon}>
          <AlertCircle size={24} color="#fff" />
        </div>
        <div style={styles.alertContent}>
          <h4 style={styles.alertTitle}>Atenção: Ruptura de Estoque Detectada</h4>
          <p style={styles.alertText}>Os itens abaixo foram vendidos sem registro de saldo positivo no sistema. Isso indica falha no processo de entrada ou inventário desatualizado.</p>
        </div>
        <div style={styles.impactBadge}>
            <TrendingDown size={16} /> 
            <span>Impacto: Médio</span>
        </div>
      </div>

      {/* Tabela de Produtos Vendidos sem Estoque */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Cód.</th>
              <th style={styles.th}>Produto</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Última Venda</th>
              <th style={{...styles.th, textAlign: 'center'}}>Qtd. Vendida (Furo)</th>
              <th style={{...styles.th, textAlign: 'center'}}>Saldo em Sistema</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor Total (R$)</th>
              <th style={styles.th}>Vendedor</th>
            </tr>
            {/* Linha de Busca */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Cód..." /></td>
              <td colSpan="7" style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Filtrar por nome do produto..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            {mockFuros.map((item, index) => (
              <tr key={index} style={styles.tr}>
                {/* --- MENU DE AÇÕES INTELIGENTE --- */}
                <td style={styles.td}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <FilePen size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleAjustarSaldo(); }}>
                          <PackagePlus size={14} color="#4ade80" /> Ajustar Saldo (Entrada)
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleVerProduto(); }}>
                          <Package size={14} color="#38bdf8" /> Acessar Ficha do Produto
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleVerVenda(); }}>
                          <List size={14} color="#94a3b8" /> Ver Detalhes da Venda
                        </div>
                        <div style={{...styles.dropdownItem, borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); handleGerarCompra(); }}>
                          <ShoppingCart size={14} color="#fbbf24" /> Gerar Ordem de Compra
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{...styles.td, color: '#64748b'}}>{item.cod}</td>
                <td style={{...styles.td, fontWeight: '500', color: '#e2e8f0'}}>{item.produto}</td>
                <td style={styles.td}>{item.categoria}</td>
                <td style={styles.td}>{item.dataVenda}</td>
                <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#ef4444'}}>
                  {item.qtdVendida}
                </td>
                <td style={{...styles.td, textAlign: 'center'}}>
                    <span style={styles.negativeBadge}>{item.saldoAtual}</span>
                </td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{item.valor}</td>
                <td style={styles.td}>{item.vendedor}</td>
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
  leftActions: { display: 'flex' },
  rightActions: { display: 'flex' },
  
  btnRefresh: { backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },

  alertBanner: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginTop: '20px' },
  alertIcon: { width: '45px', height: '45px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1 },
  alertTitle: { color: '#ef4444', fontSize: '15px', fontWeight: 'bold', margin: 0, marginBottom: '4px' },
  alertText: { color: '#94a3b8', fontSize: '13px', margin: 0 },
  impactBadge: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '20px', color: '#fbbf24', fontSize: '12px', fontWeight: '600' },

  /* OVERFLOW VISIBLE PARA NÃO CORTAR O MENU */
  tableWrapper: { overflow: 'visible', marginTop: '20px', paddingBottom: '150px' },
  
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  filterRow: { backgroundColor: '#0f111a' },
  tdFilter: { padding: '8px', borderBottom: '1px solid #1f2233' },
  filterInput: { width: '100%', padding: '8px', backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '4px', color: '#fff', fontSize: '12px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '10px', color: '#64748b' },
  
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  negativeBadge: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' },

  /* ESTILOS DO MENU SUSPENSO */
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default VendidosSemEstoque;