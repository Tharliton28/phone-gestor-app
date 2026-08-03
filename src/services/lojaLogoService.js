import { supabase } from '../lib/supabaseClient';

const BUCKET = 'loja-assets';
const MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];

export async function uploadLogoLoja(lojaId, file) {
  if (!lojaId) return { logoUrl: null, error: new Error('Loja não informada.') };
  if (!file) return { logoUrl: null, error: new Error('Selecione uma imagem.') };
  if (!TIPOS.includes(file.type)) {
    return { logoUrl: null, error: new Error('Use PNG, JPG ou WEBP.') };
  }
  if (file.size > MAX_BYTES) {
    return { logoUrl: null, error: new Error('Imagem acima de 2MB.') };
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${lojaId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

  if (uploadError) {
    return { logoUrl: null, error: new Error(uploadError.message ?? 'Falha no upload.') };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('lojas')
    .update({ logo_url: logoUrl })
    .eq('id', lojaId);

  if (updateError) {
    return { logoUrl: null, error: new Error(updateError.message ?? 'Upload ok, mas falhou ao salvar na loja.') };
  }

  return { logoUrl, error: null };
}
