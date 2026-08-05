import { useEffect, useState } from 'react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import {
  mensagemPlanoAtivado,
  reivindicarAvisoSucessoCheckout,
  useCheckoutAssinatura,
} from '../hooks/useCheckoutAssinatura';
import CheckoutOverlay from './CheckoutOverlay';

/**
 * Mantém o monitoramento de pagamento ativo em qualquer tela do ERP
 * (não só em Configurações → Plano).
 */
export default function CheckoutMonitorGlobal() {
  const { lojaAtivaId, recarregar } = useLoja();
  const { alert } = useDialog();
  const [mostrarOverlay, setMostrarOverlay] = useState(false);

  const { aguardandoPlanoId, pararMonitoramento } = useCheckoutAssinatura({
    lojaId: lojaAtivaId,
    autoResume: true,
    onAtivado: async (data) => {
      setMostrarOverlay(false);
      await recarregar?.();
      if (reivindicarAvisoSucessoCheckout()) {
        await alert(mensagemPlanoAtivado(data.plano), {
          type: 'success',
          title: 'Pagamento confirmado',
        });
      }
    },
    onTimeout: () => {
      setMostrarOverlay(false);
    },
  });

  useEffect(() => {
    setMostrarOverlay(Boolean(aguardandoPlanoId));
  }, [aguardandoPlanoId]);

  if (!mostrarOverlay || !aguardandoPlanoId) return null;

  return (
    <CheckoutOverlay
      fase="aguardando"
      planoId={aguardandoPlanoId}
      onDesistir={() => {
        pararMonitoramento();
        setMostrarOverlay(false);
      }}
    />
  );
}
