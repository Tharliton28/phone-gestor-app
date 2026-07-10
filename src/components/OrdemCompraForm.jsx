import React from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, Calendar, ShoppingCart, Edit, ChevronDown 
} from 'lucide-react';

const OrdemCompraForm = ({ aoVoltar }) => {
  return (
    <div style={styles.container}>
      
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <button onClick={aoVoltar} style={styles.btnBack}>
                <ArrowLeft size={16} /> Voltar
            </button>
            <h2 style={styles.title}>Nova Ordem de Compra</h2>
        </div>
        <button style={styles.btnLogs}>Ver Logs</button>
      </div>

      <div style={styles.contentScroll}>
        
        {/* --- DADOS DO PEDIDO / FORNECEDOR --- */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Dados do Fornecedor e Emissão</h3>
          <div style={styles.grid3}>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}><span style={styles.required}>*</span> Fornecedor:</label>
              <div style={{display: 'flex', gap: '5px'}}>
                  <input type="text" placeholder="Buscar Fornecedor..." style={{...styles.input, flex: 1}} />
                  <button style={styles.btnSmallOutline}><Edit size={14}/></button>
                  <button style={styles.btnSmallSuccess}><Plus size={14}/></button>
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Condição de Pagamento:</label>
              <select style={styles.input}>
                <option>À Vista (PIX/Dinheiro)</option>
                <option>Boleto Bancário 30 dias</option>
                <option>Cartão de Crédito Corporativo</option>
                <option>Faturado 15/30/45 dias</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data de Emissão:</label>
              <div style={styles.inputWithIcon}>
                  <input type="text" defaultValue="05/07/2026" style={styles.input} />
                  <Calendar size={16} style={styles.innerIcon} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Previsão de Entrega:</label>
              <div style={styles.inputWithIcon}>
                  <input type="text" placeholder="DD/MM/AAAA" style={styles.input} />
                  <Calendar size={16} style={styles.innerIcon} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Comprador Responsável:</label>
              <select style={styles.input}><option>Wesley de Sousa Viana</option></select>
            </div>
          </div>
        </div>

        {/* --- PRODUTOS A COMPRAR --- */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><ShoppingCart size={16} color="#38bdf8" /> Itens do Pedido de Compra</h3>
          <div style={styles.grid3}>
              <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}><span style={styles.required}>*</span> Selecionar Produto:</label>
                  <div style={{display: 'flex', gap: '5px'}}>
                      <select style={{...styles.input, flex: 1}}><option>Selecionar do Estoque...</option></select>
                      <button style={styles.btnSmallSuccess}><Plus size={14}/></button>
                  </div>
              </div>
              <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Quantidade a Comprar:</label>
                  <input type="number" defaultValue="1" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Preço de Custo Unitário (R$):</label>
                  <input type="text" placeholder="0,00" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                  <label style={styles.label}>Desconto do Fornecedor (R$):</label>
                  <input type="text" placeholder="0,00" style={styles.input} />
              </div>
          </div>
          
          <button style={styles.btnAddItem}><Plus size={16} /> Adicionar Item ao Pedido</button>
          
          <table style={styles.miniTable}>
              <thead>
                  <tr>
                      <th style={styles.th}>Produto</th>
                      <th style={{...styles.th, textAlign: 'center'}}>Qtd.</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Custo Un. (R$)</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Desconto (R$)</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Total (R$)</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>Nenhum produto adicionado à ordem de compra</td>
                  </tr>
              </tbody>
          </table>

          <div style={{marginTop: '20px'}}>
             <label style={styles.label}>Observações / Instruções de Entrega:</label>
             <textarea style={{...styles.input, height: '70px', resize: 'none', marginTop: '8px'}} placeholder="Ex: Entregar preferencialmente no período da tarde..."></textarea>
          </div>
        </div>

      </div>

      {/* --- RODAPÉ FINANCEIRO --- */}
      <div style={styles.footer}>
        <div style={styles.summaryBox}>
          <span style={{color: '#94a3b8', fontSize: '14px'}}>Investimento Total da Compra:</span>
          <span style={{color: '#22c55e', fontSize: '24px', fontWeight: 'bold'}}>R$ 0,00</span>
        </div>
        <div style={{display: 'flex', gap: '15px'}}>
           <button onClick={aoVoltar} style={styles.btnCancel}>Cancelar</button>
           <button style={styles.btnFinalize}><Save size={18} /> Salvar Ordem de Compra</button>
        </div>
      </div>

    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '8px 8px 0 0' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  title: { color: '#fff', fontSize: '18px', fontWeight: '600' },
  btnLogs: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  
  contentScroll: { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#e2e8f0', marginBottom: '20px', borderBottom: '1px solid #1f2233', paddingBottom: '12px', fontWeight: '500' },
  
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#a1a1aa' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
  
  btnSmallOutline: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#3b82f6', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnSmallSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnAddItem: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' },
  
  miniTable: { width: '100%', marginTop: '20px', borderCollapse: 'collapse', fontSize: '12px' },
  th: { padding: '10px 0', color: '#a1a1aa', fontWeight: '500', borderBottom: '1px solid #1f2233' },
  
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryBox: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  btnFinalize: { backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }
};

export default OrdemCompraForm;