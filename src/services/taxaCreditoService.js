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

export function mapTaxasCreditoRows(rows, fallback = DEFAULT_TAXAS_CREDITO_PARCELA) {
  const map = { ...fallback };

  for (const row of rows ?? []) {
    const parcelas = Number(row.parcelas);
    if (parcelas >= 1 && parcelas <= 12) {
      map[parcelas] = Number(row.taxa_percentual) || 0;
    }
  }

  return map;
}

async function fetchTaxasRows(lojaId, formaPagamentoId = null) {
  let query = supabase
    .from('taxas_credito_parcela')
    .select('parcelas, taxa_percentual')
    .eq('loja_id', lojaId)
    .order('parcelas', { ascending: true });

  if (formaPagamentoId) {
    query = query.eq('forma_pagamento_id', formaPagamentoId);
  } else {
    query = query.is('forma_pagamento_id', null);
  }

  return query;
}

/**
 * Lista taxas 1x–12x.
 * formaPagamentoId null = padrão da loja.
 * Com formaPagamentoId = grade da maquininha, caindo no padrão da loja se vazia.
 */
export async function listTaxasCreditoParcela(lojaId, formaPagamentoId = null) {
  const { data: lojaRows, error: lojaError } = await fetchTaxasRows(lojaId, null);

  if (lojaError) {
    return { data: { ...DEFAULT_TAXAS_CREDITO_PARCELA }, error: lojaError };
  }

  const lojaMap = mapTaxasCreditoRows(lojaRows);

  if (!formaPagamentoId) {
    return { data: lojaMap, error: null };
  }

  const { data: formaRows, error: formaError } = await fetchTaxasRows(lojaId, formaPagamentoId);

  if (formaError) {
    return { data: lojaMap, error: formaError };
  }

  if (!formaRows?.length) {
    return { data: lojaMap, error: null };
  }

  return {
    data: mapTaxasCreditoRows(formaRows, lojaMap),
    error: null,
  };
}

export function listFormasCredito(formasPagamento = []) {
  return formasPagamento.filter((forma) => forma.tipo === 'credito');
}

/**
 * Resolve taxa percentual da simulação usando cadastro da loja/maquininha.
 * Crédito: tabela por parcela | Débito: forma cadastrada | PIX: 0
 */
export function resolveTaxaPercentualSim({
  formaPagamentoSim,
  parcelas,
  formasPagamento = [],
  taxasCreditoParcela = DEFAULT_TAXAS_CREDITO_PARCELA,
  formaPagamentoCreditoId = null,
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

    if (formaPagamentoCreditoId) {
      const forma = formasPagamento.find((f) => f.id === formaPagamentoCreditoId);
      if (forma && Number(forma.taxa_percentual) > 0 && p === 1) {
        return Number(forma.taxa_percentual);
      }
    }

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

export function taxasMapToRows(lojaId, taxasMap, formaPagamentoId = null) {
  return Array.from({ length: 12 }, (_, index) => {
    const parcelas = index + 1;
    return {
      loja_id: lojaId,
      forma_pagamento_id: formaPagamentoId,
      parcelas,
      taxa_percentual: Number(taxasMap[parcelas] ?? DEFAULT_TAXAS_CREDITO_PARCELA[parcelas] ?? 0),
    };
  });
}

export async function saveTaxasCreditoParcela(lojaId, taxasMap, formaPagamentoId = null) {
  if (!lojaId) {
    return { data: null, error: new Error('Loja não informada.') };
  }

  let deleteQuery = supabase
    .from('taxas_credito_parcela')
    .delete()
    .eq('loja_id', lojaId);

  if (formaPagamentoId) {
    deleteQuery = deleteQuery.eq('forma_pagamento_id', formaPagamentoId);
  } else {
    deleteQuery = deleteQuery.is('forma_pagamento_id', null);
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  const rows = taxasMapToRows(lojaId, taxasMap, formaPagamentoId);

  return supabase
    .from('taxas_credito_parcela')
    .insert(rows)
    .select('parcelas, taxa_percentual, forma_pagamento_id');
}

export function cloneDefaultTaxas() {
  return { ...DEFAULT_TAXAS_CREDITO_PARCELA };
}
