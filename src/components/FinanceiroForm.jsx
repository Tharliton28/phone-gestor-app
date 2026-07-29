import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Save, DollarSign, Calendar, FileText,
  Building, CreditCard, Tag, AlignLeft, TrendingUp, TrendingDown
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { listPessoasResumo } from '../services/pessoaService';
import {
  createLancamento,
  listPlanoContas,
  listContasBancarias,
  listFormasPagamentoFinanceiro,
} from '../services/financeiroService';
import CurrencyInput from './CurrencyInput';

const FinanceiroForm = ({ aoVoltar, tipoInicial = 'despesa' }) => {
  const { lojaAtivaId } = useLoja();
  const { alert } = useDialog();
  const [tipoLancamento, setTipoLancamento] = useState(tipoInicial);
  const [salvando, setSalvando] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [contas, setContas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [form, setForm] = useState({
    descricao: '',
    valor: 0,
    dataVencimento: new Date().toISOString().slice(0, 10),
    dataEmissao: new Date().toISOString().slice(0, 10),
    status: 'pendente',
    pessoaId: '',
    numeroDocumento: '',
    planoContaId: '',
    contaBancariaId: '',
    formaPagamentoId: '',
    observacoes: '',
  });

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;

    const [planosRes, contasRes, formasRes, pessoasRes] = await Promise.all([
      listPlanoContas(lojaAtivaId, tipoLancamento),
      listContasBancarias(lojaAtivaId),
      listFormasPagamentoFinanceiro(lojaAtivaId),
      listPessoasResumo(lojaAtivaId),
    ]);

    if (!planosRes.error) setPlanos(planosRes.data ?? []);
    if (!contasRes.error) setContas(contasRes.data ?? []);
    if (!formasRes.error) setFormas(formasRes.data ?? []);
    if (!pessoasRes.error) setPessoas(pessoasRes.data ?? []);
  }, [lojaAtivaId, tipoLancamento]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async () => {
    if (!lojaAtivaId) return;
    if (!form.descricao.trim()) {
      return alert('Informe a descrição do lançamento.', { type: 'error', title: 'Validação' });
    }
    if (!form.valor || form.valor <= 0) {
      return alert('Informe um valor válido.', { type: 'error', title: 'Validação' });
    }
    if (!form.dataVencimento) {
      return alert('Informe a data de vencimento.', { type: 'error', title: 'Validação' });
    }
    if (!form.planoContaId) {
      return alert('Selecione o plano de contas.', { type: 'error', title: 'Validação' });
    }

    setSalvando(true);
    const forma = formas.find((f) => f.id === form.formaPagamentoId);
    const statusDb = form.status === 'liquidado'
      ? (tipoLancamento === 'receita' ? 'recebido' : 'pago')
      : 'pendente';

    const { error } = await createLancamento(lojaAtivaId, {
      tipo: tipoLancamento,
      descricao: form.descricao,
      valor: form.valor,
      status: statusDb,
      pessoaId: form.pessoaId || null,
      planoContaId: form.planoContaId,
      contaBancariaId: form.contaBancariaId || null,
      formaPagamentoId: form.formaPagamentoId || null,
      formaPagamentoNome: forma?.nome ?? null,
      dataEmissao: form.dataEmissao,
      dataVencimento: form.dataVencimento,
      dataLiquidacao: statusDb !== 'pendente' ? form.dataVencimento : null,
      numeroDocumento: form.numeroDocumento,
      observacoes: form.observacoes,
    });
    setSalvando(false);

    if (error) {
      return alert(error.message ?? 'Não foi possível salvar.', { type: 'error', title: 'Erro' });
    }

    await alert('Lançamento salvo com sucesso.', { type: 'success', title: 'Sucesso' });
    aoVoltar?.();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>Novo Lançamento Financeiro</h2>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.typeSelectorContainer}>
          <button
            style={{ ...styles.typeBtn, ...(tipoLancamento === 'receita' ? styles.typeBtnReceitaAtivo : {}) }}
            onClick={() => setTipoLancamento('receita')}
          >
            <TrendingUp size={18} /> RECEITA (Entrada)
          </button>
          <button
            style={{ ...styles.typeBtn, ...(tipoLancamento === 'despesa' ? styles.typeBtnDespesaAtivo : {}) }}
            onClick={() => setTipoLancamento('despesa')}
          >
            <TrendingDown size={18} /> DESPESA (Saída)
          </button>
        </div>

        <div style={{ ...styles.section, borderColor: tipoLancamento === 'receita' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
          <h3 style={styles.secTitle}>
            <DollarSign size={16} color={tipoLancamento === 'receita' ? '#4ade80' : '#ef4444'} />
            Informações do Título
          </h3>

          <div style={styles.grid3}>
            <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
              <label style={styles.label}><span style={styles.required}>*</span> Descrição do Lançamento:</label>
              <input
                style={styles.input}
                value={form.descricao}
                onChange={(e) => atualizar('descricao', e.target.value)}
                placeholder={tipoLancamento === 'receita' ? 'Ex: Manutenção iPhone 13' : 'Ex: Conta de Energia - Julho'}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Valor (R$):</label>
              <CurrencyInput
                style={{ ...styles.input, fontSize: '16px', fontWeight: 'bold', color: tipoLancamento === 'receita' ? '#4ade80' : '#ef4444' }}
                value={form.valor}
                onChange={(valor) => atualizar('valor', valor)}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Data de Vencimento:</label>
              <input type="date" style={styles.input} value={form.dataVencimento} onChange={(e) => atualizar('dataVencimento', e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data de Emissão (Competência):</label>
              <input type="date" style={styles.input} value={form.dataEmissao} onChange={(e) => atualizar('dataEmissao', e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Situação Atual:</label>
              <select style={styles.input} value={form.status} onChange={(e) => atualizar('status', e.target.value)}>
                <option value="pendente">Pendente (Aberto)</option>
                <option value="liquidado">{tipoLancamento === 'receita' ? 'Recebido (Liquidado)' : 'Pago (Liquidado)'}</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.secTitle}><Tag size={16} color="#38bdf8" /> Classificação e Rateio</h3>

          <div style={styles.grid3}>
            <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
              <label style={styles.label}>
                {tipoLancamento === 'receita' ? 'Cliente / Origem:' : 'Fornecedor / Favorecido:'}
              </label>
              <select style={styles.input} value={form.pessoaId} onChange={(e) => atualizar('pessoaId', e.target.value)}>
                <option value="">Selecione...</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nº do Documento / NF:</label>
              <input style={styles.input} value={form.numeroDocumento} onChange={(e) => atualizar('numeroDocumento', e.target.value)} placeholder="Ex: NF 1540" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> Plano de Contas (Categoria):</label>
              <select style={styles.input} value={form.planoContaId} onChange={(e) => atualizar('planoContaId', e.target.value)}>
                <option value="">Selecione...</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Conta Bancária / Caixa:</label>
              <select style={styles.input} value={form.contaBancariaId} onChange={(e) => atualizar('contaBancariaId', e.target.value)}>
                <option value="">Selecione...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Forma de Pagamento:</label>
              <select style={styles.input} value={form.formaPagamentoId} onChange={(e) => atualizar('formaPagamentoId', e.target.value)}>
                <option value="">Selecione...</option>
                {formas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...styles.inputGroup, marginTop: '20px' }}>
            <label style={styles.label}>Observações Adicionais:</label>
            <textarea
              style={{ ...styles.input, height: '80px', resize: 'none' }}
              value={form.observacoes}
              onChange={(e) => atualizar('observacoes', e.target.value)}
              placeholder="Anotações internas..."
            />
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button onClick={aoVoltar} style={styles.btnCancel}>Cancelar</button>
        <button
          style={{ ...styles.btnSave, backgroundColor: tipoLancamento === 'receita' ? '#22c55e' : '#ef4444', opacity: salvando ? 0.6 : 1 }}
          onClick={salvar}
          disabled={salvando}
        >
          <Save size={18} /> {salvando ? 'Salvando...' : `Salvar ${tipoLancamento === 'receita' ? 'Receita' : 'Despesa'}`}
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

  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  btnSave: { color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', transition: '0.2s' },
};

export default FinanceiroForm;
