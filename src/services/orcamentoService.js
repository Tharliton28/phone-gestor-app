import { supabase } from '../lib/supabaseClient';
import { parseMoney, roundMoney } from '../utils/formatters';
import { formatFormaPagamentoLabel } from './formaPagamentoService';
import {
  buildPagamentosPdvFromOrcamento,
  calcItemLinhaOrcamento,
  calcSimulacaoOrcamento,
  calcTotaisItensOrcamento,
  simulacaoFromOrcamentoPersistido,
} from '../domain/orcamentoCalculos';
import {
  isDataValidadeExpirada,
  podeAprovarOrcamento,
  podeConverterOrcamento,
  podeEditarOrcamento,
  podeExcluirOrcamento,
  podeRejeitarOrcamento,
} from '../domain/orcamentoStatus';

export const STATUS_LABEL = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  expirado: 'Expirado',
  convertido: 'Convertido',
};

export const STATUS_UI_TO_DB = {
  Pendente: 'pendente',
  Aprovado: 'aprovado',
  Rejeitado: 'rejeitado',
  Expirado: 'expirado',
  Convertido: 'convertido',
};

function buildSimPayload(payload, simulacao) {
  return {
    valor_entrada: simulacao.valorEntrada,
    valor_restante_sim: simulacao.valorRestanteBase,
    forma_pagamento_sim: simulacao.formaPagamentoSim,
    forma_pagamento_credito_id: payload.formaPagamentoCreditoId ?? null,
    parcelas_sim: simulacao.parcelas,
    taxa_repassada: simulacao.taxaRepassada,
    taxa_percentual: simulacao.taxaPercentual,
  };
}

function buildSimulacaoFromPayload(payload, itens, aparelhos) {
  return calcSimulacaoOrcamento({
    itens,
    entrada: payload.entrada,
    aparelhosTroca: aparelhos,
    formaPagamentoSim: payload.formaPagamento ?? payload.formaPagamentoSim ?? 'pix',
    parcelas: payload.parcelas ?? 1,
    adicionarTaxa: payload.adicionarTaxa !== false,
    taxaPercentual: payload.taxaPercentual ?? 0,
  });
}

export function addDays(isoDate, days) {
  const base = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date();
  base.setDate(base.getDate() + Number(days) || 0);
  return base.toISOString().slice(0, 10);
}

export function diffDays(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  return Math.round((to - from) / 86400000);
}

function formatDataBR(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
}

async function getNextOrcamentoCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_orcamento_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  const { data: rows, error: queryError } = await supabase
    .from('orcamentos')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  const last = rows?.[0]?.codigo;
  const seq = last ? Number(String(last).replace(/\D/g, '')) || 9000 : 9000;

  return { codigo: String(seq + 1).padStart(4, '0'), error: null };
}


async function persistItensAndAparelhos(lojaId, orcamentoId, itens, aparelhos) {
  const { error: deleteItensError } = await supabase
    .from('orcamento_itens')
    .delete()
    .eq('loja_id', lojaId)
    .eq('orcamento_id', orcamentoId);

  if (deleteItensError) {
    return { error: deleteItensError };
  }

  const { error: deleteApError } = await supabase
    .from('orcamento_aparelhos_troca')
    .delete()
    .eq('loja_id', lojaId)
    .eq('orcamento_id', orcamentoId);

  if (deleteApError) {
    return { error: deleteApError };
  }

  const itensPayload = itens.map((item) => ({
    loja_id: lojaId,
    orcamento_id: orcamentoId,
    produto_id: item.produtoId ?? item.produto_id ?? item.id ?? null,
    descricao: item.nome?.trim() || item.descricao?.trim() || 'Item',
    quantidade: Number(item.quantidade) || 1,
    valor_unitario: parseMoney(item.preco ?? item.valorUnitario),
    valor_desconto: parseMoney(item.desconto ?? item.valorDesconto),
    valor_total: calcItemLinhaOrcamento(
      item.quantidade,
      item.preco ?? item.valorUnitario,
      item.desconto ?? item.valorDesconto
    ),
  }));

  const { error: itensError } = await supabase.from('orcamento_itens').insert(itensPayload);
  if (itensError) {
    return { error: itensError };
  }

  if (aparelhos?.length) {
    const apPayload = aparelhos.map((ap) => ({
      loja_id: lojaId,
      orcamento_id: orcamentoId,
      modelo: ap.modelo?.trim() || 'Aparelho',
      imei: ap.imei?.trim() || null,
      valor_avaliacao: parseMoney(ap.valor ?? ap.valorAvaliacao),
    }));

    const { error: apError } = await supabase.from('orcamento_aparelhos_troca').insert(apPayload);
    if (apError) {
      return { error: apError };
    }
  }

  return { error: null };
}

/** Marca pendentes/aprovados vencidos como expirado (RPC Supabase ou fallback) */
export async function expirarOrcamentosVencidos(lojaId) {
  const { error } = await supabase.rpc('expirar_orcamentos_vencidos', {
    p_loja_id: lojaId,
  });

  if (!error) {
    return { error: null };
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return supabase
    .from('orcamentos')
    .update({ status: 'expirado' })
    .eq('loja_id', lojaId)
    .in('status', ['pendente', 'aprovado'])
    .not('data_validade', 'is', null)
    .lt('data_validade', hoje);
}

function mensagemOrcamentoExpirado() {
  return new Error('Este orçamento está expirado. Crie um novo orçamento para o cliente.');
}

export function validarOrcamentoParaPdv(orcamento) {
  if (!orcamento) {
    return { ok: false, error: new Error('Orçamento não encontrado.') };
  }

  if (orcamento.status === 'expirado' || isDataValidadeExpirada(orcamento.data_validade)) {
    return { ok: false, error: mensagemOrcamentoExpirado() };
  }

  if (orcamento.status === 'convertido') {
    return { ok: false, error: new Error('Este orçamento já foi convertido em venda.') };
  }

  if (orcamento.status === 'rejeitado') {
    return { ok: false, error: new Error('Orçamento rejeitado não pode ser convertido em venda.') };
  }

  if (!podeConverterOrcamento(orcamento.status, orcamento.data_validade)) {
    return {
      ok: false,
      error: new Error('Somente orçamentos aprovados e dentro da validade podem ir para o PDV.'),
    };
  }

  return { ok: true, error: null };
}

export async function listOrcamentos(lojaId) {
  await expirarOrcamentosVencidos(lojaId);

  return supabase
    .from('orcamentos')
    .select(
      `
      id, codigo, status, valor_total, data_emissao, data_validade, created_at,
      cliente:pessoas (id, nome),
      vendedor:usuarios!orcamentos_vendedor_id_fkey (id, nome)
    `
    )
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });
}

export async function getOrcamentoById(lojaId, orcamentoId) {
  await expirarOrcamentosVencidos(lojaId);

  return supabase
    .from('orcamentos')
    .select(
      `
      *,
      cliente:pessoas (id, nome, telefone, cpf_cnpj),
      vendedor:usuarios!orcamentos_vendedor_id_fkey (id, nome),
      itens:orcamento_itens (
        id, produto_id, descricao, quantidade, valor_unitario, valor_desconto, valor_total,
        produto:produtos (id, nome, codigo, valor_venda)
      ),
      aparelhos:orcamento_aparelhos_troca (id, modelo, imei, valor_avaliacao)
    `
    )
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .maybeSingle();
}

export async function createOrcamento(lojaId, payload, itens, aparelhos, vendedorId) {
  if (!itens?.length) {
    return { data: null, error: new Error('Adicione pelo menos um item ao orçamento.') };
  }

  const { codigo, error: codigoError } = await getNextOrcamentoCodigo(lojaId);
  if (codigoError) {
    return { data: null, error: codigoError };
  }

  const simulacao = buildSimulacaoFromPayload(payload, itens, aparelhos);
  const totais = calcTotaisItensOrcamento(itens);
  const sim = buildSimPayload(payload, simulacao);
  const dataEmissao = payload.dataEmissao || new Date().toISOString().slice(0, 10);

  const { data: orcamento, error: orcError } = await supabase
    .from('orcamentos')
    .insert({
      loja_id: lojaId,
      codigo,
      cliente_id: payload.clienteId || null,
      vendedor_id: vendedorId || null,
      status: 'pendente',
      data_emissao: dataEmissao,
      data_validade: payload.dataValidade || addDays(dataEmissao, 15),
      valor_subtotal: totais.valorSubtotalBruto,
      valor_desconto: totais.valorDesconto,
      valor_acrescimo: simulacao.valorAcrescimo,
      valor_total: simulacao.valorTotal,
      observacoes: payload.observacoes?.trim() || null,
      ...sim,
    })
    .select()
    .single();

  if (orcError) {
    return { data: null, error: orcError };
  }

  const { error: persistError } = await persistItensAndAparelhos(
    lojaId,
    orcamento.id,
    itens,
    aparelhos
  );

  if (persistError) {
    return { data: null, error: persistError };
  }

  return { data: orcamento, error: null };
}

export async function updateOrcamento(lojaId, orcamentoId, payload, itens, aparelhos) {
  await expirarOrcamentosVencidos(lojaId);

  const { data: existente, error: fetchError } = await supabase
    .from('orcamentos')
    .select('id, status, data_validade')
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .single();

  if (fetchError || !existente) {
    return { data: null, error: fetchError ?? new Error('Orçamento não encontrado.') };
  }

  if (!podeEditarOrcamento(existente.status, existente.data_validade)) {
    return {
      data: null,
      error: existente.status === 'expirado' || isDataValidadeExpirada(existente.data_validade)
        ? mensagemOrcamentoExpirado()
        : new Error('Somente orçamentos pendentes podem ser editados.'),
    };
  }

  if (!itens?.length) {
    return { data: null, error: new Error('Adicione pelo menos um item ao orçamento.') };
  }

  const simulacao = buildSimulacaoFromPayload(payload, itens, aparelhos);
  const totais = calcTotaisItensOrcamento(itens);
  const sim = buildSimPayload(payload, simulacao);

  const { data: orcamento, error: updateError } = await supabase
    .from('orcamentos')
    .update({
      cliente_id: payload.clienteId || null,
      data_validade: payload.dataValidade || undefined,
      valor_subtotal: totais.valorSubtotalBruto,
      valor_desconto: totais.valorDesconto,
      valor_acrescimo: simulacao.valorAcrescimo,
      valor_total: simulacao.valorTotal,
      observacoes: payload.observacoes?.trim() || null,
      ...sim,
    })
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  const { error: persistError } = await persistItensAndAparelhos(
    lojaId,
    orcamentoId,
    itens,
    aparelhos
  );

  if (persistError) {
    return { data: null, error: persistError };
  }

  return { data: orcamento, error: null };
}

export async function aprovarOrcamento(lojaId, orcamentoId) {
  await expirarOrcamentosVencidos(lojaId);

  const { data: orcamento, error: fetchError } = await supabase
    .from('orcamentos')
    .select('id, status, data_validade')
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .single();

  if (fetchError || !orcamento) {
    return { error: fetchError ?? new Error('Orçamento não encontrado.') };
  }

  if (!podeAprovarOrcamento(orcamento.status, orcamento.data_validade)) {
    return {
      error: orcamento.status === 'expirado' || isDataValidadeExpirada(orcamento.data_validade)
        ? mensagemOrcamentoExpirado()
        : new Error('Somente orçamentos pendentes podem ser aprovados.'),
    };
  }

  return supabase
    .from('orcamentos')
    .update({ status: 'aprovado' })
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId);
}

export async function rejeitarOrcamento(lojaId, orcamentoId) {
  await expirarOrcamentosVencidos(lojaId);

  const { data: orcamento, error: fetchError } = await supabase
    .from('orcamentos')
    .select('id, status, data_validade')
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .single();

  if (fetchError || !orcamento) {
    return { error: fetchError ?? new Error('Orçamento não encontrado.') };
  }

  if (!podeRejeitarOrcamento(orcamento.status, orcamento.data_validade)) {
    return {
      error: orcamento.status === 'expirado' || isDataValidadeExpirada(orcamento.data_validade)
        ? mensagemOrcamentoExpirado()
        : new Error('Somente orçamentos pendentes podem ser rejeitados.'),
    };
  }

  return supabase
    .from('orcamentos')
    .update({ status: 'rejeitado' })
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId);
}

export async function excluirOrcamento(lojaId, orcamentoId) {
  await expirarOrcamentosVencidos(lojaId);

  const { data: orcamento, error: fetchError } = await supabase
    .from('orcamentos')
    .select('id, status')
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .single();

  if (fetchError || !orcamento) {
    return { error: fetchError ?? new Error('Orçamento não encontrado.') };
  }

  if (!podeExcluirOrcamento(orcamento.status)) {
    return { error: new Error('Somente orçamentos pendentes, rejeitados ou expirados podem ser excluídos.') };
  }

  return supabase.from('orcamentos').delete().eq('loja_id', lojaId).eq('id', orcamentoId);
}

export async function marcarOrcamentoConvertido(lojaId, orcamentoId, vendaId) {
  await expirarOrcamentosVencidos(lojaId);

  const { data: orcamento, error: fetchError } = await supabase
    .from('orcamentos')
    .select('id, status, data_validade')
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .single();

  if (fetchError || !orcamento) {
    return { error: fetchError ?? new Error('Orçamento não encontrado.') };
  }

  const validacao = validarOrcamentoParaPdv(orcamento);
  if (!validacao.ok) {
    return { error: validacao.error };
  }

  return supabase
    .from('orcamentos')
    .update({ status: 'convertido', venda_id: vendaId })
    .eq('loja_id', lojaId)
    .eq('id', orcamentoId)
    .eq('status', 'aprovado');
}

export function mapOrcamentoRow(orcamento) {
  return {
    id: orcamento.id,
    cod: orcamento.codigo,
    codigo: orcamento.codigo,
    cliente: orcamento.cliente?.nome ?? '—',
    vendedor: orcamento.vendedor?.nome ?? '—',
    data: formatDataBR(orcamento.data_emissao),
    dataIso: orcamento.data_emissao,
    validade: formatDataBR(orcamento.data_validade),
    validadeIso: orcamento.data_validade,
    valor: orcamento.valor_total,
    status: STATUS_LABEL[orcamento.status] ?? orcamento.status,
    statusDb: orcamento.status,
  };
}

export function mapOrcamentoToFormState(orcamento) {
  return {
    orcamentoId: orcamento.id,
    codigo: orcamento.codigo,
    clienteId: orcamento.cliente_id,
    cliente: orcamento.cliente,
    observacoes: orcamento.observacoes ?? '',
    entrada: orcamento.valor_entrada ?? 0,
    formaPagamento: orcamento.forma_pagamento_sim ?? 'pix',
    formaPagamentoCreditoId: orcamento.forma_pagamento_credito_id ?? null,
    parcelas: orcamento.parcelas_sim ?? 1,
    adicionarTaxa: orcamento.taxa_repassada ?? true,
    taxaPercentual: orcamento.taxa_percentual ?? 0,
    dataEmissao: orcamento.data_emissao,
    dataValidade: orcamento.data_validade,
    vendedor: orcamento.vendedor?.nome,
    itens: (orcamento.itens ?? []).map((item) => ({
      idRow: item.id,
      produtoId: item.produto_id,
      id: item.produto_id,
      nome: item.descricao,
      preco: Number(item.valor_unitario) || 0,
      quantidade: item.quantidade,
      desconto: Number(item.valor_desconto) || 0,
    })),
    aparelhos: (orcamento.aparelhos ?? []).map((ap) => ({
      id: ap.id,
      modelo: ap.modelo,
      imei: ap.imei ?? '',
      valor: Number(ap.valor_avaliacao) || 0,
    })),
  };
}

/** Monta carrinho + pagamentos para preload do PDV (valores fechados do orçamento) */
export function buildPdvPreloadFromOrcamento(orcamento, formasPagamento = []) {
  const carrinho = (orcamento.itens ?? []).map((item, index) => ({
    idCarrinho: `orc-${item.id ?? index}`,
    produtoId: item.produto_id,
    nome: item.descricao,
    preco: Number(item.valor_unitario) || 0,
    quantidade: Number(item.quantidade) || 1,
    imei: null,
    tipo: 'Produto',
  }));

  const descontoGlobal = roundMoney(
    (orcamento.itens ?? []).reduce((acc, item) => acc + Number(item.valor_desconto || 0), 0)
  );

  const { pagamentos } = buildPagamentosPdvFromOrcamento(
    orcamento,
    formasPagamento,
    formatFormaPagamentoLabel
  );

  return {
    orcamentoId: orcamento.id,
    clienteId: orcamento.cliente_id,
    observacoes: orcamento.observacoes ?? '',
    carrinho,
    descontoGlobal,
    pagamentos,
    simulacao: simulacaoFromOrcamentoPersistido(orcamento),
  };
}

export {
  calcItemLinhaOrcamento,
  calcTotaisItensOrcamento,
  calcSimulacaoOrcamento,
  formatDataBR,
};
