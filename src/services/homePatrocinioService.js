import { supabase } from '../lib/supabaseClient';
import { HOME_PATROCINIOS_PADRAO, listHomePatrocinios } from '../domain/homePatrocinios';

function mapRow(row) {
  return {
    id: row.id,
    tipo: row.badge?.toLowerCase().includes('dispon') ? 'disponivel' : 'patrocinado',
    titulo: row.titulo,
    subtitulo: row.subtitulo ?? '',
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    badge: row.badge,
    accent: row.accent,
    gradiente: row.gradiente,
  };
}

/** Busca slots ativos; se a tabela ainda não existir, usa seed local. */
export async function listHomePatrociniosAtivos() {
  const { data, error } = await supabase
    .from('home_patrocinios')
    .select('id, titulo, subtitulo, cta_label, cta_url, badge, accent, gradiente, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error || !data?.length) {
    return { data: listHomePatrocinios(HOME_PATROCINIOS_PADRAO), error: null, fromSeed: true };
  }

  return { data: data.map(mapRow), error: null, fromSeed: false };
}
