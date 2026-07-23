import React from 'react';
import { 
  ArrowLeft, Printer, FileText, ShoppingCart, 
  CreditCard, User, Calendar, MapPin, Tag 
} from 'lucide-react';

const VendaDetalhes = ({ aoVoltar, aoMudarTela }) => {
  // Mock dos dados de uma venda específica (ex: Venda 6349496)
  const vendaMock = {
    codigo: '6349496',
    data: '03/07/2026 12:11',
    status: 'Concluído',
    vendedor: 'WESLEY DE SOUSA VIANA',
    cliente: {
      nome: 'EVERTON SOUSA DE LIMA',
      cpf: '000.000.000-00',
      telefone: '(85) 98857-8165',
      endereco: 'Rua das Flores, 123 - Bairro Centro - Fortaleza, CE'
    },
    itens: [
      { produto: 'Celular - iPhone 14 Plus - 128GB - Meia Noite', imei: '351906517594423', qtd: 1, valorUn: '2.800,00', desconto: '0,00', total: '2.800,00' }
    ],
    pagamentos: [
      { metodo: 'Cartão de Crédito', parcelas: '10x', valor: '2.800,00', detalhes: 'Maquininha Stone' }
    ],
    resumo: {
      subtotal: '2.800,00',
      descontoTotal: '0,00',
      totalFinal: '2.800,00'
    },
    observacoes: 'Cliente solicitou película de brinde, entregue no ato.'
  };

  const handleImprimirRecibo = () => {
    // Formata os dados da VendaDetalhes para o padrão que a tela ReciboGarantia espera
    const vendaFormatada = {
      id: vendaMock.codigo,
      cliente: vendaMock.cliente.nome,
      cpf: vendaMock.cliente.cpf,
      telefone: vendaMock.cliente.telefone,
      email: 'Não informado', 
      endereco: vendaMock.cliente.endereco,
      cidade: 'Fortaleza', 
      uf: 'CE',
      data: vendaMock.data.split(' ')[0], // Pega apenas a data, ignorando a hora
      vendedor: vendaMock.vendedor,
      valorTotal: vendaMock.resumo.totalFinal,
      produtos: vendaMock.itens.map((item, index) => ({
        id: index + 1,
        descricao: item.produto,
        imei: item.imei,
        qtd: item.qtd,
        valorUnitario: item.valorUn,
        valorTotal: item.total
      })),
      pagamentos: vendaMock.pagamentos.map(pag => ({
        forma: pag.metodo,
        detalhes: pag.detalhes,
        valor: pag.valor
      }))
    };

    if (aoMudarTela) {
      aoMudarTela('recibo-garantia', 'venda-detalhes', vendaFormatada);
    } else {
      alert("A função aoMudarTela não foi passada por prop no App.jsx.");
    }
  };

  return (
    <div style={styles.container}>
      
      {/* Cabeçalho de Ações */}
      <div style={styles.header}>
        <div style={styles.leftActions}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar para o Histórico
          </button>
          <h2 style={styles.title}>Detalhes da Venda #{vendaMock.codigo}</h2>
          <span style={styles.statusPill}>{vendaMock.status}</span>
        </div>
        <div style={styles.rightActions}>
          <button style={styles.btnOutline} onClick={() => alert('Geração de PDF em desenvolvimento (Requer biblioteca jsPDF)')}>
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
              <div style={styles.infoRow}><span style={styles.infoLabel}>Data:</span> <span style={styles.infoValue}>{vendaMock.data}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Vendedor:</span> <span style={styles.infoValue}>{vendaMock.vendedor}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Canal:</span> <span style={styles.infoValue}>Loja Física</span></div>
            </div>
          </div>

          {/* Card Cliente */}
          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <User size={16} color="#38bdf8" />
              <span style={styles.cardTitle}>Dados do Cliente</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Nome:</span> <span style={{...styles.infoValue, color: '#93c5fd', fontWeight: 'bold'}}>{vendaMock.cliente.nome}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>CPF:</span> <span style={styles.infoValue}>{vendaMock.cliente.cpf}</span></div>
              <div style={styles.infoRow}><span style={styles.infoLabel}>Telefone:</span> <span style={styles.infoValue}>{vendaMock.cliente.telefone}</span></div>
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
                {vendaMock.itens.map((item, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{fontWeight: '500', color: '#e2e8f0'}}>{item.produto}</div>
                      <div style={{fontSize: '11px', color: '#64748b', marginTop: '4px'}}>IMEI: {item.imei}</div>
                    </td>
                    <td style={{...styles.td, textAlign: 'center'}}>{item.qtd}</td>
                    <td style={{...styles.td, textAlign: 'right'}}>{item.valorUn}</td>
                    <td style={{...styles.td, textAlign: 'right'}}>{item.desconto}</td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#38bdf8'}}>{item.total}</td>
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
                {vendaMock.pagamentos.map((pag, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>{pag.metodo}<br/><span style={{fontSize: '10px', color: '#64748b'}}>{pag.detalhes}</span></td>
                    <td style={styles.td}>{pag.parcelas}</td>
                    <td style={{...styles.td, textAlign: 'right', color: '#22c55e', fontWeight: 'bold'}}>{pag.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {vendaMock.observacoes && (
               <div style={{marginTop: '20px', padding: '15px', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px'}}>
                 <span style={{fontSize: '12px', color: '#38bdf8', fontWeight: '600', display: 'block', marginBottom: '4px'}}>Observações da Venda:</span>
                 <p style={{fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5'}}>{vendaMock.observacoes}</p>
               </div>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Resumo Financeiro</h3>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal dos Produtos:</span>
                <span style={styles.summaryValue}>R$ {vendaMock.resumo.subtotal}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Descontos Aplicados:</span>
                <span style={{...styles.summaryValue, color: '#ef4444'}}>- R$ {vendaMock.resumo.descontoTotal}</span>
              </div>
              <div style={styles.divider}></div>
              <div style={styles.summaryRowTotal}>
                <span style={styles.summaryLabelTotal}>Total da Venda:</span>
                <span style={styles.summaryValueTotal}>R$ {vendaMock.resumo.totalFinal}</span>
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