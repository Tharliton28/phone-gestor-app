import { supabase } from '../lib/supabaseClient';
import { onlyDigits } from '../utils/formatters';

/**
 * Cria a loja do usuário autenticado via Edge Function (service role).
 * Payload mínimo: razaoSocial, cnpj, cidade.
 */
export async function createLojaOnboarding(form) {
  const razaoSocial = String(form.razaoSocial ?? '').trim();
  const cnpj = onlyDigits(form.cnpj);
  const cidade = String(form.cidade ?? '').trim();
  const estado = String(form.estado ?? '').trim().toUpperCase();

  if (!razaoSocial) {
    return { data: null, error: new Error('Informe a razão social.') };
  }
  if (cnpj.length !== 14) {
    return { data: null, error: new Error('CNPJ deve ter 14 dígitos.') };
  }
  if (!cidade) {
    return { data: null, error: new Error('Informe a cidade.') };
  }
  if (estado && estado.length !== 2) {
    return { data: null, error: new Error('UF deve ter 2 letras (ex: CE).') };
  }

  const { data, error } = await supabase.functions.invoke('create-loja', {
    body: {
      razao_social: razaoSocial,
      nome_fantasia: String(form.nomeFantasia ?? '').trim() || null,
      cnpj,
      cidade,
      estado: estado || null,
      email: String(form.email ?? '').trim() || null,
      telefone: String(form.telefone ?? '').trim() || null,
      regime_tributario: String(form.regimeTributario ?? 'Simples Nacional').trim() || 'Simples Nacional',
      cep: onlyDigits(form.cep) || null,
      logradouro: String(form.logradouro ?? '').trim() || null,
      numero: String(form.numero ?? '').trim() || null,
      complemento: String(form.complemento ?? '').trim() || null,
      bairro: String(form.bairro ?? '').trim() || null,
    },
  });

  if (error) {
    let detail = data?.error || error.message || 'Falha ao criar a loja.';
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch {
      /* ignore parse failures */
    }
    return { data: null, error: new Error(detail) };
  }

  if (data?.error) {
    return { data: null, error: new Error(data.error) };
  }

  return { data, error: null };
}
