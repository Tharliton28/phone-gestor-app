import { supabase } from '../lib/supabaseClient';
import { CUSTO_CREDITOS, getPacoteCreditos } from '../domain/lojaCreditos';
import { emitirCreditosAtualizados } from '../utils/creditosEvents';

async function mensagemErroFunction(error, data) {
  if (data?.error) return String(data.error);
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    /* ignore */
  }
  return error?.message || 'Falha ao iniciar checkout de créditos.';
}

export async function getSaldoCreditos(lojaId) {
  if (!lojaId) return { saldo: 0, error: new Error('Loja não informada.') };

  const { data, error } = await supabase.rpc('obter_loja_creditos', { p_loja_id: lojaId });
  if (error) return { saldo: 0, error };

  return {
    saldo: data?.saldo ?? 0,
    updatedAt: data?.updated_at ?? null,
    error: null,
  };
}

export async function listLancamentosCreditos(lojaId, limit = 50) {
  if (!lojaId) return { data: [], error: new Error('Loja não informada.') };

  const { data, error } = await supabase.rpc('listar_loja_credito_lancamentos', {
    p_loja_id: lojaId,
    p_limit: limit,
  });

  return { data: data ?? [], error };
}

export async function listCustosCreditos() {
  const { data, error } = await supabase
    .from('loja_credito_custos')
    .select('acao, creditos, label, ativo')
    .eq('ativo', true)
    .order('creditos', { ascending: true });

  if (error || !data?.length) {
    return {
      data: Object.entries(CUSTO_CREDITOS).map(([acao, item]) => ({
        acao,
        creditos: item.creditos,
        label: item.label,
        ativo: true,
      })),
      error: error ?? null,
    };
  }

  return { data, error: null };
}

/**
 * Consome créditos só após sucesso da operação paga (NF/consulta).
 * Retorna erro se saldo insuficiente.
 */
export async function consumirCreditos({
  lojaId,
  acao,
  quantidade = null,
  descricao = null,
  referenciaTipo = null,
  referenciaId = null,
}) {
  const { data, error } = await supabase.rpc('consumir_loja_creditos', {
    p_loja_id: lojaId,
    p_acao: acao,
    p_quantidade: quantidade,
    p_descricao: descricao,
    p_referencia_tipo: referenciaTipo,
    p_referencia_id: referenciaId,
  });

  if (error) return { ok: false, saldo: null, consumido: 0, error };
  if (typeof data?.saldo === 'number') emitirCreditosAtualizados(data.saldo);
  return {
    ok: true,
    saldo: data?.saldo ?? null,
    consumido: data?.consumido ?? 0,
    error: null,
  };
}

export async function creditarCreditos({
  lojaId,
  quantidade,
  acao = 'compra_pacote',
  descricao = null,
}) {
  const { data, error } = await supabase.rpc('creditar_loja_creditos', {
    p_loja_id: lojaId,
    p_quantidade: quantidade,
    p_acao: acao,
    p_descricao: descricao,
  });

  if (error) return { ok: false, saldo: null, creditado: 0, error };
  if (typeof data?.saldo === 'number') emitirCreditosAtualizados(data.saldo);
  return {
    ok: true,
    saldo: data?.saldo ?? null,
    creditado: data?.creditado ?? quantidade,
    error: null,
  };
}

/** Cria cobrança avulsa no Asaas e devolve link da fatura. */
export async function criarCheckoutCreditosAsaas(lojaId, pacoteId) {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }
  if (!getPacoteCreditos(pacoteId)) {
    return { data: null, error: new Error('Pacote inválido.') };
  }

  const { data, error } = await supabase.functions.invoke('criar-checkout-creditos-asaas', {
    body: { loja_id: lojaId, pacote_id: pacoteId },
  });

  if (error) {
    return { data: null, error: new Error(await mensagemErroFunction(error, data)) };
  }
  if (data?.error) {
    return { data: null, error: new Error(data.error) };
  }
  if (!data?.invoice_url) {
    return {
      data: null,
      error: new Error('Checkout criado, mas o link de pagamento não veio do Asaas.'),
    };
  }

  return { data, error: null };
}
