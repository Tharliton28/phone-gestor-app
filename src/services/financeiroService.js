import { supabase } from '../lib/supabaseClient';
import { parseMoney, roundMoney } from '../utils/formatters';

export const TIPO_LABEL = {
  receita: 'Receita',
  despesa: 'Despesa',
};

export const STATUS_LABEL = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export const STATUS_UI_RECEBER = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

export const STATUS_UI_PAGAR = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

function formatDataBR(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
}

function isAtrasado(lancamento) {
  if (!['pendente'].includes(lancamento.status)) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return lancamento.data_vencimento < hoje;
}

export function mapLancamentoToRow(lancamento, tipo) {
  const atrasado = isAtrasado(lancamento);
  let statusUi = tipo === 'receita'
    ? (STATUS_UI_RECEBER[lancamento.status] ?? lancamento.status)
    : (STATUS_UI_PAGAR[lancamento.status] ?? lancamento.status);

  if (atrasado) statusUi = 'Atrasado';

  return {
    id: lancamento.id,
    codigo: lancamento.codigo,
    descricao: lancamento.descricao,
    pessoa: lancamento.pessoa?.nome ?? '—',
    vencimento: formatDataBR(lancamento.data_vencimento),
    dataVencimento: lancamento.data_vencimento,
    valor: lancamento.valor,
    status: statusUi,
    statusDb: lancamento.status,
    forma: lancamento.forma_pagamento_nome ?? lancamento.forma_pagamento?.nome ?? '—',
    origem: lancamento.origem,
    vendaId: lancamento.venda_id,
    parcelaNum: lancamento.parcela_num,
    parcelaTotal: lancamento.parcela_total,
  };
}

export async function listLancamentos(lojaId, { tipo, busca = '', status = null } = {}) {
  let query = supabase
    .from('lancamentos_financeiros')
    .select(
      `
      id, codigo, tipo, status, descricao, valor, valor_liquidado,
      data_emissao, data_vencimento, data_liquidacao,
      forma_pagamento_nome, origem, venda_id, parcela_num, parcela_total,
      pessoa:pessoas (id, nome),
      forma_pagamento:formas_pagamento (id, nome, tipo),
      plano_conta:plano_contas (id, nome),
      conta_bancaria:contas_bancarias (id, nome)
    `
    )
    .eq('loja_id', lojaId)
    .neq('status', 'cancelado')
    .order('data_vencimento', { ascending: true });

  if (tipo) query = query.eq('tipo', tipo);
  if (busca?.trim()) {
    query = query.or(`descricao.ilike.%${busca.trim()}%,codigo.ilike.%${busca.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  let rows = (data ?? []).map((item) => mapLancamentoToRow(item, tipo));

  if (status && status !== 'Todos') {
    rows = rows.filter((row) => row.status === status);
  }

  return { data: rows, error: null };
}

export async function getResumoFinanceiro(lojaId, tipo) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesIso = inicioMes.toISOString().slice(0, 10);

  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() + 7);
  const seteDiasIso = seteDias.toISOString().slice(0, 10);

  const hoje = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('lancamentos_financeiros')
    .select('valor, status, data_vencimento, tipo')
    .eq('loja_id', lojaId)
    .eq('tipo', tipo)
    .neq('status', 'cancelado');

  if (error) return { data: null, error };

  const liquidadoStatus = tipo === 'receita' ? 'recebido' : 'pago';

  let totalMes = 0;
  let pendentes7d = 0;
  let atrasados = 0;

  for (const item of data ?? []) {
    const pendente = item.status === 'pendente';
    const noMes = item.data_vencimento >= inicioMesIso;

    if (pendente && noMes) totalMes += Number(item.valor) || 0;
    if (pendente && item.data_vencimento <= seteDiasIso && item.data_vencimento >= hoje) {
      pendentes7d += Number(item.valor) || 0;
    }
    if (pendente && item.data_vencimento < hoje) {
      atrasados += Number(item.valor) || 0;
    }

    if (item.status === liquidadoStatus && item.data_vencimento >= inicioMesIso) {
      totalMes += Number(item.valor) || 0;
    }
  }

  return {
    data: {
      totalMes: roundMoney(totalMes),
      pendentes7d: roundMoney(pendentes7d),
      atrasados: roundMoney(atrasados),
    },
    error: null,
  };
}

export async function listPlanoContas(lojaId, tipo) {
  return supabase
    .from('plano_contas')
    .select('id, nome, tipo')
    .eq('loja_id', lojaId)
    .eq('tipo', tipo)
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });
}

export async function listContasBancarias(lojaId) {
  return supabase
    .from('contas_bancarias')
    .select('id, nome')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });
}

export async function listFormasPagamentoFinanceiro(lojaId) {
  return supabase
    .from('formas_pagamento')
    .select('id, nome, tipo')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('ordem_exibicao', { ascending: true });
}

export async function createLancamento(lojaId, payload) {
  const tipo = payload.tipo ?? 'despesa';
  const valor = roundMoney(parseMoney(payload.valor));
  const status = payload.status ?? 'pendente';
  const valorLiquidado = ['recebido', 'pago'].includes(status) ? valor : 0;

  const { data: codigo, error: codigoError } = await supabase.rpc('next_lancamento_codigo', {
    p_loja_id: lojaId,
    p_tipo: tipo,
  });

  if (codigoError) {
    return { data: null, error: codigoError };
  }

  return supabase
    .from('lancamentos_financeiros')
    .insert({
      loja_id: lojaId,
      codigo: codigo ?? `${tipo === 'receita' ? 'REC' : 'PAG'}-0001`,
      tipo,
      status,
      descricao: payload.descricao?.trim(),
      valor,
      valor_liquidado: valorLiquidado,
      pessoa_id: payload.pessoaId || null,
      plano_conta_id: payload.planoContaId || null,
      conta_bancaria_id: payload.contaBancariaId || null,
      forma_pagamento_id: payload.formaPagamentoId || null,
      forma_pagamento_nome: payload.formaPagamentoNome || null,
      data_emissao: payload.dataEmissao || undefined,
      data_vencimento: payload.dataVencimento,
      data_liquidacao: ['recebido', 'pago'].includes(status) ? (payload.dataLiquidacao || payload.dataVencimento) : null,
      numero_documento: payload.numeroDocumento?.trim() || null,
      observacoes: payload.observacoes?.trim() || null,
      origem: 'manual',
    })
    .select()
    .single();
}

export async function darBaixaLancamento(lojaId, lancamentoId, { dataLiquidacao = null } = {}) {
  const { data: lancamento, error: fetchError } = await supabase
    .from('lancamentos_financeiros')
    .select('id, tipo, valor, status')
    .eq('loja_id', lojaId)
    .eq('id', lancamentoId)
    .single();

  if (fetchError || !lancamento) {
    return { error: fetchError ?? new Error('Lançamento não encontrado.') };
  }

  if (lancamento.status !== 'pendente') {
    return { error: new Error('Somente títulos pendentes podem receber baixa.') };
  }

  const novoStatus = lancamento.tipo === 'receita' ? 'recebido' : 'pago';
  const liquidacao = dataLiquidacao || new Date().toISOString().slice(0, 10);

  return supabase
    .from('lancamentos_financeiros')
    .update({
      status: novoStatus,
      valor_liquidado: lancamento.valor,
      data_liquidacao: liquidacao,
    })
    .eq('loja_id', lojaId)
    .eq('id', lancamentoId);
}

export async function cancelarLancamento(lojaId, lancamentoId) {
  return supabase
    .from('lancamentos_financeiros')
    .update({ status: 'cancelado' })
    .eq('loja_id', lojaId)
    .eq('id', lancamentoId);
}

export async function gerarReceitasVenda(lojaId, vendaId) {
  return supabase.rpc('fin_gerar_receitas_venda', {
    p_loja_id: lojaId,
    p_venda_id: vendaId,
  });
}

export async function cancelarReceitasVenda(lojaId, vendaId) {
  return supabase.rpc('fin_cancelar_receitas_venda', {
    p_loja_id: lojaId,
    p_venda_id: vendaId,
  });
}
