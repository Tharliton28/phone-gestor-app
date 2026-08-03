import React from 'react';
import { FileText, Receipt } from 'lucide-react';

/**
 * Hub de documentos — sem lista mock.
 * NFC-e real fica no Painel Fiscal; recibo/garantia saem da venda/OS.
 */
const RecibosNotas = ({ aoMudarTela }) => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Receipt size={28} color="#38bdf8" />
        <h2 style={styles.title}>Recibos e documentos</h2>
        <p style={styles.text}>
          Esta tela não usa mais dados fictícios. Documentos fiscais (NFC-e) estão no{' '}
          <strong>Painel Fiscal</strong>. Recibo de venda e termo de garantia saem do fluxo da
          venda / OS quando gerados.
        </p>
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.btnPrimary}
            onClick={() => aoMudarTela?.('painel-fiscal')}
          >
            <FileText size={14} /> Abrir Painel Fiscal
          </button>
          <button
            type="button"
            style={styles.btnGhost}
            onClick={() => aoMudarTela?.('recibo-garantia', 'recibos-notas')}
          >
            Modelo recibo / garantia
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    minHeight: '100%',
    backgroundColor: '#0b0d14',
  },
  card: {
    maxWidth: '560px',
    margin: '40px auto',
    padding: '28px',
    backgroundColor: '#12141f',
    border: '1px solid #1f2233',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: { margin: 0, color: '#e2e8f0', fontSize: '20px' },
  text: { margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: 1.55 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #2a2e3f',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
};

export default RecibosNotas;
