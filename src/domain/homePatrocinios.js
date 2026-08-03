/**
 * Slots de mídia na home — prontos para API/CMS depois.
 * Hoje: inventário demo + placeholders "Anuncie aqui".
 */

export const HOME_PATROCINIOS_PADRAO = [
  {
    id: 'slot-apple-auth',
    tipo: 'patrocinado',
    titulo: 'Linha iPhone e acessórios originais',
    subtitulo: 'Reposição rápida · garantia de fábrica · condições para lojista',
    ctaLabel: 'Falar com o fornecedor',
    ctaUrl: 'https://wa.me/5585989733574?text=Quero%20anunciar%20na%20home%20do%20Phone%20Gestor',
    badge: 'Patrocinado',
    accent: '#38bdf8',
    gradiente: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 45%, #020617 100%)',
  },
  {
    id: 'slot-android-volume',
    tipo: 'patrocinado',
    titulo: 'Android seminovo com IMEI limpo',
    subtitulo: 'Lotes semanais · checklist técnico · frete para CE e Nordeste',
    ctaLabel: 'Ver condições',
    ctaUrl: 'https://wa.me/5585989733574?text=Quero%20espa%C3%A7o%20patrocinado%20Android',
    badge: 'Patrocinado',
    accent: '#60a5fa',
    gradiente: 'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #020617 100%)',
  },
  {
    id: 'slot-acessorios',
    tipo: 'patrocinado',
    titulo: 'Capas, películas e carregadores no atacado',
    subtitulo: 'Margem alta no balcão · catálogo atualizado toda semana',
    ctaLabel: 'Pedir catálogo',
    ctaUrl: 'https://wa.me/5585989733574?text=Quero%20anunciar%20acess%C3%B3rios',
    badge: 'Patrocinado',
    accent: '#38bdf8',
    gradiente: 'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #020617 100%)',
  },
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

export function listHomePatrocinios(slots = HOME_PATROCINIOS_PADRAO) {
  return Array.isArray(slots) && slots.length ? slots : HOME_PATROCINIOS_PADRAO;
}
