import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Printer, FileText, ShoppingCart, 
  CreditCard, User, Calendar, MapPin, Tag 
} from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { useLoja } from '../contexts/LojaContext';
import { formatBRL, formatCpfCnpj } from '../utils/formatters';
import { calcValorParcela } from '../domain/vendaCalculos';
import { getVendaById, mapVendaToRecibo, STATUS_LABEL } from '../services/vendaService';

function formatDataHora(isoDate, createdAt) {
  if (!isoDate && !createdAt) return '—';
  const base = createdAt ? new Date(createdAt) : new Date(`${isoDate}T12:00:00`);
  return base.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const VendaDetalhes = ({ aoVoltar, aoMudarTela, vendaId = null }) => {
  const { lojaAtivaId } = useLoja();
  const { alert } = useDialog();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendaId || !lojaAtivaId) {
      setLoading(false);
      return;
    }

    const carregar = async () => {
      setLoading(true);
      const { data, error } = await getVendaById(lojaAtivaId, vendaId);

      if (error || !data) {
        await alert(error?.message ?? 'Venda não encontrada.', { type: 'error', title: 'Erro' });
        aoVoltar();
        return;
      }

      setVenda(data);
      setLoading(false);
    };

    carregar();
  }, [vendaId, lojaAtivaId, alert, aoVoltar]);

  const handleImprimirRecibo = () => {
    if (!venda || !aoMudarTela) return;
    aoMudarTela('recibo-garantia', 'venda-detalhes', mapVendaToRecibo(venda));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Carregando venda...</div>;
  }

  if (!venda) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Venda não encontrada.</div>;
  }

  const enderecoCliente = [
    venda.cliente?.logradouro,
    venda.cliente?.numero,
    venda.cliente?.bairro,
    venda.cliente?.cidade,
    venda.cliente?.estado,
  ].filter(Boolean).join(' - ');

  return (
    <div style={styles.container}>
      
      {/* Cabeçalho de Ações */}
      <div style={styles.header}>
        <div style={styles.leftActions}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar para o Histórico
          </button>
          <h2 style={styles.title}>Detalhes da Venda #{venda.codigo}</h2>
          <span style={styles.statusPill}>{STATUS_LABEL[venda.status] ?? venda.status}</span>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline} onClick={() => alert('Geração de PDF em desenvolvimento (Requer biblioteca jsPDF)', { type: 'info', title: 'Em breve' })}>
            <FileText size={14} /> Gerar PDF
          </button>
          <button style={styles.btnPrimary} onClick={handleImprimirRecibo}>
            <Printer size={14} /> Imprimir Recibo
          </button>
        </div>
      </div>

      <div style={styles.contentScroll}>
        
        {/* Bloco 1: Informações Gerais e Cliente */}
        <div style={styles.grid2}>
          {/* Card Venda */}
          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <ShoppingCart size={16} color="#38bdf8" />
              <span style={styles.cardTitle}>Dados da Venda</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Data:</span> <span style={styles.infoValue}>{formatDataHora(venda.data_venda, venda.created_at)}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Vendedor:</span> <span style={styles.infoValue}>{venda.vendedor?.nome ?? '—'}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Tipo:</span> <span style={styles.infoValue}>{venda.tipo_venda ?? '—'}</span></div>
            </div>
          </div>

          {/* Card Cliente */}
          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <User size={16} color="#38bdf8" />
              <span style={styles.cardTitle}>Dados do Cliente</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Nome:</span> <span style={{...styles.infoValue, color: '#93c5fd', fontWeight: 'bold'}}>{venda.cliente?.nome ?? 'Consumidor Final'}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>CPF:</span> <span style={styles.infoValue}>{formatCpfCnpj(venda.cliente?.cpf_cnpj) || '—'}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Telefone:</span> <span style={styles.infoValue}>{venda.cliente?.telefone ?? '—'}</span></div>
              {enderecoCliente && (
                <div style={styles.infoRow}><span style={styles.infoLabel}>Endereço:</span> <span style={styles.infoValue}>{enderecoCliente}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 2: Itens da Venda */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><Tag size={16} /> Produtos Adquiridos</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produto / IMEI</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Qtd.</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Valor Un. (R$)</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Desconto (R$)</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {(venda.itens ?? []).map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{fontWeight: '500', color: '#e2e8f0'}}>{item.descricao}</div>
                      {item.imei && <div style={{fontSize: '11px', color: '#64748b', marginTop: '4px'}}>IMEI: {item.imei}</div>}
                    </td>
                    <td style={{...styles.td, textAlign: 'center'}}>{item.quantidade}</td>
                    <td style={{...styles.td, textAlign: 'right'}}>{formatBRL(item.valor_unitario)}</td>
                    <td style={{...styles.td, textAlign: 'right'}}>—</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#38bdf8'}}>{formatBRL(item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloco 3: Pagamentos e Resumo (Lado a Lado) */}
        <div style={styles.grid2}>
          
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}><CreditCard size={16} /> Pagamentos Realizados</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Método</th>
                  <th style={styles.th}>Parcelas</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {(venda.pagamentos ?? []).map((pag) => {
                  const valorParcela = calcValorParcela(pag.valor, pag.parcelas);
                  const parcelasLabel = pag.parcelas ?? 'À vista';
                  const parcelado = parcelasLabel !== 'À vista';

                  return (
                  <tr key={pag.id} style={styles.tr}>
                    <td style={styles.td}>{pag.forma_nome}<br/><span style={{fontSize: '10px', color: '#64748b'}}>{pag.detalhes}</span></td>
                    <td style={styles.td}>
                      {parcelasLabel}
                      {parcelado && (
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          de R$ {formatBRL(valorParcela)}
                        </div>
                      )}
                    </td>
                    <td style={{...styles.td, textAlign: 'right', color: '#22c55e', fontWeight: 'bold'}}>
                      {formatBRL(pag.valor)}
                      {Number(pag.valor_taxa) > 0 && (
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Taxa: {formatBRL(pag.valor_taxa)}</div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {venda.observacoes && (
               <div style={{marginTop: '20px', padding: '15px', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px'}}>
                 <span style={{fontSize: '12px', color: '#38bdf8', fontWeight: '600', display: 'block', marginBottom: '4px'}}>Observações da Venda:</span>
                 <p style={{fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5'}}>{venda.observacoes}</p>
               </div>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Resumo Financeiro</h3>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal dos Produtos:</span>
                <span style={styles.summaryValue}>{formatBRL(venda.valor_subtotal)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Descontos Aplicados:</span>
                <span style={{...styles.summaryValue, color: '#ef4444'}}>- {formatBRL(venda.valor_desconto)}</span>
              </div>
              {Number(venda.valor_acrescimo) > 0 && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Acréscimos/Taxas:</span>
                  <span style={styles.summaryValue}>+ {formatBRL(venda.valor_acrescimo)}</span>
                </div>
              )}
              {Number(venda.valor_troco) > 0 && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Troco:</span>
                  <span style={{...styles.summaryValue, color: '#22c55e'}}>{formatBRL(venda.valor_troco)}</span>
                </div>
              )}
              <div style={styles.divider}></div>
              <div style={styles.summaryRowTotal}>
                <span style={styles.summaryLabelTotal}>Total da Venda:</span>
                <span style={styles.summaryValueTotal}>{formatBRL(venda.valor_total)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '8px 8px 0 0' },
  leftActions: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', transition: '0.2s' },
  title: { color: '#fff', fontSize: '18px', fontWeight: '600' },
  statusPill: { backgroundColor: '#0d9488', color: '#ccfbf1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  
  rightActions: { display: 'flex', gap: '10px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },
  btnPrimary: { backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' },

  contentScroll: { padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  infoCard: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #1f2233', paddingBottom: '10px' },
  cardTitle: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: '#64748b', fontSize: '12px' },
  infoValue: { color: '#e2e8f0', fontSize: '13px' },

  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '15px' },
  
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', color: '#a1a1aa', fontSize: '12px', fontWeight: '500', borderBottom: '1px solid #1f2233' },
  td: { padding: '14px 12px', color: '#e2e8f0', fontSize: '13px', borderBottom: '1px solid #1f2233' },
  tr: { transition: 'background-color 0.2s' },

  summaryBox: { backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#94a3b8', fontSize: '13px' },
  summaryValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: '500' },
  divider: { height: '1px', backgroundColor: '#1f2233', margin: '5px 0' },
  summaryRowTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabelTotal: { color: '#e2e8f0', fontSize: '15px', fontWeight: 'bold' },
  summaryValueTotal: { color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }
};

export default VendaDetalhes;