import { supabase } from '../lib/supabaseClient';
import { registrarMovimentacao } from './movimentacaoService';

export const ITEM_STATUS_LABEL = {
  ok: 'OK',
  faltando: 'Faltando',
  sobrando: 'Sobrando',
};

async function getNextInventarioCodigo(lojaId) {
  const { data: rows, error } = await supabase
    .from('inventario_sessoes')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return { codigo: null, error };
  }

  const last = rows?.[0]?.codigo;
  const seq = last ? Number(String(last).replace(/^INV-/, '')) || 0 : 0;

  return { codigo: `INV-${String(seq + 1).padStart(4, '0')}`, error: null };
}

export async function getSessaoAberta(lojaId) {
  return supabase
    .from('inventario_sessoes')
    .select('id, codigo, status, iniciado_em, observacoes')
    .eq('loja_id', lojaId)
    .eq('status', 'aberto')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getItensInventario(lojaId, sessaoId) {
  return supabase
    .from('inventario_itens')
    .select(
      `
      id, produto_id, quantidade_sistema, quantidade_contada, divergencia, status,
      produto:produtos (id, codigo, nome, tipo, categoria)
    `
    )
    .eq('loja_id', lojaId)
    .eq('inventario_sessao_id', sessaoId)
    .order('created_at', { ascending: true });
}

export async function iniciarInventario(lojaId, responsavelId) {
  const { data: sessaoAberta } = await getSessaoAberta(lojaId);
  if (sessaoAberta) {
    return { data: sessaoAberta, error: new Error('Já existe um inventário aberto. Finalize ou cancele antes de iniciar outro.') };
  }

  const { data: produtos, error: produtosError } = await supabase
    .from('produtos')
    .select('id, quantidade_atual')
    .eq('loja_id', lojaId)
    .neq('status', 'inativo');

  if (produtosError) {
    return { data: null, error: produtosError };
  }

  if (!produtos?.length) {
    return { data: null, error: new Error('Não há produtos ativos para inventariar.') };
  }

  const { codigo, error: codigoError } = await getNextInventarioCodigo(lojaId);
  if (codigoError) {
    return { data: null, error: codigoError };
  }

  const { data: sessao, error: sessaoError } = await supabase
    .from('inventario_sessoes')
    .insert({
      loja_id: lojaId,
      codigo,
      status: 'aberto',
      responsavel_id: responsavelId || null,
    })
    .select()
    .single();

  if (sessaoError) {
    return { data: null, error: sessaoError };
  }

  const itensPayload = produtos.map((produto) => ({
    loja_id: lojaId,
    inventario_sessao_id: sessao.id,
    produto_id: produto.id,
    quantidade_sistema: produto.quantidade_atual,
    quantidade_contada: produto.quantidade_atual,
  }));

  const { error: itensError } = await supabase.from('inventario_itens').insert(itensPayload);

  if (itensError) {
    return { data: null, error: itensError };
  }

  return { data: sessao, error: null };
}

export async function updateContagemItem(lojaId, itemId, quantidadeContada) {
  return supabase
    .from('inventario_itens')
    .update({ quantidade_contada: Number(quantidadeContada) })
    .eq('loja_id', lojaId)
    .eq('id', itemId)
    .select()
    .single();
}

export async function finalizarInventario(lojaId, sessaoId, operadorId) {
  const { data: sessao, error: sessaoError } = await supabase
    .from('inventario_sessoes')
    .select('id, codigo, status')
    .eq('loja_id', lojaId)
    .eq('id', sessaoId)
    .single();

  if (sessaoError || !sessao) {
    return { error: sessaoError ?? new Error('Sessão de inventário não encontrada.') };
  }

  if (sessao.status !== 'aberto') {
    return { error: new Error('Este inventário já foi finalizado.') };
  }

  const { data: itens, error: itensError } = await getItensInventario(lojaId, sessaoId);

  if (itensError) {
    return { error: itensError };
  }

  for (const item of itens ?? []) {
    if (item.quantidade_contada == null) {
      return { error: new Error(`Informe a contagem física de "${item.produto?.nome ?? 'produto'}".`) };
    }

    const divergencia = item.quantidade_contada - item.quantidade_sistema;
    if (divergencia === 0) continue;

    const { error: movError } = await registrarMovimentacao(lojaId, {
      produtoId: item.produto_id,
      tipo: 'ajuste',
      quantidade: divergencia,
      origem: 'inventario',
      referenciaId: sessao.id,
      motivo: `Inventário ${sessao.codigo}`,
      operadorId,
    });

    if (movError) {
      return { error: movError };
    }
  }

  return supabase
    .from('inventario_sessoes')
    .update({ status: 'finalizado', finalizado_em: new Date().toISOString() })
    .eq('loja_id', lojaId)
    .eq('id', sessaoId);
}
