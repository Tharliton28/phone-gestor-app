/** Navegadores desktop não exibem HEIC/HEIF em <img>; o upload segue normal. */
export function podePrevisualizarImagem(file) {
  const type = (file?.type ?? '').toLowerCase();
  if (!type) return true;
  if (type.includes('heic') || type.includes('heif')) return false;
  return type.startsWith('image/');
}

export function criarPreviewPendente(file) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const previewUrl = podePrevisualizarImagem(file) ? URL.createObjectURL(file) : null;
  return { id, file, previewUrl, nome: file.name || 'foto' };
}

export function revogarPreviewPendente(item) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
}
