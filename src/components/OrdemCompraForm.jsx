import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, Calendar, ShoppingCart,
} from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { listPessoasResumo } from '../services/pessoaService';
import { listProdutos } from '../services/produtoService';
import {
  calcItemTotal,
  calcOrdemTotais,
  createOrdemCompra,
  getOrdemCompraById,
  updateOrdemCompra,
} from '../services/ordemCompraService';
import { formatBRL } from '../utils/formatters';

const EMPTY_ITEM_DRAFT = {
  produtoId: '',
  quantidade: '1',
  custoUnitario: '',
  desconto: '',
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const OrdemCompraForm = ({ aoVoltar, ordemCompraId = null }) => {
  const { lojaAtivaId, perfil } = useLoja();
  const { alert } = useDialog();
  const isEdicao = Boolean(ordemCompraId);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM_DRAFT);
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState({
    fornecedorId: '',
    condicaoPagamento: 'À Vista (PIX/Dinheiro)',
    dataEmissao: hojeISO(),
    previsaoEntrega: '',
    observacoes: '',
  });

  useEffect(() => {
    if (!lojaAtivaId) return;

    Promise.all([
      listPessoasResumo(lojaAtivaId, { categoria: 'fornecedor' }),
      listProdutos(lojaAtivaId),
    ]).then(([fornecedoresResult, produtosResult]) => {
      if (!fornecedoresResult.error && fornecedoresResult.data?.length) {
        setFornecedores(fornecedoresResult.data);
      } else {
        listPessoasResumo(lojaAtivaId).then(({ data }) => setFornecedores(data ?? []));
      }
      if (!produtosResult.error) setProdutos(produtosResult.data ?? []);
    });
  }, [lojaAtivaId]);

  useEffect(() => {
    if (!ordemCompraId || !lojaAtivaId) return;

    const carregar = async () => {
      setCarregando(true);
      const { data, error } = await getOrdemCompraById(lojaAtivaId, ordemCompraId);

      if (error || !data) {
        await alert(error?.message ?? 'Não foi possível carregar a ordem de compra.', { type: 'error', title: 'Erro' });
        aoVoltar();
        return;
      }

      setSomenteLeitura(data.status !== 'pendente');
      setForm({
        fornecedorId: data.fornecedor_id ?? '',
        condicaoPagamento: data.condicao_pagamento ?? '',
        dataEmissao: data.data_emissao ?? hojeISO(),
        previsaoEntrega: data.previsao_entrega ?? '',
        observacoes: data.observacoes ?? '',
      });
      setItens(
        (data.itens ?? []).map((item) => ({
          produtoId: item.produto_id,
          descricao: item.descricao,
          quantidade: String(item.quantidade),
          custoUnitario: item.custo_unitario,
          desconto: item.desconto,
        }))
      );
      setCarregando(false);
    };

    carregar();
  }, [ordemCompraId, lojaAtivaId, aoVoltar]);

  const totais = useMemo(() => calcOrdemTotais(itens), [itens]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const adicionarItem = async () => {
    const produto = produtos.find((p) => p.id === itemDraft.produtoId);
    if (!produto) {
      await alert('Selecione um produto.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }
    if (!itemDraft.quantidade || Number(itemDraft.quantidade) <= 0) {
      await alert('Informe uma quantidade válida.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }
    if (!itemDraft.custoUnitario) {
      await alert('Informe o preço de custo unitário.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }

    setItens((prev) => [
      ...prev,
      {
        produtoId: produto.id,
        descricao: produto.nome,
        quantidade: itemDraft.quantidade,
        custoUnitario: itemDraft.custoUnitario,
        desconto: itemDraft.desconto || '0',
      },
    ]);
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const removerItem = (index) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const salvar = async () => {
    if (!lojaAtivaId) return;
    if (!form.fornecedorId) {
      await alert('Selecione um fornecedor.', { type: 'warning', title: 'Campo obrigatório' });
      return;
    }

    setSalvando(true);
    const { error } = isEdicao
      ? await updateOrdemCompra(lojaAtivaId, ordemCompraId, form, itens)
      : await createOrdemCompra(lojaAtivaId, form, itens, perfil?.id);
    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível salvar a ordem de compra.', { type: 'error', title: 'Erro' });
      return;
    }

    aoVoltar();
  };

  if (carregando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Carregando ordem de compra...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={aoVoltar} style={styles.btnBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h2 style={styles.title}>
            {isEdicao ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra'}
          </h2>
        </div>
        {somenteLeitura && (
          <span style={styles.readonlyBadge}>Somente leitura — ordem finalizada</span>
        )}
      </div>

      <div style={styles.contentScroll}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Dados do Fornecedor e Emissão</h3>
          <div style={styles.grid3}>
            <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
              <label style={styles.label}><span style={styles.required}>*</span> Fornecedor:</label>
              <select
                style={styles.input}
                name="fornecedorId"
                value={form.fornecedorId}
                onChange={handleChange}
                disabled={somenteLeitura}
              >
                <option value="">Selecionar fornecedor...</option>
                {fornecedores.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
                ))}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Condição de Pagamento:</label>
              <select
                style={styles.input}
                name="condicaoPagamento"
                value={form.condicaoPagamento}
                onChange={handleChange}
                disabled={somenteLeitura}
              >
                <option>À Vista (PIX/Dinheiro)</option>
                <option>Boleto Bancário 30 dias</option>
                <option>Cartão de Crédito Corporativo</option>
                <option>Faturado 15/30/45 dias</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Data de Emissão:</label>
              <input
                type="date"
                style={styles.input}
                name="dataEmissao"
                value={form.dataEmissao}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Previsão de Entrega:</label>
              <input
                type="date"
                style={styles.input}
                name="previsaoEntrega"
                value={form.previsaoEntrega}
                onChange={handleChange}
                disabled={somenteLeitura}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Comprador Responsável:</label>
              <input style={styles.input} value={perfil?.nome ?? '—'} disabled />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <ShoppingCart size={16} color="#38bdf8" /> Itens do Pedido de Compra
          </h3>

          {!somenteLeitura && (
            <>
              <div style={styles.grid3}>
                <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}><span style={styles.required}>*</span> Selecionar Produto:</label>
                  <select
                    style={styles.input}
                    value={itemDraft.produtoId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, produtoId: e.target.value }))}
                  >
                    <option value="">Selecionar do estoque...</option>
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        #{produto.codigo} — {produto.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Quantidade:</label>
                  <input
                    type="number"
                    min="1"
                    style={styles.input}
                    value={itemDraft.quantidade}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, quantidade: e.target.value }))}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}><span style={styles.required}>*</span> Custo Unitário (R$):</label>
                  <input
                    style={styles.input}
                    value={itemDraft.custoUnitario}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, custoUnitario: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Desconto (R$):</label>
                  <input
                    style={styles.input}
                    value={itemDraft.desconto}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, desconto: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <button style={styles.btnAddItem} onClick={adicionarItem}>
                <Plus size={16} /> Adicionar Item ao Pedido
              </button>
            </>
          )}

          <table style={styles.miniTable}>
            <thead>
              <tr>
                <th style={styles.th}>Produto</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Qtd.</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Custo Un. (R$)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Desconto (R$)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total (R$)</th>
                {!somenteLeitura && <th style={{ ...styles.th, width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={somenteLeitura ? 5 : 6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Nenhum produto adicionado à ordem de compra
                  </td>
                </tr>
              ) : (
                itens.map((item, index) => (
                  <tr key={`${item.produtoId}-${index}`}>
                    <td style={styles.tdItem}>{item.descricao}</td>
                    <td style={{ ...styles.tdItem, textAlign: 'center' }}>{item.quantidade}</td>
                    <td style={{ ...styles.tdItem, textAlign: 'right' }}>{formatBRL(item.custoUnitario)}</td>
                    <td style={{ ...styles.tdItem, textAlign: 'right' }}>{formatBRL(item.desconto)}</td>
                    <td style={{ ...styles.tdItem, textAlign: 'right', fontWeight: 'bold' }}>
                      {formatBRL(calcItemTotal(item.quantidade, item.custoUnitario, item.desconto))}
                    </td>
                    {!somenteLeitura && (
                      <td style={styles.tdItem}>
                        <button style={styles.btnRemove} onClick={() => removerItem(index)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '20px' }}>
            <label style={styles.label}>Observações / Instruções de Entrega:</label>
            <textarea
              style={{ ...styles.input, height: '70px', resize: 'none', marginTop: '8px' }}
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              disabled={somenteLeitura}
              placeholder="Ex: Entregar preferencialmente no período da tarde..."
            />
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.summaryBox}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Investimento Total da Compra:</span>
          <span style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>
            R$ {formatBRL(totais.valorTotal)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={aoVoltar} style={styles.btnCancel}>Voltar</button>
          {!somenteLeitura && (
            <button style={styles.btnFinalize} onClick={salvar} disabled={salvando}>
              <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar Ordem de Compra'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '8px 8px 0 0' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  title: { color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 },
  readonlyBadge: { color: '#fbbf24', fontSize: '12px', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: '6px 12px', borderRadius: '12px' },
  contentScroll: { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#e2e8f0', marginBottom: '20px', borderBottom: '1px solid #1f2233', paddingBottom: '12px', fontWeight: '500', marginTop: 0 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#a1a1aa' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#0b0c10', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px 12px', color: '#fff', fontSize: '13px', width: '100%', outline: 'none' },
  btnAddItem: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' },
  miniTable: { width: '100%', marginTop: '20px', borderCollapse: 'collapse', fontSize: '12px' },
  th: { padding: '10px 0', color: '#a1a1aa', fontWeight: '500', borderBottom: '1px solid #1f2233' },
  tdItem: { padding: '12px 0', color: '#e2e8f0', borderBottom: '1px solid #1f2233' },
  btnRemove: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' },
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryBox: { display: 'flex', alignItems: 'center', gap: '15px' },
  btnCancel: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#e2e8f0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  btnFinalize: { backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
};

export default OrdemCompraForm;
