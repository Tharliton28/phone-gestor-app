import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { PLANOS, PLANOS_IDS } from '../domain/lojaPlanos';
import {
  mensagemPlanoAtivado,
  reivindicarAvisoSucessoCheckout,
  useCheckoutAssinatura,
} from '../hooks/useCheckoutAssinatura';
import { criarCheckoutAsaas, getLojaEntitlements } from '../services/lojaPlanoService';
import CheckoutOverlay from './CheckoutOverlay';

const WHATSAPP_REDE = '5585989733574';

export default function LojaPlanoPanel() {
  const { lojaAtivaId, papelAtivo, recarregar } = useLoja();
  const { alert, confirm } = useDialog();
  const [entitlements, setEntitlements] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [faseCheckout, setFaseCheckout] = useState(null); // preparando | aguardando | null
  const [planoCheckoutId, setPlanoCheckoutId] = useState(null);

  const podeEditar = ['owner', 'admin'].includes(papelAtivo);

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);
    const { data, error } = await getLojaEntitlements(lojaAtivaId);
    if (error) {
      await alert(error.message ?? 'Erro ao carregar plano.', { type: 'error', title: 'Plano' });
      setEntitlements(null);
    } else {
      setEntitlements(data);
    }
    setCarregando(false);
    return data;
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const { aguardandoPlanoId, iniciarMonitoramento, pararMonitoramento } = useCheckoutAssinatura({
    lojaId: lojaAtivaId,
    onAtivado: async (data) => {
      setFaseCheckout(null);
      setPlanoCheckoutId(null);
      setEntitlements(data);
      await recarregar?.();
      if (reivindicarAvisoSucessoCheckout()) {
        await alert(mensagemPlanoAtivado(data.plano), {
          type: 'success',
          title: 'Pagamento confirmado',
        });
      }
    },
    onTimeout: async (planoId) => {
      setFaseCheckout(null);
      setPlanoCheckoutId(null);
      const def = PLANOS[planoId];
      await alert(
        `Ainda não recebemos a confirmação do plano ${def?.label || ''}. Se você já pagou, clique em Atualizar.`,
        { type: 'warning', title: 'Aguardando confirmação' }
      );
    },
  });

  useEffect(() => {
    if (aguardandoPlanoId) {
      setFaseCheckout('aguardando');
      setPlanoCheckoutId(aguardandoPlanoId);
    }
  }, [aguardandoPlanoId]);

  const desistirCheckout = () => {
    pararMonitoramento();
    setFaseCheckout(null);
    setPlanoCheckoutId(null);
  };

  const assinarPlano = async (planoId) => {
    if (!podeEditar || !lojaAtivaId || faseCheckout) return;

    const def = PLANOS[planoId];
    if (!def.checkoutDisponivel) {
      const texto = encodeURIComponent(
        `Olá! Quero o plano Rede do PhoneGestor para a minha loja.`
      );
      window.open(`https://wa.me/${WHATSAPP_REDE}?text=${texto}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const ok = await confirm(
      `Assinar ${def.label} (${def.precoHint})?\n\nVocê será levado ao checkout seguro (PIX, boleto ou cartão). Assim que o pagamento for confirmado, liberamos automaticamente os recursos deste plano.`,
      {
        title: 'Assinar plano',
        confirmLabel: 'Ir para pagamento',
        confirmVariant: 'primary',
      }
    );
    if (!ok) return;

    setPlanoCheckoutId(planoId);
    setFaseCheckout('preparando');
    const baseline = entitlements;
    const { data, error } = await criarCheckoutAsaas(lojaAtivaId, planoId);

    if (error) {
      setFaseCheckout(null);
      setPlanoCheckoutId(null);
      await alert(error.message ?? 'Não foi possível iniciar o pagamento.', {
        type: 'error',
        title: 'Checkout',
      });
      return;
    }

    window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    setFaseCheckout('aguardando');
    await iniciarMonitoramento(planoId, baseline);
  };

  if (carregando) {
    return <p style={styles.muted}>Carregando plano da loja...</p>;
  }

  if (!entitlements) {
    return (
      <div style={styles.wrap}>
        <p style={styles.muted}>Não foi possível carregar o plano.</p>
        <button type="button" style={styles.btnGhost} onClick={carregar}>
          <RefreshCw size={14} /> Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <CheckoutOverlay
        fase={faseCheckout}
        planoId={planoCheckoutId}
        onDesistir={faseCheckout === 'preparando' ? undefined : desistirCheckout}
      />

      <div style={styles.atualCard}>
        <CreditCard size={20} color="#38bdf8" />
        <div style={{ flex: 1 }}>
          <p style={styles.atualLabel}>Plano atual</p>
          <p style={styles.atualValor}>
            {entitlements.label}
            <span style={styles.badge}>{entitlements.assinaturaStatus}</span>
          </p>
          <p style={styles.meta}>
            {entitlements.usuariosAtivos}/{entitlements.maxUsuarios} usuários · NFC-e{' '}
            {entitlements.podeNfce ? 'liberada' : 'bloqueada'} · Consultas{' '}
            {entitlements.podeConsultas ? 'no contrato (API depois)' : 'plano Rede'}
          </p>
          <p style={styles.meta}>
            {entitlements.assinaturaExpiraEm
              ? `Vigência até ${new Date(entitlements.assinaturaExpiraEm).toLocaleDateString('pt-BR')}`
              : 'Sem data de expiração'}
            {!entitlements.assinaturaAtiva ? ' · BLOQUEADA' : ''}
          </p>
        </div>
        <button
          type="button"
          style={styles.btnGhost}
          onClick={carregar}
          disabled={Boolean(faseCheckout)}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <p style={styles.ajuda}>
        Escolha um plano para assinar. O pagamento é processado com segurança e, após a
        confirmação, os recursos do contrato são liberados na hora — com aviso no sistema.
      </p>

      <div style={styles.grid}>
        {PLANOS_IDS.map((id) => {
          const def = PLANOS[id];
          const ativo =
            entitlements.plano === id &&
            entitlements.assinaturaAtiva &&
            entitlements.assinaturaStatus === 'ativa';
          const nesteCheckout = planoCheckoutId === id && Boolean(faseCheckout);
          return (
            <button
              key={id}
              type="button"
              style={{
                ...styles.card,
                ...(ativo ? styles.cardAtivo : {}),
                ...(nesteCheckout ? styles.cardWaiting : {}),
              }}
              disabled={!podeEditar || Boolean(faseCheckout)}
              onClick={() => assinarPlano(id)}
            >
              <strong>{def.label}</strong>
              <span style={styles.preco}>{def.precoHint}</span>
              <ul style={styles.lista}>
                {def.destaques.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <span style={styles.cta}>
                {nesteCheckout
                  ? faseCheckout === 'preparando'
                    ? 'Preparando checkout...'
                    : 'Aguardando pagamento...'
                  : ativo
                    ? 'Plano ativo'
                    : !podeEditar
                      ? 'Só owner/admin'
                      : def.checkoutDisponivel
                        ? (
                          <>
                            Assinar <ExternalLink size={12} style={{ marginLeft: 4 }} />
                          </>
                          )
                        : 'Falar no WhatsApp'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  atualCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#0f111a',
    border: '1px solid #2a2e3f',
    borderRadius: '8px',
  },
  atualLabel: { margin: 0, color: '#94a3b8', fontSize: '12px' },
  atualValor: {
    margin: '2px 0 6px',
    color: '#e2e8f0',
    fontSize: '20px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#86efac',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.35)',
    borderRadius: '999px',
    padding: '2px 8px',
  },
  meta: { margin: '2px 0 0', color: '#94a3b8', fontSize: '12px', lineHeight: 1.45 },
  ajuda: { margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
  },
  card: {
    backgroundColor: '#161925',
    border: '1px solid #2a2e3f',
    borderRadius: '8px',
    padding: '14px',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  cardAtivo: {
    borderColor: '#38bdf8',
    boxShadow: '0 0 0 1px rgba(56,189,248,0.35)',
  },
  cardWaiting: {
    borderColor: '#fbbf24',
    boxShadow: '0 0 0 1px rgba(251,191,36,0.35)',
  },
  preco: { color: '#94a3b8', fontSize: '12px' },
  lista: {
    margin: '6px 0 0',
    paddingLeft: '18px',
    color: '#cbd5e1',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  cta: {
    marginTop: '8px',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnGhost: {
    marginLeft: 'auto',
    background: 'transparent',
    border: '1px solid #2a2e3f',
    color: '#94a3b8',
    borderRadius: '6px',
    padding: '8px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    gap: '6px',
    fontSize: '12px',
    alignItems: 'center',
  },
  muted: { color: '#64748b', fontSize: '13px' },
};
