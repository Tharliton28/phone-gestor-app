import React, { useState } from 'react';
import { 
  ArrowLeft, Save, DollarSign, Calendar, FileText, 
  Building, CreditCard, Tag, AlignLeft, TrendingUp, TrendingDown
} from 'lucide-react';

const FinanceiroForm = ({ aoVoltar }) => {
  const [tipoLancamento, setTipoLancamento] = useState('despesa'); // 'receita' ou 'despesa'

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{color: '#fff', fontSize: '18px', margin: 0}}>Novo Lançamento Financeiro</h2>
        </div>
      </div>

      <div style={styles.content}>
        
        {/* Seletor de Tipo de Lançamento */}
        <div style={styles.typeSelectorContainer}>
          <button 
            style={{...styles.typeBtn, ...(tipoLancamento === 'receita' ? styles.typeBtnReceitaAtivo : {})}}
            onClick={() => setTipoLancamento('receita')}
          >
            <TrendingUp size={18} /> RECEITA (Entrada)
          </button>
          <button 
            style={{...styles.typeBtn, ...(tipoLancamento === 'despesa' ? styles.typeBtnDespesaAtivo : {})}}
            onClick={() => setTipoLancamento('despesa')}
          >
            <TrendingDown size={18} /> DESPESA (Saída)
          </button>
        </div>

        {/* --- DADOS PRINCIPAIS --- */}
        <div style={{...styles.section, borderColor: tipoLancamento === 'receita' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}}>
          <h3 style={styles.secTitle}>
            <DollarSign size={16} color={tipoLancamento === 'receita' ? '#4ade80' : '#ef4444'} /> 
            Informações do Título
          </h3>
          
          <div style={styles.grid3}>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}><span style={styles.required}>*</span> Descrição do Lançamento:</label>
              <input style={styles.input} placeholder={tipoLancamento === 'receita' ? "Ex: Manutenção iPhone 13" : "Ex: Conta de Energia - Julho"} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Valor (R$):</label>
              <input style={{...styles.input, fontSize: '16px', fontWeight: 'bold', color: tipoLancamento === 'receita' ? '#4ade80' : '#ef4444'}} placeholder="0,00" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Data de Vencimento:</label>
              <div style={styles.inputWithIcon}>
                <input type="text" placeholder="DD/MM/AAAA" style={styles.input} />
                <Calendar size={16} style={styles.innerIcon} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data de Emissão (Competência):</label>
              <div style={styles.inputWithIcon}>
                <input type="text" placeholder="DD/MM/AAAA" style={styles.input} />
                <Calendar size={16} style={styles.innerIcon} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Situação Atual:</label>
              <select style={styles.input}>
                <option value="pendente">Pendente (Aberto)</option>
                <option value="pago">{tipoLancamento === 'receita' ? 'Recebido (Liquidado)' : 'Pago (Liquidado)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- CLASSIFICAÇÃO E VÍNCULOS --- */}
        <div style={styles.section}>
          <h3 style={styles.secTitle}><Tag size={16} color="#38bdf8" /> Classificação e Rateio</h3>
          
          <div style={styles.grid3}>
            <div style={{...styles.inputGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}>
                {tipoLancamento === 'receita' ? 'Cliente / Origem:' : 'Fornecedor / Favorecido:'}
              </label>
              <div style={styles.inputWithIcon}>
                <input style={styles.input} placeholder="Buscar pessoa..." />
                <Building size={16} style={styles.innerIcon} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nº do Documento / NF:</label>
              <div style={styles.inputWithIcon}>
                <input style={styles.input} placeholder="Ex: NF 1540" />
                <FileText size={16} style={styles.innerIcon} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Plano de Contas (Categoria):</label>
              <select style={styles.input}>
                <option>Selecione...</option>
                {tipoLancamento === 'receita' ? (
                  <optgroup label="Receitas">
                    <option>Venda de Aparelhos</option>
                    <option>Venda de Acessórios</option>
                    <option>Serviços e Mão de Obra</option>
                  </optgroup>
                ) : (
                  <optgroup label="Despesas">
                    <option>Custo com Mercadorias (Fornecedor)</option>
                    <option>Despesas Fixas (Aluguel, Luz, Água)</option>
                    <option>Folha de Pagamento</option>
                    <option>Impostos</option>
                  </optgroup>
                )}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Conta Bancária / Caixa:</label>
              <select style={styles.input}>
                <option>Caixa da Loja (Dinheiro)</option>
                <option>Conta Nubank (PIX)</option>
                <option>Conta Bradesco</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Forma de Pagamento:</label>
              <div style={styles.inputWithIcon}>
                <select style={styles.input}>
                  <option>PIX</option>
                  <option>Dinheiro</option>
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>Boleto Bancário</option>
                </select>
                <CreditCard size={16} style={styles.innerIcon} />
              </div>
            </div>
          </div>

          <div style={{...styles.inputGroup, marginTop: '20px'}}>
            <label style={styles.label}>
              <AlignLeft size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>
              Observações Adicionais:
            </label>
            <textarea style={{...styles.input, height: '80px', resize: 'none'}} placeholder="Anotações internas..."></textarea>
          </div>
        </div>

      </div>

      {/* --- RODAPÉ --- */}
      <div style={styles.footer}>
        <button onClick={aoVoltar} style={styles.btnCancel}>Cancelar</button>
        <button style={{...styles.btnSave, backgroundColor: tipoLancamento === 'receita' ? '#22c55e' : '#ef4444'}}>
          <Save size={18} /> Salvar {tipoLancamento === 'receita' ? 'Receita' : 'Despesa'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  header: { padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '8px 8px 0 0' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  
  content: { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  
  typeSelectorContainer: { display: 'flex', gap: '10px', backgroundColor: '#0f111a', padding: '10px', borderRadius: '8px', border: '1px solid #1f2233' },
  typeBtn: { flex: 1, padding: '15px', borderRadius: '6px', border: '1px solid #2a2e3f', backgroundColor: '#161925', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: '0.2s' },
  typeBtnReceitaAtivo: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e', color: '#4ade80' },
  typeBtnDespesaAtivo: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444' },

  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px', transition: 'border-color 0.3s' },
  secTitle: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '15px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #1f2233' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#a1a1aa', fontSize: '12px', fontWeight: '500' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%' },
  inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  innerIcon: { position: 'absolute', right: '12px', color: '#64748b' },
  
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  btnSave: { color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', transition: '0.2s' }
};

export default FinanceiroForm;