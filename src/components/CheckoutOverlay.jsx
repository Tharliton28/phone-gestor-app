import { Loader2 } from 'lucide-react';
import { PLANOS } from '../domain/lojaPlanos';

/**
 * Overlay de feedback durante geração do checkout e aguardo do pagamento.
 */
export default function CheckoutOverlay({ fase, planoId }) {
  if (!fase) return null;

  const plano = planoId ? PLANOS[planoId] : null;
  const titulo =
    fase === 'preparando'
      ? 'Preparando pagamento seguro...'
      : 'Aguardando confirmação do pagamento';
  const texto =
    fase === 'preparando'
      ? 'Estamos gerando sua fatura. Em instantes você será direcionado ao checkout.'
      : `Conclua o pagamento do plano ${plano?.label || ''} na aba do Asaas. Assim que confirmar, liberamos os recursos automaticamente e avisamos aqui.`;

  return (
    <div style={styles.backdrop} role="alertdialog" aria-live="assertive" aria-busy="true">
      <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.card}>
        <Loader2 size={28} color="#38bdf8" style={{ animation: 'pg-spin 1s linear infinite' }} />
        <h3 style={styles.title}>{titulo}</h3>
        <p style={styles.text}>{texto}</p>
        {fase === 'aguardando' && plano ? (
          <p style={styles.meta}>
            {plano.label} · {plano.precoHint}
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
    width: '100%',
    maxWidth: 420,
    background: '#121624',
    border: '1px solid #2a2e3f',
    borderRadius: 12,
    padding: '28px 24px',
    textAlign: 'center',
    color: '#e2e8f0',
    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
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
};
