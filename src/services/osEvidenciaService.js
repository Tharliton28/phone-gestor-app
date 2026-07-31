import { supabase } from '../lib/supabaseClient';
import {
  fetchIpCliente,
  hashTermoTexto,
  substituirVariaveisTermo,
  TERMO_OS_PADRAO,
  TERMO_OS_SAIDA_PADRAO,
} from '../domain/osTermo';
import { calcChecklistEvidencias } from '../domain/osEvidencias';

export const BUCKET_OS_EVIDENCIAS = 'os-evidencias';

export { TERMO_OS_PADRAO, TERMO_OS_SAIDA_PADRAO, substituirVariaveisTermo };

export async function getTermo(lojaId, osId, tipo = 'entrada') {
  return supabase
    .from('ordem_servico_termos')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ordem_servico_id', osId)
    .eq('tipo', tipo)
    .maybeSingle();
}

export const getTermoEntrada = (lojaId, osId) => getTermo(lojaId, osId, 'entrada');
export const getTermoSaida = (lojaId, osId) => getTermo(lojaId, osId, 'saida');

export async function listFotos(lojaId, osId, momento = 'entrada') {
  return supabase
    .from('ordem_servico_fotos')
    .select('id, storage_path, legenda, created_at')
    .eq('loja_id', lojaId)
    .eq('ordem_servico_id', osId)
    .eq('momento', momento)
    .order('created_at', { ascending: true });
}

export const listFotosEntrada = (lojaId, osId) => listFotos(lojaId, osId, 'entrada');
export const listFotosSaida = (lojaId, osId) => listFotos(lojaId, osId, 'saida');

/** Momentos de foto. 'durante' não tem termo/assinatura: é evidência técnica interna. */
export const MOMENTO_FOTO = {
  ENTRADA: 'entrada',
  DURANTE: 'durante',
  SAIDA: 'saida',
};

export async function listFotosComUrl(lojaId, osId, momento) {
  const { data, error } = await listFotos(lojaId, osId, momento);
  if (error) return { fotos: [], error };

  const fotos = await Promise.all(
    (data ?? []).map(async (foto) => {
      const { url } = await getSignedUrlFoto(foto.storage_path);
      return { ...foto, url };
    })
  );

  return { fotos, error: null };
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
    return new Error(`${contexto}: bucket "os-evidencias" não existe. Rode a migration 014.`);
  }
  if (msg.includes('mime type') || msg.includes('invalid')) {
    return new Error(`${contexto}: formato de imagem não permitido. Use JPG ou PNG.`);
  }
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return new Error(`${contexto}: permissão negada no Storage. Rode a migration 015.`);
  }
  return new Error(`${contexto}: ${msg}`);
}

export async function uploadFotos(lojaId, osId, files, momento, operadorId) {
  const erros = [];
  let salvas = 0;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const { path, error: uploadError } = await uploadBlob(lojaId, osId, file, `${momento}-foto-${i}`);

    if (uploadError) {
      erros.push(formatStorageError(uploadError, `Foto ${i + 1}`));
      continue;
    }

    const { error: dbError } = await supabase.from('ordem_servico_fotos').insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      momento,
      storage_path: path,
      uploaded_por: operadorId || null,
    });

    if (dbError) {
      erros.push(new Error(`Foto ${i + 1}: ${dbError.message ?? 'erro ao registrar no banco.'}`));
      continue;
    }

    salvas += 1;
  }

  if (salvas === 0 && erros.length > 0) {
    return { error: erros[0], salvas: 0 };
  }

  if (erros.length > 0) {
    return {
      error: new Error(`${salvas} foto(s) salva(s), mas ${erros.length} falhou(ram): ${erros[0].message}`),
      salvas,
    };
  }

  return { error: null, salvas };
}

export const uploadFotosEntrada = (lojaId, osId, files, operadorId) =>
  uploadFotos(lojaId, osId, files, 'entrada', operadorId);

export const uploadFotosSaida = (lojaId, osId, files, operadorId) =>
  uploadFotos(lojaId, osId, files, 'saida', operadorId);

async function registrarTermoLoja({
  lojaId, osId, tipo, termoTexto, assinaturaDataUrl, operadorId,
}) {
  const existente = await getTermo(lojaId, osId, tipo);
  if (existente.data) {
    return { data: existente.data, error: new Error('Termo já registrado para esta OS.') };
  }

  const termoHash = await hashTermoTexto(termoTexto);
  const ip = await fetchIpCliente();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  return supabase
    .from('ordem_servico_termos')
    .insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      tipo,
      termo_texto: termoTexto,
      termo_hash: termoHash,
      ip_cliente: ip,
      user_agent: userAgent,
      assinatura_data_url: assinaturaDataUrl || null,
      origem_assinatura: 'loja',
      registrado_por: operadorId || null,
    })
    .select()
    .single();
}

export const registrarTermoEntrada = (params) => registrarTermoLoja({ ...params, tipo: 'entrada' });
export const registrarTermoSaida = (params) => registrarTermoLoja({ ...params, tipo: 'saida' });

export async function getOsEvidencias(lojaId, osId, tipo = 'entrada') {
  const [termoResult, fotosResult] = await Promise.all([
    getTermo(lojaId, osId, tipo),
    listFotosComUrl(lojaId, osId, tipo),
  ]);

  const fotosComUrl = fotosResult.fotos;

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

export const getOsEvidenciasEntrada = (lojaId, osId) => getOsEvidencias(lojaId, osId, 'entrada');
export const getOsEvidenciasSaida = (lojaId, osId) => getOsEvidencias(lojaId, osId, 'saida');

export async function getChecklistOs(lojaId, osId, config, tipo = 'entrada') {
  const { termo, fotos } = await getOsEvidencias(lojaId, osId, tipo);
  const exigirTermo = tipo === 'saida' ? config.exigirTermoSaida : config.exigirTermoEntrada;
  const exigirFoto = tipo === 'saida' ? config.exigirFotoSaida : config.exigirFotoEntrada;
  return calcChecklistEvidencias({ termo, fotos, exigirTermo, exigirFoto });
}

export async function getLinkAceitePendente(lojaId, osId, tipo = 'entrada') {
  const { data, error } = await supabase
    .from('ordem_servico_aceite_tokens')
    .select('token, expires_at')
    .eq('loja_id', lojaId)
    .eq('ordem_servico_id', osId)
    .eq('tipo', tipo)
    .is('usado_em', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data?.token) {
    return { url: null, error };
  }

  return {
    url: `${window.location.origin}/aceite-os/${data.token}`,
    token: data.token,
    expiresAt: data.expires_at,
    error: null,
  };
}

export async function criarLinkAceiteCliente({
  lojaId, osId, termoTexto, operadorId, tipo = 'entrada',
}) {
  const termoExistente = await getTermo(lojaId, osId, tipo);
  if (termoExistente.data) {
    return {
      url: null,
      token: null,
      expiresAt: null,
      error: new Error('Termo já registrado para esta OS.'),
    };
  }

  const termoHash = await hashTermoTexto(termoTexto);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const novoToken = crypto.randomUUID();

  const { error: deleteError } = await supabase
    .from('ordem_servico_aceite_tokens')
    .delete()
    .eq('ordem_servico_id', osId)
    .eq('tipo', tipo);

  if (deleteError) {
    return {
      url: null,
      token: null,
      expiresAt: null,
      error: new Error(
        `Não foi possível atualizar o link (${deleteError.message}). Rode a migration 017 no Supabase.`
      ),
    };
  }

  const { data, error } = await supabase
    .from('ordem_servico_aceite_tokens')
    .insert({
      loja_id: lojaId,
      ordem_servico_id: osId,
      tipo,
      token: novoToken,
      termo_texto: termoTexto,
      termo_hash: termoHash,
      expires_at: expiresAt,
      created_by: operadorId || null,
    })
    .select('token, expires_at')
    .single();

  if (error) {
    const msg = error.message?.includes('ordem_servico_aceite_tokens_os_tipo_uidx')
      ? 'Já existe um link para esta OS. Rode a migration 017 no Supabase e tente novamente.'
      : (error.message ?? 'Erro ao gerar link.');
    return { url: null, token: null, expiresAt: null, error: new Error(msg) };
  }

  const url = `${window.location.origin}/aceite-os/${data.token}`;
  return { url, token: data.token, expiresAt: data.expires_at, error: null };
}

export async function obterAceitePorToken(token) {
  const { data, error } = await supabase.rpc('obter_aceite_os_token', { p_token: token });
  if (error) return { data: null, error };

  // O visitante anônimo só consegue assinar as URLs enquanto o token está válido.
  const fotos = await Promise.all(
    (data?.fotos ?? []).map(async (storagePath, i) => {
      const { url } = await getSignedUrlFoto(storagePath);
      return { id: storagePath, url, nome: `Foto ${i + 1}` };
    })
  );

  return { data: { ...data, fotos: fotos.filter((foto) => foto.url) }, error: null };
}

export async function confirmarAceiteCliente({ token, assinaturaDataUrl, cpfCliente }) {
  const ip = await fetchIpCliente();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  const { data, error } = await supabase.rpc('confirmar_aceite_os_cliente', {
    p_token: token,
    p_assinatura_data_url: assinaturaDataUrl,
    p_ip: ip,
    p_user_agent: userAgent,
    p_cpf_cliente: cpfCliente || null,
  });

  return { termoId: data, error };
}

/** Guarda snapshot HTML da via assinada (comprovante permanente). */
export async function arquivarViaHtml({ lojaId, osId, termoId, html, pathExistente = null }) {
  if (pathExistente) return { path: pathExistente, error: null };
  if (!lojaId || !osId || !termoId || !html) {
    return { path: null, error: new Error('Dados insuficientes para arquivar a via.') };
  }

  const path = `${lojaId}/${osId}/via-${termoId}.html`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_OS_EVIDENCIAS)
    .upload(path, blob, { contentType: 'text/html', upsert: true });

  if (uploadError) {
    return { path: null, error: formatStorageError(uploadError, 'Arquivo da via') };
  }

  const { error: dbError } = await supabase
    .from('ordem_servico_termos')
    .update({ via_html_storage_path: path })
    .eq('id', termoId)
    .eq('loja_id', lojaId);

  if (dbError) return { path: null, error: dbError };
  return { path, error: null };
}

export async function abrirViaArquivada(storagePath) {
  if (!storagePath) return { url: null, error: new Error('Comprovante ainda não arquivado.') };
  const { url, error } = await getSignedUrlFoto(storagePath);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
  return { url, error };
}
