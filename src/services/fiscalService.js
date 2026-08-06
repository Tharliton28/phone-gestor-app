import { supabase } from '../lib/supabaseClient';
import { CUSTO_CREDITOS, temSaldoSuficiente } from '../domain/lojaCreditos';
import { mensagemUpgradeNfce } from '../domain/lojaPlanos';
import { statusFiscalEhSucesso } from '../domain/nfce';
import { consumirCreditos, getSaldoCreditos } from './lojaCreditoService';
import { emitirNfceMock } from './fiscal/mockNfceProvider';
import { getLojaConfigFiscal } from './lojaConfigService';
import { getLojaEntitlements } from './lojaPlanoService';

export async function listDocumentosFiscais(lojaId, { limit = 40 } = {}) {
  if (!lojaId) return { data: [], error: new Error('Loja não informada.') };

  const { data, error } = await supabase
    .from('documentos_fiscais')
    .select('id, tipo, serie, numero, status, chave_acesso, protocolo, mensagem, provider, valor_total, consumiu_creditos, venda_id, ambiente, caminho_danfe, qrcode_url, created_at')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

export async function getDocumentoFiscalDaVenda(lojaId, vendaId) {
  if (!lojaId || !vendaId) return { data: null, error: null };

  const { data, error } = await supabase
    .from('documentos_fiscais')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('venda_id', vendaId)
    .eq('tipo', 'nfce')
    .maybeSingle();

  return { data, error };
}

async function emitirViaFocusEdge({ lojaId, vendaId, forcar }) {
  const { data, error } = await supabase.functions.invoke('emitir-nfce', {
    body: { lojaId, vendaId, forcar },
  });

  if (error) {
    const msg = data?.error || error.message || 'Falha ao chamar emissão Focus.';
    return { data: data?.data ?? null, skipped: Boolean(data?.skipped), error: new Error(msg) };
  }

  if (data?.skipped) {
    return { data: data?.data ?? null, skipped: true, error: null };
  }

  if (data?.error && !data?.data) {
    return { data: null, error: new Error(data.error) };
  }

  if (data?.error && data?.data) {
    return { data: data.data, error: new Error(data.error) };
  }

  return { data: data?.data ?? null, error: null };
}

async function emitirViaMock({
  lojaId,
  vendaId,
  valorTotal,
  operadorId,
  config,
}) {
  const custo = CUSTO_CREDITOS.nfce_emissao?.creditos ?? 4;
  const { saldo, error: saldoError } = await getSaldoCreditos(lojaId);
  if (saldoError) {
    return { data: null, error: new Error(saldoError.message ?? 'Não foi possível consultar créditos.') };
  }
  if (!temSaldoSuficiente(saldo, 'nfce_emissao')) {
    return {
      data: null,
      error: new Error(`Créditos insuficientes para NFC-e (precisa de ${custo}, saldo ${saldo}).`),
    };
  }

  const { data: reserva, error: reservaError } = await supabase.rpc('reservar_proximo_numero_nfce', {
    p_loja_id: lojaId,
  });

  if (reservaError) {
    return { data: null, error: new Error(reservaError.message ?? 'Não foi possível reservar número da NFC-e.') };
  }

  const serie = Number(reserva.serie) || 1;
  const numero = Number(reserva.numero);
  const ambiente = reserva.ambiente ?? config?.nfe_ambiente ?? 'homologacao';

  const { data: rascunho, error: insertError } = await supabase
    .from('documentos_fiscais')
    .insert({
      loja_id: lojaId,
      venda_id: vendaId,
      tipo: 'nfce',
      ambiente,
      serie,
      numero,
      status: 'processando',
      provider: 'mock',
      valor_total: valorTotal ?? null,
      created_by: operadorId,
      mensagem: 'Enviando ao provedor fiscal…',
    })
    .select('*')
    .single();

  if (insertError) {
    return { data: null, error: new Error(insertError.message ?? 'Falha ao registrar documento fiscal.') };
  }

  let resultado;
  try {
    resultado = await emitirNfceMock({ serie, numero, valorTotal, ambiente, vendaId, lojaId });
  } catch (err) {
    resultado = {
      ok: false,
      status: 'rejeitado',
      mensagem: err?.message ?? 'Erro inesperado no provedor fiscal.',
      providerRef: null,
    };
  }

  const statusFinal = resultado.ok ? (resultado.status || 'autorizado') : 'rejeitado';
  let consumiu = 0;

  if (resultado.ok && statusFiscalEhSucesso(statusFinal)) {
    const credito = await consumirCreditos({
      lojaId,
      acao: 'nfce_emissao',
      descricao: `NFC-e ${serie}/${numero}`,
      referenciaTipo: 'documento_fiscal',
      referenciaId: rascunho.id,
    });

    if (credito.error) {
      await supabase
        .from('documentos_fiscais')
        .update({
          status: 'rejeitado',
          mensagem: `NFC-e autorizada no provedor, mas créditos insuficientes: ${credito.error.message}`,
          chave_acesso: resultado.chaveAcesso ?? null,
          protocolo: resultado.protocolo ?? null,
          provider_ref: resultado.providerRef ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rascunho.id);

      return {
        data: null,
        error: new Error(credito.error.message ?? 'Créditos insuficientes para debitar a NFC-e.'),
      };
    }
    consumiu = credito.consumido ?? 0;
  }

  const { data: atualizado, error: updateError } = await supabase
    .from('documentos_fiscais')
    .update({
      status: statusFinal,
      chave_acesso: resultado.chaveAcesso ?? null,
      protocolo: resultado.protocolo ?? null,
      mensagem: resultado.mensagem ?? null,
      provider_ref: resultado.providerRef ?? null,
      consumiu_creditos: consumiu,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rascunho.id)
    .select('*')
    .single();

  if (updateError) {
    return { data: null, error: new Error(updateError.message ?? 'Falha ao atualizar documento fiscal.') };
  }

  if (!resultado.ok) {
    return { data: atualizado, error: new Error(resultado.mensagem || 'NFC-e rejeitada.') };
  }

  return { data: atualizado, error: null };
}

/**
 * Emite NFC-e para uma venda já salva.
 * Focus → Edge Function; mock → client local.
 */
export async function emitirNfceParaVenda({
  lojaId,
  vendaId,
  valorTotal,
  operadorId = null,
  forcar = false,
}) {
  if (!lojaId || !vendaId) {
    return { data: null, error: new Error('Loja e venda são obrigatórios.') };
  }

  const { data: config, error: configError } = await getLojaConfigFiscal(lojaId);
  if (configError) return { data: null, error: configError };

  const { data: entitlements, error: planoError } = await getLojaEntitlements(lojaId);
  if (planoError) return { data: null, error: planoError };
  if (!entitlements?.podeNfce) {
    return {
      data: null,
      error: new Error(mensagemUpgradeNfce(entitlements?.plano)),
    };
  }

  if (!forcar && !config?.fiscal_emitir_nfce_auto) {
    return { data: null, skipped: true, error: null };
  }

  const existente = await getDocumentoFiscalDaVenda(lojaId, vendaId);
  if (existente.data && statusFiscalEhSucesso(existente.data.status)) {
    return { data: existente.data, skipped: true, error: null };
  }

  const providerName = config?.fiscal_provider === 'mock'
    ? 'focus'
    : (config?.fiscal_provider ?? 'focus');

  if (providerName === 'focus') {
    return emitirViaFocusEdge({ lojaId, vendaId, forcar });
  }

  if (providerName === 'enotas') {
    return { data: null, error: new Error('Provedor eNotas ainda não está disponível.') };
  }

  return {
    data: null,
    error: new Error(
      'Configure o provedor Focus NFe e o token em Configurações → Fiscal para emitir NFC-e.'
    ),
  };
}
