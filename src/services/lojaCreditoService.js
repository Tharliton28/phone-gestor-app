import { supabase } from '../lib/supabaseClient';
import { CUSTO_CREDITOS } from '../domain/lojaCreditos';
import { emitirCreditosAtualizados } from '../utils/creditosEvents';

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
