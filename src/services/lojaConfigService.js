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

export function mapConfigOs(config) {
  return {
    termoOS: config?.termo_os ?? null,
    termoOSSaida: config?.termo_os_saida ?? null,
    exigirTermoEntrada: config?.os_exigir_termo_entrada !== false,
    exigirFotoEntrada: config?.os_exigir_foto_entrada !== false,
    exigirTermoSaida: config?.os_exigir_termo_saida !== false,
    exigirFotoSaida: config?.os_exigir_foto_saida !== false,
    bloquearKanbanSemEntrada: config?.os_bloquear_kanban_sem_entrada !== false,
  };
}

export async function getLojaConfigAssistencia(lojaId) {
  return supabase
    .from('loja_configuracoes')
    .select(`
      termo_os, termo_os_saida, termo_garantia,
      os_exigir_termo_entrada, os_exigir_foto_entrada,
      os_exigir_termo_saida, os_exigir_foto_saida,
      os_bloquear_kanban_sem_entrada
    `)
    .eq('loja_id', lojaId)
    .maybeSingle();
}

export async function updateLojaConfigDocumentos(lojaId, documentos) {
  return supabase
    .from('loja_configuracoes')
    .update({
      termo_garantia: documentos.termoGarantia,
      termo_os: documentos.termoOS,
      termo_os_saida: documentos.termoOSSaida,
      os_exigir_termo_entrada: documentos.exigirTermoEntrada ?? true,
      os_exigir_foto_entrada: documentos.exigirFotoEntrada ?? true,
      os_exigir_termo_saida: documentos.exigirTermoSaida ?? true,
      os_exigir_foto_saida: documentos.exigirFotoSaida ?? true,
      os_bloquear_kanban_sem_entrada: documentos.bloquearKanbanSemEntrada ?? true,
    })
    .eq('loja_id', lojaId)
    .select('termo_garantia, termo_os, termo_os_saida')
    .single();
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

const FISCAL_FIELDS = [
  'nfe_ambiente',
  'nfe_serie',
  'nfe_ultimo_numero',
  'nfce_serie',
  'nfce_ultimo_numero',
  'fiscal_provider',
  'fiscal_emitir_nfce_auto',
  'certificado_storage_path',
];

export function mapConfigToFiscal(config) {
  return {
    nfeAmbiente: config?.nfe_ambiente ?? 'homologacao',
    nfeSerie: config?.nfe_serie ?? 1,
    nfeUltimoNumero: config?.nfe_ultimo_numero ?? 0,
    nfceSerie: config?.nfce_serie ?? 1,
    nfceUltimoNumero: config?.nfce_ultimo_numero ?? 0,
    fiscalProvider: config?.fiscal_provider ?? 'mock',
    emitirNfceAuto: Boolean(config?.fiscal_emitir_nfce_auto),
    certificadoPath: config?.certificado_storage_path ?? null,
  };
}

export function mapFiscalToConfig(fiscal) {
  return {
    nfe_ambiente: fiscal.nfeAmbiente === 'producao' ? 'producao' : 'homologacao',
    nfe_serie: Math.max(1, Number(fiscal.nfeSerie) || 1),
    nfce_serie: Math.max(1, Number(fiscal.nfceSerie) || 1),
    fiscal_provider: fiscal.fiscalProvider || 'mock',
    fiscal_emitir_nfce_auto: Boolean(fiscal.emitirNfceAuto),
  };
}

export async function getLojaConfigFiscal(lojaId) {
  return supabase
    .from('loja_configuracoes')
    .select(FISCAL_FIELDS.join(', '))
    .eq('loja_id', lojaId)
    .maybeSingle();
}

export async function updateLojaConfigFiscal(lojaId, fiscal) {
  return supabase
    .from('loja_configuracoes')
    .update(mapFiscalToConfig(fiscal))
    .eq('loja_id', lojaId)
    .select(FISCAL_FIELDS.join(', '))
    .single();
}

export async function getFocusTokenConfigurado(lojaId) {
  if (!lojaId) return { configurado: false, error: null };
  const { data, error } = await supabase.rpc('focus_nfe_token_configurado', { p_loja_id: lojaId });
  return { configurado: Boolean(data), error };
}

export async function salvarFocusNfeToken(lojaId, token) {
  const { data, error } = await supabase.rpc('salvar_focus_nfe_token', {
    p_loja_id: lojaId,
    p_token: token,
  });
  return { data, error };
}

export async function removerFocusNfeToken(lojaId) {
  const { data, error } = await supabase.rpc('remover_focus_nfe_token', { p_loja_id: lojaId });
  return { data, error };
}
