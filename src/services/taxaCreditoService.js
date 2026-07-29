import { supabase } from '../lib/supabaseClient';
import { FORMA_SIM } from '../domain/orcamentoCalculos';

/** Taxas padrão (% por parcela) — fallback quando loja ainda não tem cadastro */
export const DEFAULT_TAXAS_CREDITO_PARCELA = {
  1: 3.5,
  2: 4.5,
  3: 5.0,
  4: 6.0,
  5: 7.0,
  6: 8.0,
  7: 9.0,
  8: 10.0,
  9: 11.0,
  10: 12.0,
  11: 13.0,
  12: 15.0,
};

export function mapTaxasCreditoRows(rows) {
  const map = { ...DEFAULT_TAXAS_CREDITO_PARCELA };

  for (const row of rows ?? []) {
    const parcelas = Number(row.parcelas);
    if (parcelas >= 1 && parcelas <= 12) {
      map[parcelas] = Number(row.taxa_percentual) || 0;
    }
  }

  return map;
}

export async function listTaxasCreditoParcela(lojaId) {
  const { data, error } = await supabase
    .from('taxas_credito_parcela')
    .select('parcelas, taxa_percentual')
    .eq('loja_id', lojaId)
    .order('parcelas', { ascending: true });

  if (error) {
    return { data: { ...DEFAULT_TAXAS_CREDITO_PARCELA }, error };
  }

  return {
    data: mapTaxasCreditoRows(data),
    error: null,
  };
}

/**
 * Resolve taxa percentual da simulação usando cadastro da loja.
 * Crédito: tabela por parcela | Débito: forma cadastrada | PIX: 0
 */
export function resolveTaxaPercentualSim({
  formaPagamentoSim,
  parcelas,
  formasPagamento = [],
  taxasCreditoParcela = DEFAULT_TAXAS_CREDITO_PARCELA,
}) {
  if (formaPagamentoSim === FORMA_SIM.PIX || !formaPagamentoSim) {
    return 0;
  }

  if (formaPagamentoSim === FORMA_SIM.DEBITO) {
    const debito = formasPagamento.find((f) => f.tipo === 'debito');
    return Number(debito?.taxa_percentual ?? 1.99);
  }

  if (formaPagamentoSim === FORMA_SIM.CREDITO) {
    const p = Math.max(1, Math.min(12, Number(parcelas) || 1));
    return Number(taxasCreditoParcela[p] ?? DEFAULT_TAXAS_CREDITO_PARCELA[p] ?? 0);
  }

  return 0;
}

export function opcoesParcelasCredito(taxasCreditoParcela = DEFAULT_TAXAS_CREDITO_PARCELA) {
  return Array.from({ length: 12 }, (_, index) => {
    const parcelas = index + 1;
    const taxa = Number(taxasCreditoParcela[parcelas] ?? DEFAULT_TAXAS_CREDITO_PARCELA[parcelas] ?? 0);
    return {
      parcelas,
      taxaPercentual: taxa,
      label: `${parcelas}x — Taxa: ${taxa.toFixed(1)}%`,
    };
  });
}

export function taxasMapToRows(lojaId, taxasMap) {
  return Array.from({ length: 12 }, (_, index) => {
    const parcelas = index + 1;
    return {
      loja_id: lojaId,
      parcelas,
      taxa_percentual: Number(taxasMap[parcelas] ?? DEFAULT_TAXAS_CREDITO_PARCELA[parcelas] ?? 0),
    };
  });
}

export async function saveTaxasCreditoParcela(lojaId, taxasMap) {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }

  const rows = taxasMapToRows(lojaId, taxasMap);

  return supabase
    .from('taxas_credito_parcela')
    .upsert(rows, { onConflict: 'loja_id,parcelas' })
    .select('parcelas, taxa_percentual');
}

export function cloneDefaultTaxas() {
  return { ...DEFAULT_TAXAS_CREDITO_PARCELA };
}
