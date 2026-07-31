/** Evento leve para sincronizar saldo na topbar sem Context global. */
export const CREDITOS_ATUALIZADOS_EVENT = 'phonegestor:creditos-atualizados';

export function emitirCreditosAtualizados(saldo) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CREDITOS_ATUALIZADOS_EVENT, {
    detail: { saldo: Number(saldo) || 0 },
  }));
}
