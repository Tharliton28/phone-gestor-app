import React, { useState } from 'react';
import { 
  ShoppingCart, Users, Package, PenTool, AlertTriangle, 
  Settings, Calendar, Search, Banknote, ShoppingBasket, Percent,
  X, Check, FileText, Zap, DollarSign, BarChart2, Edit, Plus,
  BarChart, Activity
} from 'lucide-react';

const Dashboard = ({ aoClicarEmNovaVenda, aoMudarTela }) => {
  const [modalAberto, setModalAberto] = useState(false);
  
  // Controle do Tooltip (Balão flutuante do gráfico)
  const [tooltip, setTooltip] = useState({ visivel: false, texto: '', x: 0, y: 0, cor: '' });

  // Controles de Configuração dos Widgets Individuais
  const [menuWidgetAberto, setMenuWidgetAberto] = useState(null);
  const [tipoGrafico, setTipoGrafico] = useState('barras');

  const todosAtalhos = [
    { id: 1, nome: 'Nova Venda', icon: <ShoppingCart size={18} />, acao: aoClicarEmNovaVenda },
    { id: 2, nome: 'Clientes', icon: <Users size={18} />, acao: () => aoMudarTela && aoMudarTela('clientes') },
    { id: 3, nome: 'Estoque', icon: <Package size={18} />, acao: () => aoMudarTela && aoMudarTela('consulta-estoque') },
    { id: 4, nome: 'Ordem de Serviço', icon: <PenTool size={18} />, acao: () => aoMudarTela && aoMudarTela('listagem-os') },
    { id: 5, nome: 'Financeiro', icon: <DollarSign size={18} />, acao: () => aoMudarTela && aoMudarTela('contas-receber') },
    { id: 6, nome: 'Relatórios', icon: <BarChart2 size={18} />, acao: () => aoMudarTela ? aoMudarTela('relatorios') : alert('Módulo de Relatórios em construção') },
    { id: 7, nome: 'Orçamentos', icon: <FileText size={18} />, acao: () => aoMudarTela && aoMudarTela('orcamentos') },
    { id: 8, nome: 'PDV Rápido', icon: <Zap size={18} />, acao: aoClicarEmNovaVenda },
    { id: 9, nome: 'Configurações', icon: <Settings size={18} />, acao: () => aoMudarTela ? aoMudarTela('config') : alert('Módulo de Configurações em construção') },
    { id: 10, nome: 'Alertas', icon: <AlertTriangle size={18} />, acao: () => alert('Verificando novos alertas no sistema...') },
  ];

  const [atalhosAtivos, setAtalhosAtivos] = useState([1, 2, 3, 4, 10]);

  const toggleAtalho = (id) => {
    if (atalhosAtivos.includes(id)) {
      setAtalhosAtivos(atalhosAtivos.filter(itemId => itemId !== id));
    } else {
      if (atalhosAtivos.length >= 6) {
        alert("Você já atingiu o limite máximo de 6 atalhos. Remova um para adicionar outro.");
        return;
      }
      setAtalhosAtivos([...atalhosAtivos, id]);
    }
  };

  // Funções para manipular o Tooltip interativo
  const mostrarTooltip = (e, texto, cor) => {
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visivel: true,
      texto: texto,
      x: rect.left + (rect.width / 2),
      y: rect.top - 10,
      cor: cor
    });
  };

  const esconderTooltip = () => {
    setTooltip({ ...tooltip, visivel: false });
  };

  return (
    <div style={styles.container}>
      
      {/* TOOLTIP FLUTUANTE (Balão de valor do gráfico) */}
      {tooltip.visivel && (
        <div style={{
          ...styles.tooltip,
          left: tooltip.x,
          top: tooltip.y,
          backgroundColor: tooltip.cor
        }}>
          {tooltip.texto}
          <div style={{...styles.tooltipSeta, borderTopColor: tooltip.cor}}></div>
        </div>
      )}

      {/* --- Linha Superior --- */}
      <div style={styles.topRow}>
        <div style={styles.shortcutsCard}>
          <div style={styles.cardHeader}>
            <div style={styles.tabs}>
              <span style={styles.activeTab}>Atalhos Rápidos ({atalhosAtivos.length}/6)</span>
            </div>
            <button style={styles.btnConfigShortcut} onClick={() => setModalAberto(true)}>
              <Edit size={14} /> Editar atalhos
            </button>
          </div>
          
          <div style={styles.shortcutsGrid}>
            {todosAtalhos.filter(a => atalhosAtivos.includes(a.id)).map((atalho, index) => (
              <button 
                key={atalho.id} 
                style={index === 0 ? {...styles.shortcutBtn, ...styles.btnPrimary} : styles.shortcutBtn}
                onClick={atalho.acao ? atalho.acao : () => {}}
              >
                {atalho.icon} {atalho.nome}
              </button>
            ))}
            
            {Array.from({ length: 6 - atalhosAtivos.length }).map((_, idx) => (
              <button key={`empty-${idx}`} style={styles.shortcutBtnEmpty} onClick={() => setModalAberto(true)}>
                <Plus size={18} color="#2a2e3f" />
              </button>
            ))}
          </div>
        </div>

        <div style={styles.bannerCard}>
          <div style={styles.bannerContent}>
            <h2 style={styles.bannerTitle}>PhoneGestor <span style={{color: '#38bdf8'}}>ERP</span></h2>
            <p style={styles.bannerSubtitle}>O sistema definitivo para a sua loja de celulares.</p>
            <p style={styles.bannerText}>Configure os módulos e aumente suas vendas em até 40%.</p>
            <button style={styles.bannerBtn}>Começar agora</button>
          </div>
          <div style={styles.dots}>
             <span style={styles.dotActive}></span>
             <span style={styles.dot}></span>
             <span style={styles.dot}></span>
             <span style={styles.dot}></span>
          </div>
        </div>
      </div>

      {/* --- Seção Central --- */}
      <div style={styles.widgetsSection}>
        <div style={styles.widgetsHeader}>
          <h3 style={styles.sectionTitle}>Meus Widgets</h3>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.dateInputGroup}>
            <label style={styles.dateLabel}>Data Inicial</label>
            <div style={styles.inputWithIcon}>
              <input type="text" defaultValue="08/07/2026" style={styles.dateInput} />
              <Calendar size={14} color="#64748b" style={styles.innerIcon}/>
            </div>
          </div>
          <div style={styles.dateInputGroup}>
            <label style={styles.dateLabel}>Data Final</label>
            <div style={styles.inputWithIcon}>
              <input type="text" defaultValue="08/07/2026" style={styles.dateInput} />
              <Calendar size={14} color="#64748b" style={styles.innerIcon}/>
            </div>
          </div>
          <button style={styles.btnFilter}><Search size={14} /> Filtrar</button>
        </div>

        <div style={styles.chartsGrid}>
          
          {/* Widget 1: OS */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartTitle}>Gráfico ordem de serviço <HelpCircleIcon /></span>
              <div style={{position: 'relative'}}>
                <Settings size={14} color="#64748b" style={{cursor: 'pointer'}} onClick={() => setMenuWidgetAberto(menuWidgetAberto === 'os' ? null : 'os')} />
                {menuWidgetAberto === 'os' && (
                  <div style={styles.widgetMenu}>
                    <div style={styles.widgetMenuItem} onClick={() => setMenuWidgetAberto(null)}><BarChart size={12}/> Tipo: Barras</div>
                    <div style={styles.widgetMenuItem} onClick={() => setMenuWidgetAberto(null)}><Activity size={12}/> Tipo: Linhas</div>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.emptyChart}>
              <p>Nenhuma OS encontrada no período</p>
            </div>
          </div>

          {/* Widget 2: VENDAS INTERATIVAS */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartTitle}>Gráfico de vendas <HelpCircleIcon /></span>
              <div style={{position: 'relative'}}>
                <Settings size={14} color="#64748b" style={{cursor: 'pointer'}} onClick={() => setMenuWidgetAberto(menuWidgetAberto === 'vendas' ? null : 'vendas')} />
                {menuWidgetAberto === 'vendas' && (
                  <div style={styles.widgetMenu}>
                    <div style={{...styles.widgetMenuItem, color: tipoGrafico === 'barras' ? '#38bdf8' : '#e2e8f0'}} onClick={() => {setTipoGrafico('barras'); setMenuWidgetAberto(null)}}><BarChart size={12}/> Estilo: Barras</div>
                    <div style={{...styles.widgetMenuItem, color: tipoGrafico === 'linhas' ? '#38bdf8' : '#e2e8f0'}} onClick={() => {setTipoGrafico('linhas'); setMenuWidgetAberto(null)}}><Activity size={12}/> Estilo: Linhas</div>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.mockBarChart}>
              <div style={styles.yAxis}>
                <span>5.000</span><span>4.000</span><span>3.000</span><span>2.000</span><span>1.000</span><span>0</span>
              </div>
              
              <div style={styles.barsArea}>
                {tipoGrafico === 'barras' ? (
                  <>
                    {/* Barra Faturamento */}
                    <div 
                      style={{...styles.bar, height: '94%', backgroundColor: '#93c5fd'}}
                      onMouseEnter={(e) => mostrarTooltip(e, 'Faturamento: 4.700,00', '#93c5fd')}
                      onMouseLeave={esconderTooltip}
                    ></div>
                    {/* Barra Custo */}
                    <div 
                      style={{...styles.bar, height: '80%', backgroundColor: '#fca5a5'}}
                      onMouseEnter={(e) => mostrarTooltip(e, 'Custo: 4.000,00', '#fca5a5')}
                      onMouseLeave={esconderTooltip}
                    ></div>
                    {/* Barra Lucro */}
                    <div 
                      style={{...styles.bar, height: '14%', backgroundColor: '#86efac'}}
                      onMouseEnter={(e) => mostrarTooltip(e, 'Lucro: 700,00', '#86efac')}
                      onMouseLeave={esconderTooltip}
                    ></div>
                  </>
                ) : (
                  /* Simulação Estilo Linha */
                  <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around'}}>
                    <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#93c5fd', marginBottom: '94%', cursor: 'pointer'}} onMouseEnter={(e) => mostrarTooltip(e, 'Faturamento: 4.700,00', '#93c5fd')} onMouseLeave={esconderTooltip}></div>
                    <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fca5a5', marginBottom: '80%', cursor: 'pointer'}} onMouseEnter={(e) => mostrarTooltip(e, 'Custo: 4.000,00', '#fca5a5')} onMouseLeave={esconderTooltip}></div>
                    <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#86efac', marginBottom: '14%', cursor: 'pointer'}} onMouseEnter={(e) => mostrarTooltip(e, 'Lucro: 700,00', '#86efac')} onMouseLeave={esconderTooltip}></div>
                  </div>
                )}
              </div>
            </div>
            <div style={{textAlign: 'center', color: '#e2e8f0', fontSize: '11px', marginTop: '10px'}}>
              <span style={{backgroundColor: '#161925', padding: '2px 8px', borderRadius: '4px', border: '1px solid #2a2e3f'}}>08/07/2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Dashboard Diário --- */}
      <div style={styles.dailySection}>
        <div style={styles.widgetsHeader}>
          <h3 style={styles.sectionTitle}>Dashboard diário de Vendas</h3>
          <Settings size={14} color="#64748b" style={{cursor: 'pointer'}} />
        </div>

        <div style={styles.metricsGrid}>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>2.200,00</span>
              <span style={styles.metricProj}>Projeção Mês Atual: 358.566,67</span>
              <span style={styles.metricLabel}>Faturamento (R$)</span>
            </div>
            <Banknote size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardBlue}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>1</span>
              <span style={styles.metricProj}>Projeção Mês Atual: 93</span>
              <span style={styles.metricLabel}>Qtd. Vendas</span>
            </div>
            <ShoppingBasket size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>450,00</span>
              <span style={styles.metricProj}>Projeção Mês Atual: 59.416,67</span>
              <span style={styles.metricLabel}>Lucro (R$)</span>
            </div>
            <ShoppingBasket size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>2.200,00</span>
              <span style={styles.metricProj}>&nbsp;</span>
              <span style={styles.metricLabel}>Ticket Médio</span>
            </div>
            <Banknote size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardBlue}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>20%</span>
              <span style={styles.metricProj}>&nbsp;</span>
              <span style={styles.metricLabel}>Percentual de Lucro</span>
            </div>
            <Percent size={60} style={styles.metricIconBg} />
          </div>
          <div style={styles.metricCardGreen}>
            <div style={styles.metricContent}>
              <span style={styles.metricValue}>450,00</span>
              <span style={styles.metricProj}>&nbsp;</span>
              <span style={styles.metricLabel}>Lucro médio (R$)</span>
            </div>
            <Banknote size={60} style={styles.metricIconBg} />
          </div>
        </div>

        <div style={{marginTop: '30px'}}>
          <h4 style={{fontSize: '14px', color: '#e2e8f0', marginBottom: '15px', fontWeight: '500'}}>Últimas Vendas Realizadas</h4>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Cód. da Venda</th>
                  <th style={styles.th}>Data da Venda</th>
                  <th style={styles.th}>Vendedor</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Valor produtos(R$)</th>
                  <th style={styles.th}>Desconto(R$)</th>
                  <th style={styles.th}>Valor Total (R$)</th>
                  <th style={styles.th}>Lucro (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={styles.tr}>
                  <td style={styles.td}>6347117</td>
                  <td style={styles.td}>03/07/2026 10:30</td>
                  <td style={styles.td}>Wesley de Sousa Viana</td>
                  <td style={styles.td}>MANOEL MESSIAS DOS SANTOS</td>
                  <td style={styles.td}>Celular - iPhone 13 - IMEI: 356709141255790 - 128GB - BRANCO</td>
                  <td style={styles.td}>2.300,00</td>
                  <td style={styles.td}>100,00</td>
                  <td style={styles.td}>2.200,00</td>
                  <td style={styles.td}>450,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

       {/* MODAL DE EDIÇÃO DE ATALHOS */}
       {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{margin: 0, color: '#fff', fontSize: '18px'}}>Personalizar Atalhos</h3>
              <button style={styles.btnClose} onClick={() => setModalAberto(false)}><X size={20} /></button>
            </div>
            
            <p style={{color: '#94a3b8', fontSize: '13px', marginBottom: '20px'}}>
              Selecione até 6 atalhos para aparecerem no seu painel principal. ({atalhosAtivos.length}/6 selecionados)
            </p>

            <div style={styles.modalGrid}>
              {todosAtalhos.map(atalho => {
                const isActive = atalhosAtivos.includes(atalho.id);
                return (
                  <div 
                    key={atalho.id} 
                    style={{...styles.modalItem, borderColor: isActive ? '#38bdf8' : '#2a2e3f', backgroundColor: isActive ? 'rgba(56, 189, 248, 0.05)' : '#161925'}}
                    onClick={() => toggleAtalho(atalho.id)}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: isActive ? '#38bdf8' : '#e2e8f0'}}>
                      {atalho.icon} <span style={{fontSize: '14px'}}>{atalho.nome}</span>
                    </div>
                    <div style={{...styles.checkbox, backgroundColor: isActive ? '#38bdf8' : 'transparent', borderColor: isActive ? '#38bdf8' : '#64748b'}}>
                      {isActive && <Check size={12} color="#fff" />}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnSaveModal} onClick={() => setModalAberto(false)}>Concluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const HelpCircleIcon = () => (
  <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', backgroundColor: '#334155', borderRadius: '50%', fontSize: '10px', color: '#94a3b8', marginLeft: '5px'}}>?</span>
);

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, paddingBottom: '40px', position: 'relative' },
  
  /* ESTILOS DO TOOLTIP */
  tooltip: { position: 'fixed', transform: 'translate(-50%, -100%)', color: '#11131c', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'top 0.1s, left 0.1s' },
  tooltipSeta: { position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '6px', borderStyle: 'solid', borderColor: 'transparent transparent transparent transparent' },

  /* ESTILOS DO MENU DE WIDGET */
  widgetMenu: { position: 'absolute', top: '20px', right: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '4px 0', minWidth: '120px', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  widgetMenuItem: { padding: '8px 12px', color: '#e2e8f0', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  topRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  shortcutsCard: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  tabs: { display: 'flex', gap: '20px' },
  activeTab: { color: '#e2e8f0', fontSize: '14px', fontWeight: '500', paddingBottom: '15px', borderBottom: '2px solid #3b82f6', marginBottom: '-16px' },
  btnConfigShortcut: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' },
  shortcutsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  shortcutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '12px', borderRadius: '6px', cursor: 'pointer', transition: '0.2s', fontSize: '13px' },
  shortcutBtnEmpty: { backgroundColor: 'transparent', border: '1px dashed #2a2e3f', padding: '15px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#ffffff', border: 'none' },

  bannerCard: { backgroundColor: '#0b0c10', borderRadius: '8px', border: '1px solid #1f2233', padding: '40px', position: 'relative', overflow: 'hidden', backgroundImage: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 50%)' },
  bannerContent: { position: 'relative', zIndex: 2 },
  bannerTitle: { fontSize: '28px', color: '#fff', marginBottom: '10px', fontWeight: '800', letterSpacing: '-1px' },
  bannerSubtitle: { fontSize: '18px', color: '#e2e8f0', marginBottom: '8px' },
  bannerText: { fontSize: '13px', color: '#94a3b8', marginBottom: '20px' },
  bannerBtn: { backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  dots: { position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' },
  dotActive: { width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '50%' },
  dot: { width: '8px', height: '8px', backgroundColor: '#334155', borderRadius: '50%' },

  widgetsSection: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  widgetsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2233', paddingBottom: '15px' },
  sectionTitle: { fontSize: '16px', color: '#e2e8f0', fontWeight: '600' },
  
  filterBar: { display: 'flex', alignItems: 'flex-end', gap: '15px' },
  dateInputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  dateLabel: { fontSize: '12px', color: '#94a3b8' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  dateInput: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 30px 8px 12px', borderRadius: '4px', fontSize: '13px', width: '150px' },
  innerIcon: { position: 'absolute', right: '10px' },
  btnFilter: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', color: '#e2e8f0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', height: '35px' },

  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  chartCard: { backgroundColor: '#11131c', border: '1px solid #1f2233', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', minHeight: '250px' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  chartTitle: { fontSize: '14px', color: '#e2e8f0' },
  emptyChart: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' },
  
  mockBarChart: { flex: 1, display: 'flex', gap: '10px', height: '150px' },
  yAxis: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#64748b', fontSize: '10px', alignItems: 'flex-end', paddingRight: '10px', borderRight: '1px solid #1f2233' },
  barsArea: { flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: '20px' },
  bar: { width: '50px', borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'opacity 0.2s' },

  dailySection: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', padding: '20px', display: 'flex', flexDirection: 'column' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '20px' },
  
  metricCardGreen: { backgroundColor: '#22c55e', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  metricCardBlue: { backgroundColor: '#3b82f6', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  
  metricContent: { display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 },
  metricValue: { fontSize: '28px', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px' },
  metricProj: { fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600' },
  metricLabel: { fontSize: '14px', color: '#ffffff', marginTop: '4px', fontWeight: '500' },
  metricIconBg: { position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255, 255, 255, 0.2)', transform: 'rotate(-10deg)', zIndex: 1 },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', borderTop: '1px solid #1f2233' },
  th: { padding: '12px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233' },
  td: { padding: '12px', color: '#e2e8f0', fontSize: '12px', borderBottom: '1px solid #1f2233' },
  tr: { transition: 'background-color 0.2s' },

  /* ESTILOS DO MODAL */
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: '#11131c', border: '1px solid #2a2e3f', borderRadius: '8px', width: '500px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  btnClose: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' },
  modalItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid', borderRadius: '6px', cursor: 'pointer', transition: '0.2s' },
  checkbox: { width: '16px', height: '16px', borderRadius: '4px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1f2233', paddingTop: '16px' },
  btnSaveModal: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Dashboard;