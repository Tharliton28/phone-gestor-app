import { Loader2, X } from 'lucide-react';
import { PLANOS, precoHintCiclo } from '../domain/lojaPlanos';

/**
 * Overlay de feedback durante geração do checkout e aguardo do pagamento.
 * Sempre permite desistir — a pessoa não pode ficar presa na tela.
 */
export default function CheckoutOverlay({
  fase,
  planoId,
  ciclo = 'mensal',
  rotulo = null,
  onDesistir,
}) {
  if (!fase) return null;

  const plano = planoId ? PLANOS[planoId] : null;
  const meta =
    rotulo ||
    (plano ? `${plano.label} · ${precoHintCiclo(planoId, ciclo)}` : null);
  const titulo =
    fase === 'preparando'
      ? 'Preparando pagamento seguro...'
      : 'Aguardando confirmação do pagamento';
  const texto =
    fase === 'preparando'
      ? 'Estamos gerando sua fatura. Em instantes você será direcionado ao checkout.'
      : `Conclua o pagamento na aba do Asaas. Assim que confirmar, liberamos automaticamente e avisamos aqui.`;

  const podeDesistir = typeof onDesistir === 'function';

  return (
    <div style={styles.backdrop} role="alertdialog" aria-live="assertive" aria-busy="true">
      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.card}>
        {podeDesistir ? (
          <button
            type="button"
            style={styles.closeBtn}
            onClick={onDesistir}
            aria-label="Fechar e desistir"
            title="Desistir"
          >
            <X size={18} />
          </button>
        ) : null}

        <Loader2 size={28} color="#38bdf8" style={{ animation: 'pg-spin 1s linear infinite' }} />
        <h3 style={styles.title}>{titulo}</h3>
        <p style={styles.text}>{texto}</p>
        {fase === 'aguardando' && meta ? (
          <p style={styles.meta}>{meta}</p>
        ) : null}

        {podeDesistir ? (
          <button type="button" style={styles.desistBtn} onClick={onDesistir}>
            Desistir da compra
          </button>
        ) : null}

        {fase === 'aguardando' ? (
          <p style={styles.hint}>
            Isso só fecha o aviso no Phone Gestor. Se já abriu a fatura no Asaas, você pode
            ignorá-la ou pagar depois.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(7, 10, 18, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    background: '#121624',
    border: '1px solid #2a2e3f',
    borderRadius: 12,
    padding: '28px 24px 22px',
    textAlign: 'center',
    color: '#e2e8f0',
    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid #2a2e3f',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: '16px 0 8px',
    fontSize: 18,
    fontWeight: 700,
  },
  text: {
    margin: 0,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1.5,
  },
  meta: {
    margin: '14px 0 0',
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 600,
  },
  desistBtn: {
    marginTop: 18,
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: '1px solid #3f465c',
    background: 'rgba(255,255,255,0.03)',
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    margin: '12px 0 0',
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.45,
  },
};
