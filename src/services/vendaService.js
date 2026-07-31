import { supabase } from '../lib/supabaseClient';
import { parseMoney, moneyToCents } from '../utils/formatters';
import {
  calcVendaTotais,
  calcTotalPago,
  calcTroco,
  serializarItensParaVenda,
  serializarPagamentosParaVenda,
} from '../domain/vendaCalculos';
import { getLojaConfig, permiteVendaSemEstoque } from './lojaConfigService';
import { registrarMovimentacao } from './movimentacaoService';
import { gerarReceitasVenda, cancelarReceitasVenda } from './financeiroService';
import { marcarOrcamentoConvertido } from './orcamentoService';

export const STATUS_LABEL = {
  concluido: 'Concluído',
  pre_venda: 'Pré-Venda',
  cancelada: 'Cancelada',
};

export const STATUS_UI_TO_DB = {
  Concluído: 'concluido',
  'Pré-Venda': 'pre_venda',
  Cancelada: 'cancelada',
};

export const STATUS_DB_TO_UI = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([db, ui]) => [db, ui])
);

export { calcVendaTotais, calcTotalPago, calcTroco } from '../domain/vendaCalculos';

async function validarEstoqueVenda(lojaId, itens, permiteRuptura) {
  if (permiteRuptura) return { error: null };

  const demandaPorProduto = {};

  for (const item of itens) {
    const produtoId = item.produtoId ?? item.produto_id;
    if (!produtoId) continue;
    demandaPorProduto[produtoId] =
      (demandaPorProduto[produtoId] ?? 0) + Number(item.quantidade ?? 1);
  }

  const produtoIds = Object.keys(demandaPorProduto);
  if (!produtoIds.length) return { error: null };

  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, nome, quantidade_atual')
    .eq('loja_id', lojaId)
    .in('id', produtoIds);

  if (error) return { error };

  for (const produto of produtos ?? []) {
    const demanda = demandaPorProduto[produto.id] ?? 0;
    if (produto.quantidade_atual < demanda) {
      return {
        error: new Error(
          `Estoque insuficiente para "${produto.nome}". Saldo: ${produto.quantidade_atual}, necessário: ${demanda}.`
        ),
      };
    }
  }

  return { error: null };
}

async function baixarEstoqueVenda(lojaId, venda, itens, operadorId) {
  for (const item of itens) {
    if (!item.produto_id || item.baixou_estoque) continue;

    const { error: movError } = await registrarMovimentacao(lojaId, {
      produtoId: item.produto_id,
      tipo: 'saida',
      quantidade: item.quantidade,
      origem: 'venda',
      referenciaId: venda.id,
      motivo: `Venda ${venda.codigo} — ${item.descricao}`,
      operadorId,
    });

    if (movError) {
      return { error: movError };
    }

    await supabase
      .from('venda_itens')
      .update({ baixou_estoque: true })
      .eq('loja_id', lojaId)
      .eq('id', item.id);
  }

  return supabase
    .from('vendas')
    .update({ estoque_baixado: true })
    .eq('loja_id', lojaId)
    .eq('id', venda.id);
}

/** Fallback legado quando RPC ainda não foi aplicada no Supabase */
async function createVendaLegacy(lojaId, payload, operadorId) {
  const itens = serializarItensParaVenda(payload.itens);
  const pagamentos = serializarPagamentosParaVenda(payload.pagamentos);
  const totais = calcVendaTotais(itens, payload.descontoGlobal, pagamentos, payload.acrescimoManual ?? 0);
  const status = payload.status ?? 'concluido';

  const totalPagoCents = pagamentos.reduce((acc, pag) => acc + moneyToCents(pag.valor), 0);
  const valorTotalCents = moneyToCents(totais.valorTotal);

  if (totalPagoCents < valorTotalCents) {
    return { data: null, error: new Error('O valor pago não confere com o total da venda.') };
  }

  if (status === 'concluido') {
    const { data: config } = await getLojaConfig(lojaId);
    const { error: estoqueError } = await validarEstoqueVenda(
      lojaId,
      itens,
      permiteVendaSemEstoque(config)
    );
    if (estoqueError) {
      return { data: null, error: estoqueError };
    }
  }

  const { data: codigoData, error: codigoError } = await supabase.rpc('next_venda_codigo', {
    p_loja_id: lojaId,
  });

  let codigo = codigoData;
  if (codigoError || !codigo) {
    const { data: rows } = await supabase
      .from('vendas')
      .select('codigo')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false })
      .limit(1);
    const last = rows?.[0]?.codigo;
    const seq = last ? Number(String(last).replace(/\D/g, '')) || 0 : 0;
    codigo = String(seq + 1).padStart(7, '0');
  }

  const valorTroco = calcTroco(totais.valorTotal, pagamentos);

  const { data: venda, error: vendaError } = await supabase
    .from('vendas')
    .insert({
      loja_id: lojaId,
      codigo,
      cliente_id: payload.clienteId || null,
      vendedor_id: payload.vendedorId || operadorId || null,
      status,
      tipo_venda: payload.tipoVenda || null,
      valor_subtotal: totais.valorSubtotal,
      valor_desconto: totais.valorDesconto,
      valor_acrescimo: totais.valorAcrescimo,
      valor_total: totais.valorTotal,
      valor_troco: valorTroco,
      data_venda: payload.dataVenda || undefined,
      observacoes: payload.observacoes?.trim() || null,
    })
    .select()
    .single();

  if (vendaError) {
    return { data: null, error: vendaError };
  }

  const itensPayload = itens.map((item) => ({
    loja_id: lojaId,
    venda_id: venda.id,
    produto_id: item.produtoId || null,
    descricao: item.nome?.trim() || item.descricao?.trim() || 'Item avulso',
    imei: item.imei?.trim() || null,
    quantidade: Number(item.quantidade) || 1,
    valor_unitario: parseMoney(item.preco ?? item.valorUnitario),
    valor_total: parseMoney(item.preco ?? item.valorUnitario) * (Number(item.quantidade) || 1),
  }));

  const { data: itensInseridos, error: itensError } = await supabase
    .from('venda_itens')
    .insert(itensPayload)
    .select();

  if (itensError) {
    return { data: null, error: itensError };
  }

  if (pagamentos.length) {
    const pagamentosPayload = pagamentos.map((pag) => ({
      loja_id: lojaId,
      venda_id: venda.id,
      forma_pagamento_id: pag.formaPagamentoId || null,
      forma_nome: pag.formaNome || pag.forma || 'Não informado',
      valor: parseMoney(pag.valor),
      valor_base: parseMoney(pag.valorBase ?? pag.valor),
      valor_taxa: parseMoney(pag.valorTaxa ?? 0),
      parcelas: pag.parcelas || null,
      detalhes: pag.detalhes?.trim() || null,
      taxa_percentual: Number(pag.taxa) || 0,
      taxa_repassada: Boolean(pag.taxaRepassada),
    }));

    const { error: pagError } = await supabase.from('venda_pagamentos').insert(pagamentosPayload);
    if (pagError) {
      return { data: null, error: pagError };
    }
  }

  if (status === 'concluido') {
    await gerarReceitasVenda(lojaId, venda.id);
    const { error: baixaError } = await baixarEstoqueVenda(lojaId, venda, itensInseridos ?? [], operadorId);
    if (baixaError) {
      return { data: null, error: baixaError };
    }
  }

  if (payload.orcamentoId) {
    await marcarOrcamentoConvertido(lojaId, payload.orcamentoId, venda.id);
  }

  return { data: { ...venda, valor_troco: valorTroco }, error: null };
}

export async function listVendas(lojaId, { status = null } = {}) {
  let query = supabase
    .from('vendas')
    .select(
      `
      id, codigo, status, tipo_venda, valor_total, valor_troco, data_venda, created_at,
      cliente:pessoas (id, nome),
      vendedor:usuarios!vendas_vendedor_id_fkey (id, nome),
      itens:venda_itens (id, descricao, quantidade, valor_total, produto:produtos (nome))
    `
    )
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  return query;
}

export async function getVendaById(lojaId, vendaId) {
  return supabase
    .from('vendas')
    .select(
      `
      *,
      cliente:pessoas (id, nome, cpf_cnpj, telefone, email, logradouro, numero, bairro, cidade, estado),
      vendedor:usuarios!vendas_vendedor_id_fkey (id, nome),
      itens:venda_itens (
        id, produto_id, descricao, imei, quantidade, valor_unitario, valor_total, baixou_estoque,
        produto:produtos (id, nome, codigo, ncm, cfop, unidade, icms_origem, icms_situacao_tributaria, ean)
      ),
      pagamentos:venda_pagamentos (
        id, forma_pagamento_id, forma_nome, valor, valor_base, valor_taxa,
        parcelas, detalhes, taxa_percentual, taxa_repassada, aparelho_entrada_produto_id,
        forma:formas_pagamento (id, tipo, nome)
      )
    `
    )
    .eq('loja_id', lojaId)
    .eq('id', vendaId)
    .maybeSingle();
}

export async function createVenda(lojaId, payload, operadorId) {
  const itens = serializarItensParaVenda(payload.itens);
  const pagamentos = serializarPagamentosParaVenda(payload.pagamentos);

  if (!itens.length) {
    return { data: null, error: new Error('Adicione produtos ao carrinho.') };
  }

  const totais = calcVendaTotais(
    itens,
    payload.descontoGlobal,
    pagamentos,
    payload.acrescimoManual ?? 0
  );

  const totalPagoCents = pagamentos.reduce((acc, pag) => acc + moneyToCents(pag.valor), 0);
  if (totalPagoCents < moneyToCents(totais.valorTotal)) {
    return { data: null, error: new Error('O valor pago não confere com o total da venda.') };
  }

  const rpcPayload = {
    clienteId: payload.clienteId ?? null,
    vendedorId: payload.vendedorId ?? operadorId ?? null,
    status: payload.status ?? 'concluido',
    dataVenda: payload.dataVenda,
    observacoes: payload.observacoes,
    tipoVenda: payload.tipoVenda,
    descontoGlobal: totais.valorDesconto,
    acrescimoManual: payload.acrescimoManual ?? 0,
    itens,
    pagamentos,
  };

  const { data, error } = await supabase.rpc('criar_venda_pdv', {
    p_loja_id: lojaId,
    p_payload: rpcPayload,
    p_operador_id: operadorId ?? null,
  });

  if (error) {
    const rpcMissing =
      error.code === '42883'
      || error.message?.includes('criar_venda_pdv')
      || error.message?.includes('valor_troco');

    if (rpcMissing) {
      return createVendaLegacy(lojaId, payload, operadorId);
    }

    return { data: null, error: new Error(error.message ?? 'Não foi possível finalizar a venda.') };
  }

  if (payload.orcamentoId && data?.id) {
    await marcarOrcamentoConvertido(lojaId, payload.orcamentoId, data.id);
  }

  return {
    data: {
      id: data.id,
      codigo: data.codigo,
      valor_total: data.valor_total,
      valor_troco: data.valor_troco,
    },
    error: null,
  };
}

export async function cancelarVenda(lojaId, vendaId, operadorId) {
  const { data: venda, error: fetchError } = await getVendaById(lojaId, vendaId);

  if (fetchError || !venda) {
    return { error: fetchError ?? new Error('Venda não encontrada.') };
  }

  if (venda.status === 'cancelada') {
    return { error: new Error('Esta venda já está cancelada.') };
  }

  if (venda.status === 'concluido') {
    await cancelarReceitasVenda(lojaId, vendaId);
  }

  if (venda.estoque_baixado) {
    for (const item of venda.itens ?? []) {
      if (!item.produto_id || !item.baixou_estoque) continue;

      const { error: movError } = await registrarMovimentacao(lojaId, {
        produtoId: item.produto_id,
        tipo: 'entrada',
        quantidade: item.quantidade,
        origem: 'estorno',
        referenciaId: venda.id,
        motivo: `Estorno venda ${venda.codigo} — ${item.descricao}`,
        operadorId,
      });

      if (movError) {
        return { error: movError };
      }
    }
  }

  return supabase
    .from('vendas')
    .update({ status: 'cancelada', estoque_baixado: false })
    .eq('loja_id', lojaId)
    .eq('id', vendaId);
}

export async function concluirPreVenda(lojaId, vendaId, operadorId) {
  const { data: venda, error: fetchError } = await getVendaById(lojaId, vendaId);

  if (fetchError || !venda) {
    return { error: fetchError ?? new Error('Venda não encontrada.') };
  }

  if (venda.status !== 'pre_venda') {
    return { error: new Error('Somente pré-vendas podem ser concluídas por esta ação.') };
  }

  const { data: config } = await getLojaConfig(lojaId);
  const itensParaValidar = (venda.itens ?? []).map((item) => ({
    produtoId: item.produto_id,
    quantidade: item.quantidade,
  }));

  const { error: estoqueError } = await validarEstoqueVenda(
    lojaId,
    itensParaValidar,
    permiteVendaSemEstoque(config)
  );
  if (estoqueError) {
    return { error: estoqueError };
  }

  const { error: baixaError } = await baixarEstoqueVenda(lojaId, venda, venda.itens ?? [], operadorId);
  if (baixaError) {
    return { error: baixaError };
  }

  await gerarReceitasVenda(lojaId, vendaId);

  return supabase
    .from('vendas')
    .update({ status: 'concluido' })
    .eq('loja_id', lojaId)
    .eq('id', vendaId);
}

export function mapVendaToRecibo(venda) {
  return {
    id: venda.codigo,
    vendaId: venda.id,
    cliente: venda.cliente?.nome ?? 'Consumidor Final',
    cpf: venda.cliente?.cpf_cnpj ?? '',
    telefone: venda.cliente?.telefone ?? '',
    email: venda.cliente?.email ?? '',
    endereco: [venda.cliente?.logradouro, venda.cliente?.numero].filter(Boolean).join(', ') || '',
    cidade: venda.cliente?.cidade ?? '',
    uf: venda.cliente?.estado ?? '',
    data: venda.data_venda,
    vendedor: venda.vendedor?.nome ?? '—',
    valorTotal: venda.valor_total,
    valorTroco: venda.valor_troco ?? 0,
    produtos: (venda.itens ?? []).map((item) => ({
      id: item.id,
      descricao: item.descricao,
      imei: item.imei ?? '',
      qtd: item.quantidade,
      valorUnitario: item.valor_unitario,
      valorTotal: item.valor_total,
    })),
    pagamentos: (venda.pagamentos ?? []).map((pag) => ({
      forma: pag.forma_nome,
      detalhes: pag.detalhes ?? pag.parcelas ?? '',
      valor: pag.valor,
    })),
  };
}

export function resumoProdutoVenda(venda) {
  const itens = venda.itens ?? [];
  if (!itens.length) return '—';
  if (itens.length === 1) return itens[0].descricao ?? itens[0].produto?.nome ?? '—';
  const primeiro = itens[0].descricao ?? itens[0].produto?.nome ?? 'Item';
  return `${primeiro} +${itens.length - 1}`;
}
