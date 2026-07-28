import { supabase } from '../lib/supabaseClient';

export async function listRupturasEstoque(lojaId) {
  return supabase
    .from('rupturas_estoque')
    .select('id, codigo, produto, tipo, categoria, marca, saldo_atual, valor_venda, atualizado_em')
    .eq('loja_id', lojaId)
    .order('saldo_atual', { ascending: true });
}
