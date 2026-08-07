import { supabase } from '../lib/supabaseClient';
import { onlyDigits } from '../utils/formatters';
import { emitirCreditosAtualizados } from '../utils/creditosEvents';

export const CUSTO_CONSULTA_CPF_CNPJ = 1;
export const CUSTO_CONSULTA_IMEI = 2;

export function custoConsultaCpfCnpj() {
  return CUSTO_CONSULTA_CPF_CNPJ;
}

export function custoConsultaImei() {
  return CUSTO_CONSULTA_IMEI;
}

async function invokeConsultar(body) {
  const { data, error } = await supabase.functions.invoke('consultar', { body });

  if (error) {
    let payload = null;
    try {
      payload = typeof error.context?.json === 'function'
        ? await error.context.json()
        : null;
    } catch {
      payload = null;
    }

    return {
      ok: false,
      code: payload?.code || 'invoke_error',
      error: { message: payload?.error || error.message || 'Falha ao chamar consulta.' },
      custo: payload?.custo ?? null,
      saldo: payload?.saldo ?? null,
      usados: payload?.usados ?? null,
      limite: payload?.limite ?? null,
      restantes: payload?.restantes ?? null,
    };
  }

  if (data?.ok) {
    if (typeof data.saldo === 'number') {
      emitirCreditosAtualizados(data.saldo);
    } else {
      // Sem saldo na resposta: topbar recarrega do banco
      window.dispatchEvent(new CustomEvent('phonegestor:creditos-atualizados', { detail: {} }));
    }

    return {
      ok: true,
      dados: data.dados ?? null,
      situacaoLoja: data.situacaoLoja ?? null,
      custo: data.custo ?? null,
      saldo: data.saldo ?? null,
      mode: data.mode ?? null,
      trial: data.trial ?? null,
    };
  }

  return {
    ok: false,
    code: data?.code || 'provider_error',
    error: { message: data?.error || 'Consulta não concluída.' },
    custo: data?.custo ?? null,
    saldo: data?.saldo ?? null,
    usados: data?.usados ?? null,
    limite: data?.limite ?? null,
    restantes: data?.restantes ?? null,
  };
}

/**
 * @param {string} lojaId
 * @param {string} documento
 * @param {{ birthdate?: string }} [opts] data nascimento (obrigatória para CPF na Infosimples)
 */
export async function consultarCpfCnpj(lojaId, documento, opts = {}) {
  const chave = onlyDigits(documento);
  return invokeConsultar({
    lojaId,
    tipo: 'cpf_cnpj',
    documento: chave,
    birthdate: opts.birthdate || opts.dataNascimento || '',
  });
}

export async function consultarImei(lojaId, imei) {
  return invokeConsultar({
    lojaId,
    tipo: 'imei',
    imei: onlyDigits(imei),
    documento: onlyDigits(imei),
  });
}
