import { supabase } from '../lib/supabaseClient';

export const TIPO_LABEL = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
};

export const ORIGEM_LABEL = {
  manual: 'Ajuste Manual',
  venda: 'Venda',
  ordem_compra: 'Ordem de Compra',
  inventario: 'Inventário',
  devolucao: 'Devolução',
  estorno: 'Estorno',
  troca: 'Troca',
};

async function getNextMovimentacaoCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_movimentacao_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  const { data: rows, error: queryError } = await supabase
    .from('movimentacoes_estoque')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  const last = rows?.[0]?.codigo;
  const seq = last ? Number(String(last).replace(/^MOV-/, '')) || 0 : 0;

  return { codigo: `MOV-${String(seq + 1).padStart(4, '0')}`, error: null };
}

export async function listMovimentacoes(lojaId) {
  return supabase
    .from('movimentacoes_estoque')
    .select(
      `
      id, codigo, tipo, quantidade, quantidade_anterior, quantidade_posterior,
      motivo, origem, estornado, created_at,
      produto:produtos (id, nome, codigo),
      operador:usuarios!movimentacoes_estoque_operador_id_fkey (id, nome)
    `
    )
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });
}

export async function registrarMovimentacao(
  lojaId,
  { produtoId, tipo, quantidade, origem = 'manual', motivo, referenciaId, operadorId }
) {
  const { data: produto, error: prodError } = await supabase
    .from('produtos')
    .select('id, quantidade_atual')
    .eq('loja_id', lojaId)
    .eq('id', produtoId)
    .single();

  if (prodError || !produto) {
    return { data: null, error: prodError ?? new Error('Produto não encontrado.') };
  }

  let qtd = Number(quantidade);
  if (!qtd) {
    return { data: null, error: new Error('Informe uma quantidade válida.') };
  }

  if (tipo === 'entrada') {
    qtd = Math.abs(qtd);
  } else if (tipo === 'saida') {
    qtd = -Math.abs(qtd);
  }

  const anterior = produto.quantidade_atual;
  const posterior = anterior + qtd;

  const { codigo, error: codigoError } = await getNextMovimentacaoCodigo(lojaId);
  if (codigoError) {
    return { data: null, error: codigoError };
  }

  const { data: movimentacao, error: insertError } = await supabase
    .from('movimentacoes_estoque')
    .insert({
      loja_id: lojaId,
      codigo,
      produto_id: produtoId,
      tipo,
      quantidade: qtd,
      quantidade_anterior: anterior,
      quantidade_posterior: posterior,
      origem,
      motivo: motivo?.trim() || null,
      referencia_id: referenciaId || null,
      operador_id: operadorId || null,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError };
  }

  const { error: updateError } = await supabase
    .from('produtos')
    .update({ quantidade_atual: posterior })
    .eq('loja_id', lojaId)
    .eq('id', produtoId);

  if (updateError) {
    return { data: null, error: updateError };
  }

  return { data: movimentacao, error: null };
}

export async function createMovimentacaoManual(
  lojaId,
  { produtoId, tipo, quantidade, motivo, operadorId }
) {
  return registrarMovimentacao(lojaId, {
    produtoId,
    tipo,
    quantidade,
    origem: 'manual',
    motivo,
    operadorId,
  });
}

export async function estornarMovimentacao(lojaId, movimentacaoId, operadorId) {
  const { data: movimentacao, error: fetchError } = await supabase
    .from('movimentacoes_estoque')
    .select('id, produto_id, quantidade, estornado')
    .eq('loja_id', lojaId)
    .eq('id', movimentacaoId)
    .single();

  if (fetchError || !movimentacao) {
    return { error: fetchError ?? new Error('Movimentação não encontrada.') };
  }

  if (movimentacao.estornado) {
    return { error: new Error('Esta movimentação já foi estornada.') };
  }

  const { data: produto, error: prodError } = await supabase
    .from('produtos')
    .select('quantidade_atual')
    .eq('loja_id', lojaId)
    .eq('id', movimentacao.produto_id)
    .single();

  if (prodError) {
    return { error: prodError };
  }

  const novaQuantidade = produto.quantidade_atual - movimentacao.quantidade;

  const { error: updateProdError } = await supabase
    .from('produtos')
    .update({ quantidade_atual: novaQuantidade })
    .eq('loja_id', lojaId)
    .eq('id', movimentacao.produto_id);

  if (updateProdError) {
    return { error: updateProdError };
  }

  return supabase
    .from('movimentacoes_estoque')
    .update({
      estornado: true,
      estornado_em: new Date().toISOString(),
      estornado_por: operadorId || null,
    })
    .eq('loja_id', lojaId)
    .eq('id', movimentacaoId);
}
