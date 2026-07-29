import { supabase } from '../lib/supabaseClient';
import {
  dataUrlToBlob,
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
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${lojaId}/${osId}/${suffix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_OS_EVIDENCIAS)
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) return { path: null, error };
  return { path, error: null };
}

export async function uploadFotosEntrada(lojaId, osId, files, operadorId) {
  const erros = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const { path, error: uploadError } = await uploadBlob(lojaId, osId, file, `entrada-foto-${i}`);

    if (uploadError) {
      erros.push(uploadError);
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

  let assinaturaPath = null;

  if (assinaturaDataUrl) {
    const blob = dataUrlToBlob(assinaturaDataUrl);
    const { path, error: uploadError } = await uploadBlob(lojaId, osId, blob, 'entrada-assinatura');
    if (uploadError) return { data: null, error: uploadError };
    assinaturaPath = path;
  }

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
      assinatura_storage_path: assinaturaPath,
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

  let assinaturaUrl = null;
  if (termoResult.data?.assinatura_storage_path) {
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
