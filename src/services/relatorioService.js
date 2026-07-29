import { supabase } from '../lib/supabaseClient';
import { expirarOrcamentosVencidos } from './orcamentoService';
import {
  calcFunilOrcamentos,
  calcResumoTaxas,
  calcResumoVendas,
  calcVendasPorVendedor,
} from '../domain/relatorioCalculos';

export async function fetchVendasRelatorio(lojaId, { dataInicio, dataFim }) {
  let query = supabase
    .from('vendas')
    .select(`
      id, codigo, status, valor_total, data_venda,
      vendedor:usuarios!vendas_vendedor_id_fkey (id, nome),
      pagamentos:venda_pagamentos (
        valor, valor_base, valor_taxa, taxa_percentual, taxa_repassada, forma_nome
      )
    `)
    .eq('loja_id', lojaId)
    .gte('data_venda', dataInicio)
    .lte('data_venda', dataFim)
    .order('data_venda', { ascending: false });

  return query;
}

export async function fetchOrcamentosRelatorio(lojaId, { dataInicio, dataFim }) {
  await expirarOrcamentosVencidos(lojaId);

  return supabase
    .from('orcamentos')
    .select('id, status, valor_total, data_emissao, codigo')
    .eq('loja_id', lojaId)
    .gte('data_emissao', dataInicio)
    .lte('data_emissao', dataFim);
}

export async function getRelatorioVendas(lojaId, periodo) {
  const { data, error } = await fetchVendasRelatorio(lojaId, periodo);

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      resumo: calcResumoVendas(data),
      porVendedor: calcVendasPorVendedor(data),
      vendas: data ?? [],
    },
    error: null,
  };
}

export async function getRelatorioTaxas(lojaId, periodo) {
  const { data, error } = await fetchVendasRelatorio(lojaId, periodo);

  if (error) {
    return { data: null, error };
  }

  return {
    data: calcResumoTaxas(data),
    error: null,
  };
}

export async function getRelatorioFunilOrcamentos(lojaId, periodo) {
  const { data, error } = await fetchOrcamentosRelatorio(lojaId, periodo);

  if (error) {
    return { data: null, error };
  }

  return {
    data: calcFunilOrcamentos(data ?? []),
    error: null,
  };
}

export async function getRelatoriosDashboard(lojaId, periodo) {
  const [vendasResult, taxasResult, funilResult] = await Promise.all([
    getRelatorioVendas(lojaId, periodo),
    getRelatorioTaxas(lojaId, periodo),
    getRelatorioFunilOrcamentos(lojaId, periodo),
  ]);

  const error = vendasResult.error ?? taxasResult.error ?? funilResult.error;

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      vendas: vendasResult.data,
      taxas: taxasResult.data,
      funil: funilResult.data,
    },
    error: null,
  };
}
