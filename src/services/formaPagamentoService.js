import { supabase } from '../lib/supabaseClient';

export function formatFormaPagamentoLabel(forma) {
  const taxa = Number(forma.taxa_percentual ?? 0).toFixed(2);
  return `${forma.nome} (Taxa: ${taxa}%)`;
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

export async function listFormasPagamento(lojaId) {
  return supabase
    .from('formas_pagamento')
    .select('id, nome, tipo, taxa_percentual, prazo_descricao, ordem_exibicao')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });
}
