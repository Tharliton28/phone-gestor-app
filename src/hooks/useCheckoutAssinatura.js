import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlanoDef } from '../domain/lojaPlanos';
import { getLojaEntitlements } from '../services/lojaPlanoService';

const POLL_MS = 2500;
const TIMEOUT_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'phonegestor_checkout_pendente';

function pagamentoConfirmado(antes, agora, planoEsperado) {
  if (!agora?.assinaturaAtiva || agora.assinaturaStatus !== 'ativa') return false;
  if (agora.plano !== planoEsperado) return false;
  if (agora.assinaturaOrigem === 'gateway') return true;
  if (antes && antes.plano !== agora.plano) return true;
  if (antes && antes.assinaturaExpiraEm !== agora.assinaturaExpiraEm) return true;
  return false;
}

function lerPendente() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function salvarPendente(payload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function limparPendente() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
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

/** Evita dois modais de sucesso se Plano + monitor global detectarem juntos. */
let ultimoSucessoEm = 0;
export function reivindicarAvisoSucessoCheckout() {
  const agora = Date.now();
  if (agora - ultimoSucessoEm < 8000) return false;
  ultimoSucessoEm = agora;
  return true;
}

/**
 * Monitora ativação pós-checkout Asaas.
 * Persiste em sessionStorage para sobreviver a reload / troca de aba.
 */
export function useCheckoutAssinatura({ lojaId, onAtivado, onTimeout, autoResume = true }) {
  const [aguardando, setAguardando] = useState(null); // { planoId, desde }
  const baselineRef = useRef(null);
  const ativadoRef = useRef(false);
  const onAtivadoRef = useRef(onAtivado);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onAtivadoRef.current = onAtivado;
    onTimeoutRef.current = onTimeout;
  }, [onAtivado, onTimeout]);

  const parar = useCallback(() => {
    setAguardando(null);
    baselineRef.current = null;
    limparPendente();
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
      ativadoRef.current = false;
      const desde = Date.now();
      const payload = {
        lojaId,
        planoId,
        desde,
        baseline,
      };
      salvarPendente(payload);
      setAguardando({ planoId, desde });
    },
    [lojaId]
  );

  // Retoma monitoramento após F5 / voltar à página
  useEffect(() => {
    if (!autoResume || !lojaId) return;
    const pendente = lerPendente();
    if (!pendente || pendente.lojaId !== lojaId || !pendente.planoId) return;
    if (Date.now() - (pendente.desde || 0) > TIMEOUT_MS) {
      limparPendente();
      return;
    }
    baselineRef.current = pendente.baseline || null;
    setAguardando({ planoId: pendente.planoId, desde: pendente.desde || Date.now() });
  }, [autoResume, lojaId]);

  useEffect(() => {
    if (!aguardando || !lojaId) return;

    let cancelled = false;
    const { planoId, desde } = aguardando;

    const verificar = async () => {
      if (cancelled || ativadoRef.current) return;
      if (Date.now() - desde > TIMEOUT_MS) {
        setAguardando(null);
        limparPendente();
        onTimeoutRef.current?.(planoId);
        return;
      }

      const { data } = await getLojaEntitlements(lojaId);
      if (cancelled || !data || ativadoRef.current) return;

      if (pagamentoConfirmado(baselineRef.current, data, planoId)) {
        ativadoRef.current = true;
        setAguardando(null);
        limparPendente();
        onAtivadoRef.current?.(data);
      }
    };

    verificar();
    const id = window.setInterval(verificar, POLL_MS);

    const onFocus = () => verificar();
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
