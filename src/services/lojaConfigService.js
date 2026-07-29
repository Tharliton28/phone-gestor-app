import { supabase } from '../lib/supabaseClient';

const CONFIG_FIELDS = [
  'venda_sem_estoque',
  'alerta_estoque_baixo',
  'juros_automaticos',
  'resumo_email_diario',
  'orcamento_validade_dias',
];

export function mapConfigToToggles(config) {
  return {
    vendaSemEstoque: config?.venda_sem_estoque ?? false,
    alertaEstoque: config?.alerta_estoque_baixo ?? true,
    jurosAuto: config?.juros_automaticos ?? true,
    resumoEmail: config?.resumo_email_diario ?? true,
    orcamentoValidadeDias: config?.orcamento_validade_dias ?? 15,
  };
}

export function mapTogglesToConfig(toggles) {
  return {
    venda_sem_estoque: toggles.vendaSemEstoque,
    alerta_estoque_baixo: toggles.alertaEstoque,
    juros_automaticos: toggles.jurosAuto,
    resumo_email_diario: toggles.resumoEmail,
    orcamento_validade_dias: Number(toggles.orcamentoValidadeDias) || 15,
  };
}

export function getOrcamentoValidadeDias(config) {
  const dias = Number(config?.orcamento_validade_dias);
  return Number.isFinite(dias) && dias >= 1 ? dias : 15;
}

/** Usado pelo PDV: retorna se a loja permite concluir venda com saldo insuficiente. */
export function permiteVendaSemEstoque(config) {
  return Boolean(config?.venda_sem_estoque);
}

export async function getLojaConfig(lojaId) {
  return supabase
    .from('loja_configuracoes')
    .select(CONFIG_FIELDS.join(', '))
    .eq('loja_id', lojaId)
    .maybeSingle();
}

export async function updateLojaConfigToggles(lojaId, toggles) {
  return supabase
    .from('loja_configuracoes')
    .update(mapTogglesToConfig(toggles))
    .eq('loja_id', lojaId)
    .select(CONFIG_FIELDS.join(', '))
    .single();
}
