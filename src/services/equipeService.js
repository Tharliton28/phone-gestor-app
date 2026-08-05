import { supabase } from '../lib/supabaseClient';

export async function listarEquipeLoja(lojaId) {
  if (!lojaId) return { data: [], error: new Error('Loja não informada.') };
  const { data, error } = await supabase.rpc('listar_equipe_loja', { p_loja_id: lojaId });
  if (error) return { data: [], error };
  return { data: Array.isArray(data) ? data : [], error: null };
}

export async function listarConvitesLoja(lojaId) {
  if (!lojaId) return { data: [], error: new Error('Loja não informada.') };
  const { data, error } = await supabase.rpc('listar_convites_loja', { p_loja_id: lojaId });
  if (error) return { data: [], error };
  return { data: Array.isArray(data) ? data : [], error: null };
}

export async function criarConviteLoja(lojaId, email, papel = 'vendedor') {
  if (!lojaId) return { data: null, error: new Error('Loja não informada.') };
  const { data, error } = await supabase.rpc('criar_convite_loja', {
    p_loja_id: lojaId,
    p_email: String(email ?? '').trim().toLowerCase(),
    p_papel: papel,
  });
  if (error) return { data: null, error };
  if (data?.ok === false) return { data: null, error: new Error(data.error || 'Falha ao criar convite.') };
  return { data, error: null };
}

export async function revogarConviteLoja(conviteId) {
  const { data, error } = await supabase.rpc('revogar_convite_loja', { p_convite_id: conviteId });
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function desativarMembroLoja(lojaId, usuarioId) {
  const { data, error } = await supabase.rpc('desativar_membro_loja', {
    p_loja_id: lojaId,
    p_usuario_id: usuarioId,
  });
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function getConvitePublico(token) {
  const { data, error } = await supabase.rpc('get_convite_publico', { p_token: token });
  if (error) return { data: null, error };
  if (!data?.ok) return { data: null, error: new Error(data?.error || 'Convite inválido.') };
  return { data, error: null };
}

export async function aceitarConviteLoja(token) {
  const { data, error } = await supabase.rpc('aceitar_convite_loja', { p_token: token });
  if (error) return { data: null, error };
  if (data?.ok === false) return { data: null, error: new Error(data.error || 'Falha ao aceitar.') };
  return { data, error: null };
}

export function linkConvite(token) {
  if (typeof window === 'undefined') return `/convite/${token}`;
  return `${window.location.origin}/convite/${token}`;
}
