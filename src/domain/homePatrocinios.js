/**
 * Slots de mídia na home — prontos para API/CMS.
 * Inventário fake de fornecedores foi removido (GTM honesty).
 * HOME_PATROCINIOS_PADRAO: slot opcional "Anuncie aqui" — não usado como fallback automático.
 */

export const HOME_PATROCINIOS_PADRAO = [
  {
    id: 'slot-vazio',
    tipo: 'disponivel',
    titulo: 'Seu fornecedor aqui',
    subtitulo: 'Espaço premium na home de lojistas Phone Gestor — celulares, peças e acessórios.',
    ctaLabel: 'Anunciar neste espaço',
    ctaUrl: 'https://wa.me/5585989733574?text=Quero%20comprar%20espa%C3%A7o%20na%20home%20do%20Phone%20Gestor',
    badge: 'Espaço disponível',
    accent: '#93c5fd',
    gradiente: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #020617 100%)',
  },
];

/** Retorna os slots fornecidos; array vazio = carousel oculto (sem seed fake). */
export function listHomePatrocinios(slots = []) {
  return Array.isArray(slots) ? slots : [];
}
