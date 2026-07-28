import React, { useState } from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  PenTool,
  DollarSign,
  FileText,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Briefcase,
  FolderOpen,
  Menu,
  Search,
} from 'lucide-react';
import './sidebar.css';
import { useDialog } from '../contexts/DialogContext';

const ASSISTENCIA_TELAS = [
  'listagem-os',
  'nova-os',
  'painel-tecnico',
  'historico-os',
  'termos-os',
];

const Sidebar = ({ aoMudarTela, telaAtiva, sidebarAberta, setSidebarAberta, isMobile }) => {
  const { alert } = useDialog();
  const [openMenus, setOpenMenus] = useState({
    vendas: false,
    estoque: false,
    assistencia: false,
    financeiro: false,
    fiscal: false,
  });

  const toggleMenu = (menuKey) => {
    if (!sidebarAberta) setSidebarAberta(true);
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const menuItems = [
    { name: 'Tela inicial', icon: <Home size={20} />, key: 'home' },
    {
      name: 'Vendas',
      icon: <ShoppingCart size={20} />,
      key: 'vendas',
      subItems: ['Clientes', 'Venda - PDV', 'Orçamentos', 'Histórico de Vendas', 'Recibos e Notas'],
    },
    {
      name: 'Compras / Estoque',
      icon: <Package size={20} />,
      key: 'estoque',
      subItems: ['Estoque Atual', 'Ordem de Compra', 'Movimentações', 'Inventário', 'Vendidos sem Estoque'],
    },
    {
      name: 'Assistência Técnica',
      icon: <PenTool size={20} />,
      key: 'assistencia',
      subItems: [
        { label: 'Listagem de OS', tela: 'listagem-os' },
        { label: 'Nova OS / Entrada', tela: 'nova-os' },
        { label: 'Painel do Técnico', tela: 'painel-tecnico' },
        { label: 'Histórico / Finalizadas', tela: 'historico-os' },
        { label: 'Termos e Garantia', tela: 'termos-os' },
      ],
    },
    {
      name: 'Financeiro',
      icon: <DollarSign size={20} />,
      key: 'financeiro',
      subItems: ['Contas a Receber', 'Contas a Pagar', 'Novo Lançamento'],
    },
    {
      name: 'Fiscal',
      icon: <FileText size={20} />,
      key: 'fiscal',
      subItems: ['Painel Sefaz', 'Exportar Contabilidade'],
    },
    { name: 'Relatórios', icon: <BarChart2 size={20} />, key: 'relatorios' },
    { name: 'Ferramentas', icon: <Briefcase size={20} />, key: 'ferramentas' },
    { name: 'Documentos', icon: <FolderOpen size={20} />, key: 'documentos' },
    { name: 'Configurações', icon: <Settings size={20} />, key: 'config' },
  ];

  const isMenuActive = (item) => {
    if (openMenus[item.key]) return true;
    if (item.key === 'home' && telaAtiva === 'home') return true;
    if (
      item.key === 'vendas' &&
      [
        'listagem',
        'nova-venda',
        'clientes',
        'novo-cliente',
        'historico',
        'venda-detalhes',
        'orcamentos',
        'novo-orcamento',
        'recibos-notas',
        'recibo-garantia',
      ].includes(telaAtiva)
    )
      return true;
    if (
      item.key === 'estoque' &&
      [
        'consulta-estoque',
        'novo-produto',
        'ordem-compra',
        'nova-ordem-compra',
        'movimentacoes',
        'inventario',
        'vendidos-sem-estoque',
      ].includes(telaAtiva)
    )
      return true;
    if (item.key === 'assistencia' && ASSISTENCIA_TELAS.includes(telaAtiva)) return true;
    if (
      item.key === 'financeiro' &&
      ['contas-receber', 'contas-pagar', 'novo-lancamento'].includes(telaAtiva)
    )
      return true;
    if (item.key === 'fiscal' && ['painel-fiscal'].includes(telaAtiva)) return true;
    if (item.key === 'config' && telaAtiva === 'config') return true;
    if (item.key === 'relatorios' && telaAtiva === 'relatorios') return true;
    if (item.key === 'ferramentas' && telaAtiva === 'ferramentas') return true;
    if (item.key === 'documentos' && telaAtiva === 'documentos') return true;
    return false;
  };

  const handleSubItemClick = (sub) => {
    if (typeof sub === 'object' && sub.tela && aoMudarTela) {
      aoMudarTela(sub.tela);
      return;
    }

    const label = typeof sub === 'string' ? sub : sub.label;
    if (label === 'Venda - PDV' && aoMudarTela) aoMudarTela('listagem');
    if (label === 'Clientes' && aoMudarTela) aoMudarTela('clientes');
    if (label === 'Histórico de Vendas' && aoMudarTela) aoMudarTela('historico');
    if (label === 'Orçamentos' && aoMudarTela) aoMudarTela('orcamentos');
    if (label === 'Recibos e Notas' && aoMudarTela) aoMudarTela('recibos-notas');
    if (label === 'Estoque Atual' && aoMudarTela) aoMudarTela('consulta-estoque');
    if (label === 'Ordem de Compra' && aoMudarTela) aoMudarTela('ordem-compra');
    if (label === 'Movimentações' && aoMudarTela) aoMudarTela('movimentacoes');
    if (label === 'Inventário' && aoMudarTela) aoMudarTela('inventario');
    if (label === 'Vendidos sem Estoque' && aoMudarTela) aoMudarTela('vendidos-sem-estoque');
    if (label === 'Contas a Receber' && aoMudarTela) aoMudarTela('contas-receber');
    if (label === 'Contas a Pagar' && aoMudarTela) aoMudarTela('contas-pagar');
    if (label === 'Novo Lançamento' && aoMudarTela) aoMudarTela('novo-lancamento');
    if (label === 'Painel Sefaz' && aoMudarTela) aoMudarTela('painel-fiscal');
    if (label === 'Exportar Contabilidade') alert('Baixando pacote XML automaticamente...', { type: 'info', title: 'Exportação' });
  };

  const isSubActive = (sub) => {
    if (typeof sub === 'object' && sub.tela) return telaAtiva === sub.tela;
    const label = sub;
    return (
      (label === 'Venda - PDV' && (telaAtiva === 'listagem' || telaAtiva === 'nova-venda')) ||
      (label === 'Clientes' && (telaAtiva === 'clientes' || telaAtiva === 'novo-cliente')) ||
      (label === 'Histórico de Vendas' &&
        (telaAtiva === 'historico' || telaAtiva === 'venda-detalhes')) ||
      (label === 'Orçamentos' && (telaAtiva === 'orcamentos' || telaAtiva === 'novo-orcamento')) ||
      (label === 'Recibos e Notas' && telaAtiva === 'recibos-notas') ||
      (label === 'Estoque Atual' &&
        (telaAtiva === 'consulta-estoque' || telaAtiva === 'novo-produto')) ||
      (label === 'Ordem de Compra' &&
        (telaAtiva === 'ordem-compra' || telaAtiva === 'nova-ordem-compra')) ||
      (label === 'Movimentações' && telaAtiva === 'movimentacoes') ||
      (label === 'Inventário' && telaAtiva === 'inventario') ||
      (label === 'Vendidos sem Estoque' && telaAtiva === 'vendidos-sem-estoque') ||
      (label === 'Contas a Receber' && telaAtiva === 'contas-receber') ||
      (label === 'Contas a Pagar' && telaAtiva === 'contas-pagar') ||
      (label === 'Novo Lançamento' && telaAtiva === 'novo-lancamento') ||
      (label === 'Painel Sefaz' && telaAtiva === 'painel-fiscal')
    );
  };

  const sidebarClasses = [
    'sidebar',
    isMobile ? 'sidebar--mobile' : '',
    isMobile && !sidebarAberta ? 'sidebar--mobile-closed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <aside
        className={sidebarClasses}
        style={{
          width: isMobile ? undefined : sidebarAberta ? '260px' : '70px',
        }}
      >
        <div
          style={{
            ...styles.logoContainer,
            justifyContent: sidebarAberta ? 'space-between' : 'center',
            padding: sidebarAberta ? '20px' : '20px 0',
          }}
        >
          {sidebarAberta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={styles.logoIcon}>P</div>
              <h2 style={styles.logoText}>PhoneGestor</h2>
            </div>
          )}
          <button style={styles.btnMenuToggle} onClick={() => setSidebarAberta(!sidebarAberta)}>
            <Menu size={20} color="#e2e8f0" />
          </button>
        </div>

        <div style={{ ...styles.searchContainer, padding: sidebarAberta ? '16px' : '16px 10px' }}>
          {sidebarAberta ? (
            <input type="text" placeholder="Buscar no sistema..." style={styles.searchInput} />
          ) : (
            <div style={styles.searchIconOnly} onClick={() => setSidebarAberta(true)}>
              <Search size={18} color="#64748b" />
            </div>
          )}
        </div>

        <nav className="custom-scrollbar" style={styles.nav}>
          {menuItems.map((item) => {
            const isParentActive = isMenuActive(item);

            return (
              <div key={item.key}>
                <div
                  style={{
                    ...styles.menuItem,
                    ...(isParentActive && sidebarAberta ? styles.menuItemActive : {}),
                    justifyContent: sidebarAberta ? 'space-between' : 'center',
                    padding: sidebarAberta ? '12px 20px' : '15px 0',
                  }}
                  title={!sidebarAberta ? item.name : ''}
                  onClick={() => {
                    if (item.subItems) {
                      toggleMenu(item.key);
                    } else {
                      if (!sidebarAberta) setSidebarAberta(true);
                      if (aoMudarTela) aoMudarTela(item.key);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        ...styles.icon,
                        marginRight: sidebarAberta ? '12px' : '0',
                        color: isParentActive ? '#38bdf8' : '#94a3b8',
                      }}
                    >
                      {item.icon}
                    </span>
                    {sidebarAberta && <span style={styles.text}>{item.name}</span>}
                  </div>
                  {item.subItems && sidebarAberta && (
                    <span style={styles.chevron}>
                      {openMenus[item.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  )}
                </div>

                {item.subItems && openMenus[item.key] && sidebarAberta && (
                  <div style={styles.submenuContainer}>
                    {item.subItems.map((sub, idx) => {
                      const label = typeof sub === 'string' ? sub : sub.label;
                      const active = isSubActive(sub);

                      return (
                        <div
                          key={idx}
                          style={{ ...styles.subItem, ...(active ? styles.subItemActive : {}) }}
                          onClick={() => handleSubItemClick(sub)}
                        >
                          <span style={styles.subText}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

const styles = {
  sidebar: {
    backgroundColor: '#11131c',
    borderRight: '1px solid #1f2233',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    transition: 'width 0.3s ease',
    zIndex: 100,
  },
  logoContainer: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #1f2233' },
  logoIcon: {
    width: '28px',
    height: '28px',
    border: '2px solid #38bdf8',
    borderRadius: '8px',
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  logoText: { color: '#ffffff', fontSize: '18px', fontWeight: '600' },
  btnMenuToggle: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: { borderBottom: '1px solid #1f2233' },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#161925',
    border: '1px solid #2a2e3f',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  searchIconOnly: {
    width: '100%',
    height: '40px',
    backgroundColor: '#161925',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  nav: { overflowY: 'auto', flex: 1, paddingBottom: '20px' },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  menuItemActive: { color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.03)' },
  icon: { display: 'flex' },
  text: { fontSize: '14px', fontWeight: '500' },
  chevron: { display: 'flex', color: '#64748b' },
  submenuContainer: { backgroundColor: '#0b0c13', padding: '4px 0' },
  subItem: {
    padding: '10px 20px 10px 50px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  subItemActive: {
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    margin: '0 10px',
  },
  subText: { display: 'flex', alignItems: 'center' },
};

export default Sidebar;
