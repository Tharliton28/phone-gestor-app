import { supabase } from '../lib/supabaseClient';
import {
  fetchIpCliente,
  hashTermoTexto,
  substituirVariaveisTermo,
  TERMO_OS_PADRAO,
} from '../domain/osTermo';

export const BUCKET_OS_EVIDENCIAS = 'os-evidencias';

export { TERMO_OS_PADRAO, substituirVariaveisTermo };

export async function getTermoEntrada(lojaId, osId) {
  return supabase
    .from('ordem_servico_termos')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ordem_servico_id', osId)
    .eq('tipo', 'entrada')
    .maybeSingle();
}

export async function listFotosEntrada(lojaId, osId) {
  return supabase
    .from('ordem_servico_fotos')
    .select('id, storage_path, legenda, created_at')
    .eq('loja_id', lojaId)
    .eq('ordem_servico_id', osId)
    .eq('momento', 'entrada')
    .order('created_at', { ascending: true });
}

export async function getSignedUrlFoto(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET_OS_EVIDENCIAS)
    .createSignedUrl(storagePath, 3600);

  return { url: data?.signedUrl ?? null, error };
}

async function uploadBlob(lojaId, osId, blob, suffix) {
  const mime = blob.type || 'application/octet-stream';
  let ext = 'jpg';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('heic') || mime.includes('heif')) ext = 'heic';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';

  const path = `${lojaId}/${osId}/${suffix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_OS_EVIDENCIAS)
    .upload(path, blob, { contentType: mime, upsert: false });

  if (error) return { path: null, error };
  return { path, error: null };
}

function formatStorageError(error, contexto) {
  const msg = error?.message ?? String(error);
  if (msg.includes('Bucket not found')) {
    return new Error(`${contexto}: bucket "os-evidencias" não existe. Rode a migration 014 no Supabase.`);
  }
  if (msg.includes('mime type') || msg.includes('invalid')) {
    return new Error(`${contexto}: formato de imagem não permitido. Use JPG ou PNG.`);
  }
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return new Error(`${contexto}: permissão negada no Storage. Rode a migration 015 no Supabase.`);
  }
  return new Error(`${contexto}: ${msg}`);
}

export async function uploadFotosEntrada(lojaId, osId, files, operadorId) {
  const erros = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const { path, error: uploadError } = await uploadBlob(lojaId, osId, file, `entrada-foto-${i}`);

    if (uploadError) {
      erros.push(formatStorageError(uploadError, `Foto ${i + 1}`));
      continue;
    }

    const { error: dbError } = await supabase.from('ordem_servico_fotos').insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      momento: 'entrada',
      storage_path: path,
      uploaded_por: operadorId || null,
    });

    if (dbError) erros.push(dbError);
  }

  return { error: erros[0] ?? null };
}

export async function registrarTermoEntrada({
  lojaId,
  osId,
  termoTexto,
  assinaturaDataUrl,
  operadorId,
}) {
  const existente = await getTermoEntrada(lojaId, osId);
  if (existente.data) {
    return { data: existente.data, error: new Error('Termo de entrada já registrado para esta OS.') };
  }

  const termoHash = await hashTermoTexto(termoTexto);
  const ip = await fetchIpCliente();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  return supabase
    .from('ordem_servico_termos')
    .insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      tipo: 'entrada',
      termo_texto: termoTexto,
      termo_hash: termoHash,
      ip_cliente: ip,
      user_agent: userAgent,
      assinatura_storage_path: null,
      assinatura_data_url: assinaturaDataUrl || null,
      origem_assinatura: 'loja',
      registrado_por: operadorId || null,
    })
    .select()
    .single();
}

export async function getOsEvidenciasEntrada(lojaId, osId) {
  const [termoResult, fotosResult] = await Promise.all([
    getTermoEntrada(lojaId, osId),
    listFotosEntrada(lojaId, osId),
  ]);

  const fotos = fotosResult.data ?? [];
  const fotosComUrl = await Promise.all(
    fotos.map(async (foto) => {
      const { url } = await getSignedUrlFoto(foto.storage_path);
      return { ...foto, url };
    })
  );

  let assinaturaUrl = termoResult.data?.assinatura_data_url ?? null;
  if (!assinaturaUrl && termoResult.data?.assinatura_storage_path) {
    const { url } = await getSignedUrlFoto(termoResult.data.assinatura_storage_path);
    assinaturaUrl = url;
  }

  return {
    termo: termoResult.data ?? null,
    fotos: fotosComUrl,
    assinaturaUrl,
    error: termoResult.error ?? fotosResult.error ?? null,
  };
}

export async function criarLinkAceiteCliente({ lojaId, osId, termoTexto, operadorId }) {
  const termoHash = await hashTermoTexto(termoTexto);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('ordem_servico_aceite_tokens')
    .delete()
    .eq('ordem_servico_id', osId)
    .eq('tipo', 'entrada')
    .is('usado_em', null);

  const { data, error } = await supabase
    .from('ordem_servico_aceite_tokens')
    .insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      tipo: 'entrada',
      termo_texto: termoTexto,
      termo_hash: termoHash,
      expires_at: expiresAt,
      created_by: operadorId || null,
    })
    .select('token, expires_at')
    .single();

  if (error) return { url: null, token: null, expiresAt: null, error };

  const url = `${window.location.origin}/aceite-os/${data.token}`;
  return { url, token: data.token, expiresAt: data.expires_at, error: null };
}

export async function obterAceitePorToken(token) {
  const { data, error } = await supabase.rpc('obter_aceite_os_token', { p_token: token });
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function confirmarAceiteCliente({ token, assinaturaDataUrl }) {
  const ip = await fetchIpCliente();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { data, error } = await supabase.rpc('confirmar_aceite_os_cliente', {
    p_token: token,
    p_assinatura_data_url: assinaturaDataUrl,
    p_ip: ip,
    p_user_agent: userAgent,
  });

  return { termoId: data, error };
}
