import { supabase } from '../lib/supabaseClient';
import { entitlementsDoPlano, normalizarPlano } from '../domain/lojaPlanos';

export async function getLojaEntitlements(lojaId) {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }

  const { data, error } = await supabase.rpc('loja_entitlements', {
    p_loja_id: lojaId,
  });

  if (error) return { data: null, error };

  if (!data?.ok) {
    return {
      data: null,
      error: new Error(data?.error || 'Não foi possível carregar o plano.'),
    };
  }

  const mapped = {
    ...entitlementsDoPlano(data.plano, data.assinatura_status, {
      usuariosAtivos: data.usuarios_ativos,
      expiraEm: data.assinatura_expira_em,
    }),
    assinaturaOrigem: data.assinatura_origem,
    assinaturaExpiraEm: data.assinatura_expira_em ?? null,
    planoAtualizadoEm: data.plano_atualizado_em,
    // Prefer values from SQL (source of truth)
    maxUsuarios: data.max_usuarios,
    usuariosAtivos: data.usuarios_ativos,
    podeAdicionarUsuario: data.pode_adicionar_usuario,
    podeNfce: data.pode_nfce,
    podeConsultas: data.pode_consultas,
    podeMultiLoja: data.pode_multi_loja,
    assinaturaAtiva: data.assinatura_ativa,
  };

  return { data: mapped, error: null };
}

export async function atualizarPlanoLoja(lojaId, plano, status = 'ativa') {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }

  const planoOk = normalizarPlano(plano);
  const { data, error } = await supabase.rpc('atualizar_plano_loja', {
    p_loja_id: lojaId,
    p_plano: planoOk,
    p_status: status,
  });

  if (error) return { data: null, error };

  return getLojaEntitlements(lojaId).then((r) => ({
    data: r.data,
    error: r.error,
    raw: data,
  }));
}

async function mensagemErroFunction(error, data) {
  if (data?.error) return String(data.error);

  // supabase-js: em non-2xx o corpo costuma vir em error.context (Response)
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

  return error?.message || 'Falha ao iniciar checkout.';
}

/** Cria assinatura no Asaas e devolve link da fatura (PIX/boleto/cartão). */
export async function criarCheckoutAsaas(lojaId, plano) {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }

  const { data, error } = await supabase.functions.invoke('criar-checkout-asaas', {
    body: { loja_id: lojaId, plano: normalizarPlano(plano) },
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
