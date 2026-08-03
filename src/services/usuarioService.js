import { supabase } from '../lib/supabaseClient';

export async function atualizarNomeUsuario(usuarioId, nome) {
  const nomeLimpo = String(nome ?? '').trim();
  if (!usuarioId) {
    return { data: null, error: new Error('Usuário não informado.') };
  }
  if (nomeLimpo.length < 2) {
    return { data: null, error: new Error('Informe um nome com pelo menos 2 caracteres.') };
  }
  if (nomeLimpo.length > 80) {
    return { data: null, error: new Error('Nome muito longo (máx. 80 caracteres).') };
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update({ nome: nomeLimpo })
    .eq('id', usuarioId)
    .select('id, nome, email, avatar_url')
    .maybeSingle();

  return { data, error };
}
