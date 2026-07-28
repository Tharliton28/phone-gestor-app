import React, { useState, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Download, AlertTriangle, CheckCircle, 
  RefreshCw, Send, Settings, FileKey, ChevronDown, Filter, FileArchive
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

const PainelFiscal = () => {
  const { alert } = useDialog();
  const [menuAberto, setMenuAberto] = useState(null);

  useEffect(() => {
    const handleClickFora = () => setMenuAberto(null);
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setMenuAberto(menuAberto === index ? null : index);
  };

  const mockEventos = [
    { id: '1', doc: 'NFC-e 1543', tipo: 'Emissão Normal', data: '06/07/2026 15:30', status: 'Autorizado', detalhes: 'Protocolo: 135230001234567' },
    { id: '2', doc: 'NF-e 890', tipo: 'Emissão Normal', data: '06/07/2026 14:15', status: 'Rejeição Sefaz', detalhes: 'Erro 778: NCM Inexistente ou Inválido' },
    { id: '3', doc: 'NF-e 889', tipo: 'Cancelamento', data: '05/07/2026 09:20', status: 'Homologado', detalhes: 'Protocolo: 135230001234111' },
    { id: '4', doc: 'NFC-e 1542', tipo: 'Contingência Offline', data: '05/07/2026 08:10', status: 'Pendente Envio', detalhes: 'Aguardando sincronização com a Sefaz' },
  ];

  const renderStatus = (status) => {
    if (status === 'Autorizado' || status === 'Homologado') {
      return <span style={styles.badgeSuccess}><CheckCircle size={12} /> {status}</span>;
    }
    if (status === 'Rejeição Sefaz') {
      return <span style={styles.badgeError}><AlertTriangle size={12} /> {status}</span>;
    }
    return <span style={styles.badgeWarning}><RefreshCw size={12} /> {status}</span>;
  };

  return (
    <div style={styles.container}>
      
      {/* Cards de Status da Sefaz e Certificado */}
      <div style={styles.cardsGrid}>
        <div style={{...styles.card, borderLeft: '4px solid #4ade80'}}>
          <div style={styles.cardIconBox}><ShieldCheck size={28} color="#4ade80" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Status Sefaz (CE)</span>
            <span style={styles.cardValue}>Serviço Online</span>
            <span style={{color: '#94a3b8', fontSize: '11px', marginTop: '4px'}}>Tempo de resposta: 120ms</span>
          </div>
        </div>
        
        <div style={{...styles.card, borderLeft: '4px solid #3b82f6'}}>
          <div style={styles.cardIconBox}><FileKey size={28} color="#3b82f6" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Certificado Digital (A1)</span>
            <span style={styles.cardValue}>Válido</span>
            <span style={{color: '#94a3b8', fontSize: '11px', marginTop: '4px'}}>Vence em: 14/11/2026 (131 dias)</span>
          </div>
        </div>

        <div style={{...styles.card, backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid #3b82f6'}}>
          <div style={styles.cardIconBox}><FileArchive size={28} color="#38bdf8" /></div>
          <div style={styles.cardText}>
            <span style={styles.cardLabel}>Fechamento Mensal</span>
            <span style={{...styles.cardValue, fontSize: '16px'}}>Exportar Contabilidade</span>
            <button style={styles.btnExportQuick} onClick={() => alert('Baixando arquivo ZIP com todos os XMLs do mês anterior...', { type: 'info', title: 'Exportação' })}>
              <Download size={14} /> Baixar XMLs (Junho)
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Ações */}
      <div style={styles.actionHeader}>
        <div style={styles.leftActions}>
          <button style={styles.btnOutline}><Filter size={14} /> Filtros Avançados</button>
          <button style={styles.btnOutline} onClick={() => alert('Sincronizando notas em contingência...', { type: 'info', title: 'Sincronização' })}>
            <RefreshCw size={14} /> Sincronizar Pendentes
          </button>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnSettings} onClick={() => alert('Abrindo painel de alíquotas, CFOP e NCM...', { type: 'info', title: 'Configurações fiscais' })}>
            <Settings size={14} /> Configurações Fiscais
          </button>
        </div>
      </div>

      {/* Tabela de Monitoramento Fiscal */}
      <div style={styles.tableWrapper}>
        <h3 style={styles.tableTitle}>Monitoramento de Eventos Recentes</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: '60px'}}></th>
              <th style={styles.th}>Documento</th>
              <th style={styles.th}>Data/Hora</th>
              <th style={styles.th}>Tipo de Emissão</th>
              <th style={styles.th}>Status / Sefaz</th>
              <th style={styles.th}>Detalhes / Retorno</th>
            </tr>
          </thead>
          <tbody>
            {mockEventos.map((item, index) => (
              <tr key={index} style={styles.tr}>
                {/* MENU SUSPENSO FISCAL */}
                <td style={styles.td}>
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <button style={styles.gridActionBtn} onClick={(e) => toggleMenu(index, e)}>
                      <FileText size={14} /> <ChevronDown size={12} />
                    </button>

                    {menuAberto === index && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownItem} onClick={() => alert('Baixando XML...', { type: 'info', title: 'Download' })}>
                          <Download size={14} color="#38bdf8" /> Baixar XML
                        </div>
                        
                        {item.status === 'Rejeição Sefaz' && (
                          <div style={{...styles.dropdownItem, color: '#fbbf24'}} onClick={() => alert('Abrindo tela para corrigir nota...', { type: 'warning', title: 'Correção' })}>
                            <Settings size={14} color="#fbbf24" /> Corrigir Nota (Editar)
                          </div>
                        )}
                        
                        {item.status === 'Pendente Envio' && (
                          <div style={{...styles.dropdownItem, color: '#4ade80'}} onClick={() => alert('Forçando envio para a Sefaz...', { type: 'info', title: 'Envio Sefaz' })}>
                            <Send size={14} color="#4ade80" /> Transmitir Agora
                          </div>
                        )}

                        {(item.status === 'Autorizado' || item.status === 'Homologado') && (
                          <>
                            <div style={styles.dropdownItem} onClick={() => alert('Imprimindo DANFE...', { type: 'info', title: 'Impressão' })}>
                              <FileText size={14} color="#94a3b8" /> Imprimir DANFE
                            </div>
                            <div style={styles.dropdownItem} onClick={() => alert('Criando Carta de Correção (CC-e)...', { type: 'info', title: 'Carta de Correção' })}>
                              <Edit size={14} color="#94a3b8" /> Carta de Correção (CC-e)
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{...styles.td, fontWeight: 'bold', color: '#e2e8f0'}}>{item.doc}</td>
                <td style={styles.td}>{item.data}</td>
                <td style={styles.td}>{item.tipo}</td>
                <td style={styles.td}>{renderStatus(item.status)}</td>
                <td style={{...styles.td, color: item.status === 'Rejeição Sefaz' ? '#ef4444' : '#94a3b8'}}>{item.detalhes}</td>
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
  card: { backgroundColor: '#161925', borderRadius: '6px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
  cardIconBox: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardText: { display: 'flex', flexDirection: 'column', flex: 1 },
  cardLabel: { color: '#94a3b8', fontSize: '12px', marginBottom: '4px' },
  cardValue: { color: '#fff', fontSize: '18px', fontWeight: 'bold' },
  btnExportQuick: { marginTop: '10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' },

  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #1f2233' },
  leftActions: { display: 'flex', gap: '10px' },
  rightActions: { display: 'flex' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  btnSettings: { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },
  
  tableWrapper: { overflow: 'visible', marginTop: '10px', paddingBottom: '150px' },
  tableTitle: { color: '#e2e8f0', fontSize: '15px', fontWeight: '500', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 10px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  td: { padding: '14px 10px', color: '#e2e8f0', fontSize: '13px', borderBottom: '1px solid #1f2233', whiteSpace: 'nowrap' },
  tr: { backgroundColor: '#11131c', transition: 'background-color 0.2s' },
  
  gridActionBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#161925', border: '1px solid #2a2e3f', padding: '6px 8px', borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer' },
  
  badgeSuccess: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeError: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeWarning: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },

  dropdownMenu: { position: 'absolute', top: '30px', left: '0', backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '6px', padding: '8px 0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', transition: 'background-color 0.2s' }
};

export default PainelFiscal;