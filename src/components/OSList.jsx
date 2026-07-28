import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, ChevronDown, Wrench, Clock, CheckCircle, 
  FilePen, Edit, Printer, MessageCircle, DollarSign, Ban, FileText
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

const OSList = ({ aoClicarEmNova }) => {
  const { alert } = useDialog();
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
  const handleImprimirVia = () => alert('Simulação: Gerando PDF do comprovante de entrada para o cliente...', { type: 'info', title: 'Simulação' });
  const handleWhatsApp = () => alert('Simulação: Abrindo WhatsApp Web com mensagem pré-configurada de atualização de status.', { type: 'info', title: 'Simulação' });
  const handleFaturar = () => alert('Simulação: OS Finalizada! Enviando valor para o módulo Financeiro (Contas a Receber).', { type: 'success', title: 'Simulação' });

  const mockOS = [
    { id: 'OS-5020', cliente: 'Everton Sousa', aparelho: 'iPhone 13', problema: 'Troca de Tela', tecnico: 'Wesley Viana', status: 'Em Manutenção', valor: '450,00' },
    { id: 'OS-5019', cliente: 'Maria Oliveira', aparelho: 'Samsung S22', problema: 'Não Liga', tecnico: 'Wesley Viana', status: 'Aguardando Peça', valor: '1.200,00' },
    { id: 'OS-5018', cliente: 'Otoniel Barbosa', aparelho: 'iPhone 15 Pro', problema: 'Limpeza e Película', tecnico: 'Wesley Viana', status: 'Finalizado', valor: '150,00' },
  ];

  const renderStatus = (status) => {
    let color = '#94a3b8'; let bg = 'rgba(148, 163, 184, 0.1)';
    if (status === 'Em Manutenção') { color = '#38bdf8'; bg = 'rgba(56, 189, 248, 0.1)'; }
    if (status === 'Aguardando Peça') { color = '#fbbf24'; bg = 'rgba(251, 191, 36, 0.1)'; }
    if (status === 'Finalizado') { color = '#4ade80'; bg = 'rgba(34, 197, 94, 0.1)'; }
    return <span style={{ color, backgroundColor: bg, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{status}</span>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={aoClicarEmNova} style={styles.btnSuccess}>
          <Plus size={16} /> Nova Ordem de Serviço
        </button>
        <div style={styles.rightActions}>
          <div style={styles.inputWithIcon}>
            <input type="text" placeholder="Buscar OS ou Cliente..." style={styles.searchInput} />
            <Search size={14} style={styles.innerIcon} />
          </div>
          <button style={styles.btnOutline}><Filter size={14} /> Filtros</button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Nº OS</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Aparelho</th>
              <th style={styles.th}>Serviço</th>
              <th style={styles.th}>Técnico</th>
              <th style={styles.th}>Status</th>
              <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {mockOS.map((os, idx) => (
              <tr key={idx} style={styles.tr}>
                {/* --- MENU DE AÇÕES DA OS --- */}
                <td style={styles.td}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(idx, e)}>
                      <FilePen size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === idx && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); aoClicarEmNova(); }}>
                          <Edit size={14} color="#38bdf8" /> Editar / Atualizar OS
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); handleImprimirVia(); }}>
                          <Printer size={14} color="#94a3b8" /> Imprimir Via do Cliente
                        </div>
                        <div style={styles.dropdownItem} onClick={() => { setMenuAberto(null); alert('Abrindo laudo técnico...', { type: 'info', title: 'Laudo técnico' }); }}>
                          <FileText size={14} color="#94a3b8" /> Ver Laudo Técnico
                        </div>
                        <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => { setMenuAberto(null); handleWhatsApp(); }}>
                          <MessageCircle size={14} color="#4ade80" /> Notificar via WhatsApp
                        </div>
                        
                        {os.status !== 'Finalizado' && (
                          <div style={{...styles.dropdownItem, borderTop: '1px solid #1f2233', marginTop: '4px', paddingTop: '8px'}} onClick={() => { setMenuAberto(null); handleFaturar(); }}>
                            <DollarSign size={14} color="#fbbf24" /> Finalizar e Faturar
                          </div>
                        )}
                        
                        <div style={{...styles.dropdownItem, color: '#ef4444', borderTop: os.status === 'Finalizado' ? '1px solid #1f2233' : 'none', marginTop: os.status === 'Finalizado' ? '4px' : '0', paddingTop: os.status === 'Finalizado' ? '8px' : '10px'}} onClick={() => { setMenuAberto(null); alert('OS Cancelada!', { type: 'warning', title: 'Cancelamento' }); }}>
                          <Ban size={14} color="#ef4444" /> Cancelar OS
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{...styles.td, fontWeight: 'bold'}}>{os.id}</td>
                <td style={{...styles.td, color: '#93c5fd'}}>{os.cliente}</td>
                <td style={styles.td}>{os.aparelho}</td>
                <td style={styles.td}>{os.problema}</td>
                <td style={styles.td}>{os.tecnico}</td>
                <td style={styles.td}>{renderStatus(os.status)}</td>
                <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#e2e8f0'}}>{os.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#161925', borderRadius: '8px', border: '1px solid #1f2233', padding: '20px', flex: 1, minHeight: '80vh' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  btnSuccess: { backgroundColor: '#4ade80', border: 'none', color: '#000', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  rightActions: { display: 'flex', gap: '10px' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchInput: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', color: '#fff', padding: '10px 35px 10px 15px', borderRadius: '6px', fontSize: '13px', width: '250px' },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  /* OVERFLOW VISIBLE PARA NÃO CORTAR O MENU */
  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '180px' },
  
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: '#94a3b8', fontSize: '12px', padding: '12px', borderBottom: '1px solid #1f2233' },
  td: { color: '#e2e8f0', fontSize: '13px', padding: '15px 12px', borderBottom: '1px solid #1f2233' },
  tr: { backgroundColor: '#11131c' },
  
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  
  /* ESTILOS DO MENU SUSPENSO */
  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default OSList;