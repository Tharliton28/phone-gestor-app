import { supabase } from '../lib/supabaseClient';
import { parseMoney } from '../utils/formatters';
import { registrarMovimentacao } from './movimentacaoService';

export const STATUS_LABEL = {
  aberta: 'Aberta',
  em_manutencao: 'Em Manutenção',
  aguardando_peca: 'Aguardando Peça',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const STATUS_COLORS = {
  aberta: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
  em_manutencao: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
  aguardando_peca: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
  finalizada: { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.1)' },
  cancelada: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

async function getNextOrdemServicoCodigo(lojaId) {
  const { data, error } = await supabase.rpc('next_ordem_servico_codigo', {
    p_loja_id: lojaId,
  });

  if (!error && data != null) {
    return { codigo: data, error: null };
  }

  const { data: rows, error: queryError } = await supabase
    .from('ordens_servico')
    .select('codigo')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    return { codigo: null, error: queryError };
  }

  const last = rows?.[0]?.codigo;
  const seq = last ? Number(String(last).replace(/^OS-/, '')) || 0 : 0;

  return { codigo: `OS-${String(seq + 1).padStart(4, '0')}`, error: null };
}

export function mapFormToOrdemServico(form) {
  const valorServico = parseMoney(form.valorServico);
  const valorPecas = parseMoney(form.valorPecas);

  return {
    cliente_id: form.clienteId,
    tecnico_id: form.tecnicoId || null,
    aparelho_modelo: form.aparelhoModelo?.trim(),
    aparelho_imei: form.aparelhoImei?.trim() || null,
    aparelho_cor_acessorios: form.aparelhoCorAcessorios?.trim() || null,
    estado_fisico: form.estadoFisico?.trim() || null,
    relato_cliente: form.relatoCliente?.trim() || null,
    laudo_tecnico: form.laudoTecnico?.trim() || null,
    valor_servico: valorServico,
    valor_pecas: valorPecas,
    valor_total: valorServico + valorPecas,
    data_previsao: form.dataPrevisao || null,
    observacoes: form.observacoes?.trim() || null,
    status: form.status || 'aberta',
  };
}

export function mapOrdemServicoToForm(data) {
  return {
    clienteId: data.cliente_id ?? '',
    tecnicoId: data.tecnico_id ?? '',
    aparelhoModelo: data.aparelho_modelo ?? '',
    aparelhoImei: data.aparelho_imei ?? '',
    aparelhoCorAcessorios: data.aparelho_cor_acessorios ?? '',
    estadoFisico: data.estado_fisico ?? '',
    relatoCliente: data.relato_cliente ?? '',
    laudoTecnico: data.laudo_tecnico ?? '',
    valorServico: String(data.valor_servico ?? ''),
    valorPecas: String(data.valor_pecas ?? '0'),
    dataPrevisao: data.data_previsao ?? '',
    observacoes: data.observacoes ?? '',
    status: data.status ?? 'aberta',
  };
}

export async function listOrdensServico(lojaId) {
  return supabase
    .from('ordens_servico')
    .select(
      `
      id, codigo, aparelho_modelo, relato_cliente, status,
      valor_total, data_entrada, created_at,
      cliente:pessoas!ordens_servico_cliente_id_fkey (id, nome, telefone),
      tecnico:pessoas!ordens_servico_tecnico_id_fkey (id, nome)
    `
    )
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });
}

export async function getOrdemServicoStats(lojaId) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('status')
    .eq('loja_id', lojaId);

  if (error) {
    return { abertas: 0, emManutencao: 0, aguardandoPeca: 0, finalizadas: 0, error };
  }

  const counts = { abertas: 0, emManutencao: 0, aguardandoPeca: 0, finalizadas: 0 };

  (data ?? []).forEach((row) => {
    if (row.status === 'aberta') counts.abertas += 1;
    if (row.status === 'em_manutencao') counts.emManutencao += 1;
    if (row.status === 'aguardando_peca') counts.aguardandoPeca += 1;
    if (row.status === 'finalizada') counts.finalizadas += 1;
  });

  return { ...counts, error: null };
}

export async function getOrdemServicoById(lojaId, osId) {
  return supabase
    .from('ordens_servico')
    .select(
      `
      *,
      cliente:pessoas!ordens_servico_cliente_id_fkey (id, nome, telefone),
      tecnico:pessoas!ordens_servico_tecnico_id_fkey (id, nome),
      itens:ordem_servico_itens (
        id, produto_id, tipo, descricao, quantidade, valor_unitario, valor_total, baixou_estoque,
        produto:produtos (id, nome, codigo)
      )
    `
    )
    .eq('loja_id', lojaId)
    .eq('id', osId)
    .maybeSingle();
}

export async function createOrdemServico(lojaId, form, abertoPorId) {
  if (!form.clienteId) {
    return { data: null, error: new Error('Selecione o cliente.') };
  }
  if (!form.aparelhoModelo?.trim()) {
    return { data: null, error: new Error('Informe o modelo do aparelho.') };
  }

  const { codigo, error: codigoError } = await getNextOrdemServicoCodigo(lojaId);
  if (codigoError) {
    return { data: null, error: codigoError };
  }

  const payload = mapFormToOrdemServico(form);

  return supabase
    .from('ordens_servico')
    .insert({
      loja_id: lojaId,
      codigo,
      aberto_por: abertoPorId || null,
      ...payload,
    })
    .select()
    .single();
}

export async function updateOrdemServico(lojaId, osId, form) {
  const { data: existente, error: fetchError } = await supabase
    .from('ordens_servico')
    .select('id, status')
    .eq('loja_id', lojaId)
    .eq('id', osId)
    .single();

  if (fetchError || !existente) {
    return { data: null, error: fetchError ?? new Error('Ordem de serviço não encontrada.') };
  }

  if (['finalizada', 'cancelada'].includes(existente.status)) {
    return { data: null, error: new Error('OS finalizada ou cancelada não pode ser editada.') };
  }

  const payload = mapFormToOrdemServico(form);

  return supabase
    .from('ordens_servico')
    .update(payload)
    .eq('loja_id', lojaId)
    .eq('id', osId)
    .select()
    .single();
}

export async function updateOrdemServicoStatus(lojaId, osId, status) {
  return supabase
    .from('ordens_servico')
    .update({ status })
    .eq('loja_id', lojaId)
    .eq('id', osId)
    .select()
    .single();
}

export async function cancelarOrdemServico(lojaId, osId) {
  const { data: os, error: fetchError } = await getOrdemServicoById(lojaId, osId);

  if (fetchError || !os) {
    return { error: fetchError ?? new Error('Ordem de serviço não encontrada.') };
  }

  if (os.status === 'finalizada') {
    return { error: new Error('OS finalizada não pode ser cancelada.') };
  }

  if (os.status === 'cancelada') {
    return { error: new Error('Esta OS já está cancelada.') };
  }

  return supabase
    .from('ordens_servico')
    .update({ status: 'cancelada' })
    .eq('loja_id', lojaId)
    .eq('id', osId);
}

export async function finalizarOrdemServico(lojaId, osId, operadorId) {
  const { data: os, error: fetchError } = await getOrdemServicoById(lojaId, osId);

  if (fetchError || !os) {
    return { error: fetchError ?? new Error('Ordem de serviço não encontrada.') };
  }

  if (os.status === 'cancelada') {
    return { error: new Error('OS cancelada não pode ser finalizada.') };
  }

  if (os.status === 'finalizada') {
    return { error: new Error('Esta OS já está finalizada.') };
  }

  for (const item of os.itens ?? []) {
    if (item.tipo !== 'peca' || !item.produto_id || item.baixou_estoque) continue;

    const { error: movError } = await registrarMovimentacao(lojaId, {
      produtoId: item.produto_id,
      tipo: 'saida',
      quantidade: item.quantidade,
      origem: 'ordem_servico',
      referenciaId: os.id,
      motivo: `Peça OS ${os.codigo} — ${item.descricao}`,
      operadorId,
    });

    if (movError) {
      return { error: movError };
    }

    await supabase
      .from('ordem_servico_itens')
      .update({ baixou_estoque: true })
      .eq('loja_id', lojaId)
      .eq('id', item.id);
  }

  return supabase
    .from('ordens_servico')
    .update({
      status: 'finalizada',
      data_finalizacao: new Date().toISOString(),
    })
    .eq('loja_id', lojaId)
    .eq('id', osId);
}
