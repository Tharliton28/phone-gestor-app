import { supabase } from '../lib/supabaseClient';
import {
  montarMensagemAutorizacaoConsulta,
  montarTermoPorTipo,
  TIPO_AUTORIZACAO,
} from '../domain/autorizacaoConsulta';
import { fetchIpCliente, hashTermoTexto } from '../domain/osTermo';
import { formatCpfCnpj } from '../utils/formatters';

export { TIPO_AUTORIZACAO, montarMensagemAutorizacaoConsulta };

export async function criarLinkAutorizacaoConsulta({
  lojaId,
  pessoaId,
  nomeEmpresa,
  nomeCliente,
  cpfCliente,
  operadorId,
  tipo = TIPO_AUTORIZACAO.ATENDIMENTO,
  imei,
  modelo,
}) {
  if (!lojaId || !pessoaId) {
    return { url: null, token: null, expiresAt: null, error: new Error('Cadastro incompleto.') };
  }

  const tipoFinal = tipo === TIPO_AUTORIZACAO.AVALIACAO_USADO
    ? TIPO_AUTORIZACAO.AVALIACAO_USADO
    : TIPO_AUTORIZACAO.ATENDIMENTO;

  const termoTexto = montarTermoPorTipo(tipoFinal, {
    nomeEmpresa,
    nomeCliente,
    cpfCliente: cpfCliente ? formatCpfCnpj(cpfCliente) : '—',
    imei,
    modelo,
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
      tipo: tipoFinal,
      termo_texto: termoTexto,
      termo_hash: termoHash,
      expires_at: expiresAt,
      created_by: operadorId || null,
    })
    .select('token, expires_at, tipo')
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
  return { url, token: data.token, expiresAt: data.expires_at, tipo: data.tipo, error: null };
}

export async function getLinkAutorizacaoPendente(lojaId, pessoaId) {
  const { data, error } = await supabase
    .from('autorizacao_consulta_tokens')
    .select('token, expires_at, tipo')
    .eq('loja_id', lojaId)
    .eq('pessoa_id', pessoaId)
    .is('usado_em', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error || !data?.token) {
    return { url: null, token: null, expiresAt: null, tipo: null, error };
  }

  return {
    url: `${window.location.origin}/autorizacao-consulta/${data.token}`,
    token: data.token,
    expiresAt: data.expires_at,
    tipo: data.tipo,
    error: null,
  };
}

/** Última autorização assinada (evidência: IP, CPF, data). */
export async function getUltimaAutorizacaoAssinada(lojaId, pessoaId) {
  const { data, error } = await supabase
    .from('autorizacao_consulta_tokens')
    .select('id, tipo, usado_em, ip_cliente, cpf_informado, user_agent')
    .eq('loja_id', lojaId)
    .eq('pessoa_id', pessoaId)
    .not('usado_em', 'is', null)
    .order('usado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data ?? null, error };
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
