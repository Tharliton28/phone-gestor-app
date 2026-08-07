import { supabase } from '../lib/supabaseClient';
import {
  montarTermoAutorizacaoConsulta,
} from '../domain/autorizacaoConsulta';
import { fetchIpCliente, hashTermoTexto } from '../domain/osTermo';
import { formatCpfCnpj } from '../utils/formatters';

export async function criarLinkAutorizacaoConsulta({
  lojaId,
  pessoaId,
  nomeEmpresa,
  nomeCliente,
  cpfCliente,
  operadorId,
}) {
  if (!lojaId || !pessoaId) {
    return { url: null, token: null, expiresAt: null, error: new Error('Cadastro incompleto.') };
  }

  const termoTexto = montarTermoAutorizacaoConsulta({
    nomeEmpresa,
    nomeCliente,
    cpfCliente: cpfCliente ? formatCpfCnpj(cpfCliente) : '—',
  });
  const termoHash = await hashTermoTexto(termoTexto);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const novoToken = crypto.randomUUID();

  const { error: deleteError } = await supabase
    .from('autorizacao_consulta_tokens')
    .delete()
    .eq('loja_id', lojaId)
    .eq('pessoa_id', pessoaId)
    .is('usado_em', null);

  if (deleteError) {
    return {
      url: null,
      token: null,
      expiresAt: null,
      error: new Error(deleteError.message || 'Não foi possível atualizar o link.'),
    };
  }

  const { data, error } = await supabase
    .from('autorizacao_consulta_tokens')
    .insert({
      loja_id: lojaId,
      pessoa_id: pessoaId,
      token: novoToken,
      termo_texto: termoTexto,
      termo_hash: termoHash,
      expires_at: expiresAt,
      created_by: operadorId || null,
    })
    .select('token, expires_at')
    .single();

  if (error) {
    return {
      url: null,
      token: null,
      expiresAt: null,
      error: new Error(error.message || 'Erro ao gerar link.'),
    };
  }

  const url = `${window.location.origin}/autorizacao-consulta/${data.token}`;
  return { url, token: data.token, expiresAt: data.expires_at, error: null };
}

export async function getLinkAutorizacaoPendente(lojaId, pessoaId) {
  const { data, error } = await supabase
    .from('autorizacao_consulta_tokens')
    .select('token, expires_at')
    .eq('loja_id', lojaId)
    .eq('pessoa_id', pessoaId)
    .is('usado_em', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error || !data?.token) {
    return { url: null, token: null, expiresAt: null, error };
  }

  return {
    url: `${window.location.origin}/autorizacao-consulta/${data.token}`,
    token: data.token,
    expiresAt: data.expires_at,
    error: null,
  };
}

export async function obterAutorizacaoPorToken(token) {
  const { data, error } = await supabase.rpc('obter_autorizacao_consulta_token', {
    p_token: token,
  });
  return { data: data ?? null, error };
}

export async function confirmarAutorizacaoConsulta({ token, assinaturaDataUrl, cpfCliente }) {
  const ip = await fetchIpCliente();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { data, error } = await supabase.rpc('confirmar_autorizacao_consulta', {
    p_token: token,
    p_assinatura_data_url: assinaturaDataUrl,
    p_ip: ip,
    p_user_agent: userAgent,
    p_cpf_cliente: cpfCliente || null,
  });

  return { tokenId: data, error };
}
