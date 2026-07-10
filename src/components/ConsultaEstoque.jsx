import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings, List, Eraser, Download, ChevronDown, 
  Search, Package, Smartphone, Tags, FilePen, Edit, 
  PackagePlus, History, Trash2
} from 'lucide-react';

const ConsultaEstoque = ({ aoClicarEmCadastrar }) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
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

  const mockEstoque = [
    { cod: '1001', nome: 'Apple iPhone 15 Pro Max 256GB Titânio', categoria: 'Aparelho', marca: 'Apple', qtd: 5, custo: '6.200,00', venda: '7.500,00', status: 'Ativo' },
    { cod: '1002', nome: 'Apple iPhone 13 128GB Meia Noite', categoria: 'Aparelho', marca: 'Apple', qtd: 12, custo: '2.400,00', venda: '2.900,00', status: 'Ativo' },
    { cod: '2050', nome: 'Capa de Silicone Transparente MagSafe', categoria: 'Acessório', marca: 'Genérica', qtd: 45, custo: '15,00', venda: '60,00', status: 'Ativo' },
    { cod: '2051', nome: 'Cabo USB-C para Lightning 1m', categoria: 'Acessório', marca: 'Genérica', qtd: 100, custo: '10,00', venda: '35,00', status: 'Ativo' },
    { cod: '3010', nome: 'Tela Display Frontal iPhone 11', categoria: 'Peça', marca: 'Prime', qtd: 2, custo: '150,00', venda: '350,00', status: 'Estoque Baixo' },
  ];

  const categorias = ['Todos', 'Aparelhos', 'Acessórios', 'Peças', 'Serviços'];

  return (
    <div style={styles.container}>
      
      {/* Barra de Ações Superior */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button onClick={aoClicarEmCadastrar} style={styles.btnSuccess}>
            <Plus size={16} /> Cadastrar Produto
          </button>
          <button style={styles.btnOutline}><Settings size={14} /> Ferramentas <ChevronDown size={14} /></button>
          <button style={styles.btnOutline}><List size={14} /> Modelo de lista <ChevronDown size={14} /></button>
          <button style={styles.btnOutlineWarning}><Eraser size={14} /> Limpar filtros</button>
        </div>
        
        <div style={styles.rightActions}>
          <button style={styles.btnOutline}><Download size={14} /> Exportar <ChevronDown size={14} /></button>
        </div>
      </div>

      {/* Filtros de Categoria */}
      <div style={styles.filtersSection}>
        <span style={{fontSize: '13px', color: '#e2e8f0', display: 'block', marginBottom: '8px'}}>Filtrar por Categoria</span>
        <div style={styles.categoriesGroup}>
          {categorias.map(cat => (
            <button 
              key={cat}
              style={{...styles.categoryBtn, ...(categoriaAtiva === cat ? styles.categoryBtnActive : {})}}
              onClick={() => setCategoriaAtiva(cat)}
            >
              {cat === 'Aparelhos' && <Smartphone size={14} />}
              {cat === 'Acessórios' && <Tags size={14} />}
              {cat === 'Peças' && <Package size={14} />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Estoque */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Cód.</th>
              <th style={styles.th}>Produto</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Marca</th>
              <th style={{...styles.th, textAlign: 'center'}}>Estoque</th>
              <th style={{...styles.th, textAlign: 'right'}}>Preço Custo (R$)</th>
              <th style={{...styles.th, textAlign: 'right'}}>Preço Venda (R$)</th>
              <th style={styles.th}>Status</th>
            </tr>
            {/* Linha de Busca Rápida */}
            <tr style={styles.filterRow}>
              <td style={styles.tdFilter}></td>
              <td style={styles.tdFilter}><input type="text" style={styles.filterInput} placeholder="Cód..." /></td>
              <td style={styles.tdFilter}>
                <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="Buscar produto..." style={styles.filterInput} />
                  <Search size={14} style={styles.innerIcon} />
                </div>
              </td>
              <td colSpan="6" style={styles.tdFilter}></td>
            </tr>
          </thead>
          <tbody>
            {mockEstoque.map((item, index) => (
              <tr key={index} style={styles.tr}>
                {/* --- AQUI ESTÁ O BOTÃO COM OPÇÕES DE REGISTRO --- */}
                <td style={styles.td}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', position: 'relative'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <FilePen size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        {/* Redireciona para o formulário simulando "Edição" */}
                        <div style={styles.dropdownItem} onClick={() => aoClicarEmCadastrar()}>
                          <Edit size={14} color="#38bdf8" /> Editar Produto
                        </div>
                        <div style={styles.dropdownItem}>
                          <PackagePlus size={14} color="#22c55e" /> Ajustar Estoque Manual
                        </div>
                        <div style={styles.dropdownItem}>
                          <History size={14} color="#a855f7" /> Ver Histórico do Item
                        </div>
                        <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}}>
                          <Trash2 size={14} color="#ef4444" /> Excluir Registro
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td style={styles.td}>{item.cod}</td>
                <td style={{...styles.td, fontWeight: '500', color: '#93c5fd'}}>{item.nome}</td>
                <td style={styles.td}>{item.categoria}</td>
                <td style={styles.td}>{item.marca}</td>
                <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold', color: item.qtd < 5 ? '#ef4444' : '#e2e8f0'}}>{item.qtd}</td>
                <td style={{...styles.td, textAlign: 'right'}}>{item.custo}</td>
                <td style={{...styles.td, textAlign: 'right', color: '#4ade80'}}>{item.venda}</td>
                <td style={styles.td}>
                  <span style={item.status === 'Ativo' ? styles.statusAtivo : styles.statusBaixo}>{item.status}</span>
                </td>
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
  btnOutlineWarning: { backgroundColor: 'transparent', border: '1px solid #fbbf24', color: '#fbbf24', padding: '8px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' },
  
  filtersSection: { padding: '20px 0 10px 0' },
  categoriesGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  categoryBtn: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: '0.2s' },
  categoryBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid #38bdf8', fontWeight: '500' },

  /* MÁGICA AQUI: Overflow visible e paddingBottom para não cortar o menu */
  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '120px' },
  
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
  statusAtivo: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  statusBaixo: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  
  /* ESTILOS DO MENU SUSPENSO COM Z-INDEX ALTO */
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default ConsultaEstoque;