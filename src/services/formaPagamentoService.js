import { supabase } from '../lib/supabaseClient';
import { parseMoney } from '../utils/formatters';

export const TIPO_UI_TO_DB = {
  PIX: 'pix',
  Dinheiro: 'dinheiro',
  Crédito: 'credito',
  Débito: 'debito',
  Boleto: 'boleto',
};

export const TIPO_DB_TO_UI = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  credito: 'Crédito',
  debito: 'Débito',
  boleto: 'Boleto',
  aparelho_troca: 'Aparelho (Troca)',
};

export const TIPOS_FORMA_UI = ['PIX', 'Dinheiro', 'Crédito', 'Débito', 'Boleto'];

export function formatFormaPagamentoLabel(forma) {
  const taxa = Number(forma.taxa_percentual ?? 0).toFixed(2);
  return `${forma.nome} (Taxa: ${taxa}%)`;
}

export function mapFormaPagamentoToUI(forma) {
  return {
    id: forma.id,
    nome: forma.nome,
    tipo: TIPO_DB_TO_UI[forma.tipo] ?? forma.tipo,
    tipoDb: forma.tipo,
    taxa: String(Number(forma.taxa_percentual ?? 0)),
    prazo: forma.prazo_descricao ?? '',
    ativo: forma.ativo !== false,
    ordemExibicao: forma.ordem_exibicao ?? 0,
    isSistema: forma.tipo === 'aparelho_troca',
  };
}

export function mapFormPagamentoToDb(form) {
  const tipoDb = form.tipoDb ?? TIPO_UI_TO_DB[form.tipo] ?? 'credito';

  return {
    nome: form.nome.trim(),
    tipo: tipoDb,
    taxa_percentual: parseMoney(form.taxa),
    prazo_descricao: form.prazo?.trim() || null,
    ativo: form.ativo !== false,
  };
}

/** Parcelas permitidas conforme tipo/nome da forma cadastrada */
export function opcoesParcelasPorForma(forma) {
  if (!forma) return ['À vista'];

  const tipo = forma.tipo ?? '';

  if (['pix', 'dinheiro', 'debito', 'aparelho_troca'].includes(tipo)) {
    return ['À vista'];
  }

  if (tipo === 'boleto') {
    return ['À vista'];
  }

  const match = String(forma.nome ?? '').match(/(\d+)\s*x/i);
  const maxParcelas = match ? Number(match[1]) : 12;
  const opcoes = ['À vista'];
  for (let i = 2; i <= maxParcelas; i += 1) {
    opcoes.push(`${i}x`);
  }
  return opcoes;
}

export function formaPermiteParcelamento(forma) {
  return opcoesParcelasPorForma(forma).length > 1;
}

/** Lista formas ativas — PDV, Financeiro, Orçamento */
export async function listFormasPagamento(lojaId) {
  return supabase
    .from('formas_pagamento')
    .select('id, nome, tipo, taxa_percentual, prazo_descricao, ordem_exibicao')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });
}

/** Lista todas as formas — tela de Configurações */
export async function listFormasPagamentoAdmin(lojaId) {
  return supabase
    .from('formas_pagamento')
    .select('id, nome, tipo, taxa_percentual, prazo_descricao, ativo, ordem_exibicao')
    .eq('loja_id', lojaId)
    .order('ordem_exibicao', { ascending: true });
}

async function getNextOrdemExibicao(lojaId) {
  const { data } = await supabase
    .from('formas_pagamento')
    .select('ordem_exibicao')
    .eq('loja_id', lojaId)
    .order('ordem_exibicao', { ascending: false })
    .limit(1);

  return (data?.[0]?.ordem_exibicao ?? 0) + 1;
}

export async function createFormaPagamento(lojaId, form) {
  if (!form.nome?.trim()) {
    return { data: null, error: new Error('Informe o nome da forma de pagamento.') };
  }

  const payload = mapFormPagamentoToDb(form);
  const ordem = await getNextOrdemExibicao(lojaId);

  return supabase
    .from('formas_pagamento')
    .insert({
      loja_id: lojaId,
      ...payload,
      ordem_exibicao: ordem,
    })
    .select('id, nome, tipo, taxa_percentual, prazo_descricao, ativo, ordem_exibicao')
    .single();
}

export async function updateFormaPagamento(lojaId, formaId, form) {
  if (!form.nome?.trim()) {
    return { data: null, error: new Error('Informe o nome da forma de pagamento.') };
  }

  const { data: existente, error: fetchError } = await supabase
    .from('formas_pagamento')
    .select('id, tipo')
    .eq('loja_id', lojaId)
    .eq('id', formaId)
    .single();

  if (fetchError || !existente) {
    return { data: null, error: fetchError ?? new Error('Forma de pagamento não encontrada.') };
  }

  const payload = mapFormPagamentoToDb({
    ...form,
    tipoDb: existente.tipo === 'aparelho_troca' ? 'aparelho_troca' : undefined,
  });

  if (existente.tipo === 'aparelho_troca') {
    payload.tipo = 'aparelho_troca';
    payload.taxa_percentual = 0;
  }

  return supabase
    .from('formas_pagamento')
    .update(payload)
    .eq('loja_id', lojaId)
    .eq('id', formaId)
    .select('id, nome, tipo, taxa_percentual, prazo_descricao, ativo, ordem_exibicao')
    .single();
}

export async function desativarFormaPagamento(lojaId, formaId) {
  const { data: existente, error: fetchError } = await supabase
    .from('formas_pagamento')
    .select('id, tipo, nome')
    .eq('loja_id', lojaId)
    .eq('id', formaId)
    .single();

  if (fetchError || !existente) {
    return { error: fetchError ?? new Error('Forma de pagamento não encontrada.') };
  }

  if (existente.tipo === 'aparelho_troca') {
    return { error: new Error('A forma "Aparelho Usado (Entrada)" é do sistema e não pode ser removida.') };
  }

  return supabase
    .from('formas_pagamento')
    .update({ ativo: false })
    .eq('loja_id', lojaId)
    .eq('id', formaId);
}

export async function reativarFormaPagamento(lojaId, formaId) {
  return supabase
    .from('formas_pagamento')
    .update({ ativo: true })
    .eq('loja_id', lojaId)
    .eq('id', formaId);
}
