import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlanoDef } from '../domain/lojaPlanos';
import { getLojaEntitlements } from '../services/lojaPlanoService';

const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

function pagamentoConfirmado(antes, agora, planoEsperado) {
  if (!agora?.assinaturaAtiva || agora.assinaturaStatus !== 'ativa') return false;
  if (agora.plano !== planoEsperado) return false;
  if (agora.assinaturaOrigem === 'gateway') return true;
  if (antes && antes.plano !== agora.plano) return true;
  if (antes && antes.assinaturaExpiraEm !== agora.assinaturaExpiraEm) return true;
  return false;
}

export function mensagemPlanoAtivado(planoId) {
  const def = getPlanoDef(planoId);
  const destaques = (def.destaques || []).map((d) => `• ${d}`).join('\n');
  return (
    `Pagamento confirmado.\n\n` +
    `Sua loja agora está no plano ${def.label} (${def.precoHint}).\n\n` +
    `Recursos liberados:\n${destaques}`
  );
}

/**
 * Após abrir o checkout Asaas: monitora webhook + foco da aba
 * e dispara callback quando o plano esperado fica ativo.
 */
export function useCheckoutAssinatura({ lojaId, onAtivado, onTimeout }) {
  const [aguardando, setAguardando] = useState(null); // { planoId, desde }
  const baselineRef = useRef(null);
  const onAtivadoRef = useRef(onAtivado);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onAtivadoRef.current = onAtivado;
    onTimeoutRef.current = onTimeout;
  }, [onAtivado, onTimeout]);

  const parar = useCallback(() => {
    setAguardando(null);
    baselineRef.current = null;
  }, []);

  const iniciar = useCallback(
    async (planoId, baselineEntitlements = null) => {
      if (!lojaId || !planoId) return;

      let baseline = baselineEntitlements;
      if (!baseline) {
        const { data } = await getLojaEntitlements(lojaId);
        baseline = data;
      }
      baselineRef.current = baseline;
      setAguardando({ planoId, desde: Date.now() });
    },
    [lojaId]
  );

  useEffect(() => {
    if (!aguardando || !lojaId) return;

    let cancelled = false;
    const { planoId, desde } = aguardando;

    const verificar = async () => {
      if (cancelled) return;
      if (Date.now() - desde > TIMEOUT_MS) {
        setAguardando(null);
        onTimeoutRef.current?.(planoId);
        return;
      }

      const { data } = await getLojaEntitlements(lojaId);
      if (cancelled || !data) return;

      if (pagamentoConfirmado(baselineRef.current, data, planoId)) {
        setAguardando(null);
        onAtivadoRef.current?.(data);
      }
    };

    verificar();
    const id = window.setInterval(verificar, POLL_MS);

    const onFocus = () => {
      verificar();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') verificar();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [aguardando, lojaId]);

  return {
    aguardandoPlanoId: aguardando?.planoId ?? null,
    iniciarMonitoramento: iniciar,
    pararMonitoramento: parar,
  };
}
