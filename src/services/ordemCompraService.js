import { supabase } from '../lib/supabaseClient';
import { parseMoney } from '../utils/formatters';
import { registrarMovimentacao } from './movimentacaoService';

export const STATUS_LABEL = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

function calcItemTotal(quantidade, custoUnitario, desconto) {
  const total = Number(quantidade) * parseMoney(custoUnitario) - parseMoney(desconto);
  return Math.max(0, total);
}

function calcOrdemTotais(itens) {
  const valorSubtotal = itens.reduce(
    (acc, item) => acc + Number(item.quantidade) * parseMoney(item.custoUnitario),
    0
  );
  const valorDesconto = itens.reduce((acc, item) => acc + parseMoney(item.desconto), 0);
  return {
    valorSubtotal,
    valorDesconto,
    valorTotal: Math.max(0, valorSubtotal - valorDesconto),
  };
}

async function getNextOrdemCompraCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_ordem_compra_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  const { data: rows, error: queryError } = await supabase
    .from('ordens_compra')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  const last = rows?.[0]?.codigo;
  const seq = last ? Number(String(last).replace(/^OC-/, '')) || 0 : 0;

  return { codigo: `OC-${String(seq + 1).padStart(4, '0')}`, error: null };
}

export async function listOrdensCompra(lojaId) {
  return supabase
    .from('ordens_compra')
    .select(
      `
      id, codigo, data_emissao, previsao_entrega,
      valor_total, status, created_at,
      fornecedor:pessoas (id, nome)
    `
    )
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });
}

export async function getOrdemCompraById(lojaId, ordemCompraId) {
  return supabase
    .from('ordens_compra')
    .select(
      `
      *,
      fornecedor:pessoas (id, nome),
      itens:ordem_compra_itens (
        id, produto_id, descricao, quantidade, custo_unitario, desconto, valor_total,
        produto:produtos (id, nome, codigo)
      )
    `
    )
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId)
    .maybeSingle();
}

export async function createOrdemCompra(lojaId, payload, itens, compradorId) {
  if (!itens?.length) {
    return { data: null, error: new Error('Adicione pelo menos um item ao pedido.') };
  }

  const { codigo, error: codigoError } = await getNextOrdemCompraCodigo(lojaId);
  if (codigoError) {
    return { data: null, error: codigoError };
  }

  const totais = calcOrdemTotais(itens);

  const { data: ordem, error: ordemError } = await supabase
    .from('ordens_compra')
    .insert({
      loja_id: lojaId,
      codigo,
      fornecedor_id: payload.fornecedorId,
      condicao_pagamento: payload.condicaoPagamento || null,
      data_emissao: payload.dataEmissao || undefined,
      previsao_entrega: payload.previsaoEntrega || null,
      comprador_id: compradorId || null,
      valor_subtotal: totais.valorSubtotal,
      valor_desconto: totais.valorDesconto,
      valor_total: totais.valorTotal,
      observacoes: payload.observacoes?.trim() || null,
      status: 'pendente',
    })
    .select()
    .single();

  if (ordemError) {
    return { data: null, error: ordemError };
  }

  const itensPayload = itens.map((item) => ({
    loja_id: lojaId,
    ordem_compra_id: ordem.id,
    produto_id: item.produtoId,
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    custo_unitario: parseMoney(item.custoUnitario),
    desconto: parseMoney(item.desconto),
    valor_total: calcItemTotal(item.quantidade, item.custoUnitario, item.desconto),
  }));

  const { error: itensError } = await supabase.from('ordem_compra_itens').insert(itensPayload);

  if (itensError) {
    return { data: null, error: itensError };
  }

  return { data: ordem, error: null };
}

export async function updateOrdemCompra(lojaId, ordemCompraId, payload, itens) {
  const { data: existente, error: fetchError } = await supabase
    .from('ordens_compra')
    .select('id, status')
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId)
    .single();

  if (fetchError || !existente) {
    return { data: null, error: fetchError ?? new Error('Ordem de compra não encontrada.') };
  }

  if (existente.status !== 'pendente') {
    return { data: null, error: new Error('Somente ordens pendentes podem ser editadas.') };
  }

  if (!itens?.length) {
    return { data: null, error: new Error('Adicione pelo menos um item ao pedido.') };
  }

  const totais = calcOrdemTotais(itens);

  const { data: ordem, error: updateError } = await supabase
    .from('ordens_compra')
    .update({
      fornecedor_id: payload.fornecedorId,
      condicao_pagamento: payload.condicaoPagamento || null,
      data_emissao: payload.dataEmissao || undefined,
      previsao_entrega: payload.previsaoEntrega || null,
      valor_subtotal: totais.valorSubtotal,
      valor_desconto: totais.valorDesconto,
      valor_total: totais.valorTotal,
      observacoes: payload.observacoes?.trim() || null,
    })
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  const { error: deleteError } = await supabase
    .from('ordem_compra_itens')
    .delete()
    .eq('loja_id', lojaId)
    .eq('ordem_compra_id', ordemCompraId);

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  const itensPayload = itens.map((item) => ({
    loja_id: lojaId,
    ordem_compra_id: ordemCompraId,
    produto_id: item.produtoId,
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    custo_unitario: parseMoney(item.custoUnitario),
    desconto: parseMoney(item.desconto),
    valor_total: calcItemTotal(item.quantidade, item.custoUnitario, item.desconto),
  }));

  const { error: itensError } = await supabase.from('ordem_compra_itens').insert(itensPayload);

  if (itensError) {
    return { data: null, error: itensError };
  }

  return { data: ordem, error: null };
}

export async function cancelarOrdemCompra(lojaId, ordemCompraId) {
  const { data: ordem, error: fetchError } = await supabase
    .from('ordens_compra')
    .select('id, status')
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId)
    .single();

  if (fetchError || !ordem) {
    return { error: fetchError ?? new Error('Ordem de compra não encontrada.') };
  }

  if (ordem.status !== 'pendente') {
    return { error: new Error('Somente ordens pendentes podem ser canceladas.') };
  }

  return supabase
    .from('ordens_compra')
    .update({ status: 'cancelado' })
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId);
}

export async function receberOrdemCompra(lojaId, ordemCompraId, operadorId) {
  const { data: ordem, error: fetchError } = await supabase
    .from('ordens_compra')
    .select('id, codigo, status')
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId)
    .single();

  if (fetchError || !ordem) {
    return { error: fetchError ?? new Error('Ordem de compra não encontrada.') };
  }

  if (ordem.status !== 'pendente') {
    return { error: new Error('Esta ordem já foi recebida ou cancelada.') };
  }

  const { data: itens, error: itensError } = await supabase
    .from('ordem_compra_itens')
    .select('id, produto_id, quantidade, descricao')
    .eq('loja_id', lojaId)
    .eq('ordem_compra_id', ordemCompraId);

  if (itensError) {
    return { error: itensError };
  }

  const itensSemProduto = (itens ?? []).filter((item) => !item.produto_id);
  if (itensSemProduto.length > 0) {
    return { error: new Error('Todos os itens precisam estar vinculados a um produto do estoque.') };
  }

  for (const item of itens ?? []) {
    const { error: movError } = await registrarMovimentacao(lojaId, {
      produtoId: item.produto_id,
      tipo: 'entrada',
      quantidade: item.quantidade,
      origem: 'ordem_compra',
      referenciaId: ordem.id,
      motivo: `Ordem de Compra ${ordem.codigo}`,
      operadorId,
    });

    if (movError) {
      return { error: movError };
    }
  }

  return supabase
    .from('ordens_compra')
    .update({ status: 'recebido' })
    .eq('loja_id', lojaId)
    .eq('id', ordemCompraId);
}

export { calcItemTotal, calcOrdemTotais };
