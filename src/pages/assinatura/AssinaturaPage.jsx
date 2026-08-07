import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Coins, Zap } from 'lucide-react';
import LojaCreditosPanel from '../../components/LojaCreditosPanel';
import LojaPlanoPanel from '../../components/LojaPlanoPanel';
import { useErpNavigation } from '../../hooks/useErpNavigation';

const ABA_KEY = 'phonegestor_assinatura_aba';

function lerAbaInicial(dadosNavegacao) {
  const fromNav = dadosNavegacao?.aba;
  if (fromNav === 'plano' || fromNav === 'creditos') return fromNav;
  try {
    const stored = sessionStorage.getItem(ABA_KEY);
    if (stored === 'plano' || stored === 'creditos') return stored;
  } catch {
    /* ignore */
  }
  return 'plano';
}

export default function AssinaturaPage() {
  const { dadosNavegacao } = useErpNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const [aba, setAbaState] = useState(() => lerAbaInicial(dadosNavegacao));

  const setAba = (next) => {
    setAbaState(next);
    try {
      sessionStorage.setItem(ABA_KEY, next);
    } catch {
      /* ignore */
    }
    navigate(location.pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        dadosNavegacao: {
          ...(location.state?.dadosNavegacao || {}),
          aba: next,
        },
      },
    });
  };

  useEffect(() => {
    const next = dadosNavegacao?.aba;
    if (next === 'plano' || next === 'creditos') {
      setAbaState(next);
      try {
        sessionStorage.setItem(ABA_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }, [dadosNavegacao?.aba]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Assinatura</h2>
          <p style={styles.subtitle}>
            Plano do software e créditos para APIs (NFC-e, consultas). Pagamento seguro via Asaas.
          </p>
        </div>
      </div>

      <div style={styles.tabs} role="tablist" aria-label="Assinatura">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'plano'}
          style={{ ...styles.tab, ...(aba === 'plano' ? styles.tabAtiva : {}) }}
          onClick={() => setAba('plano')}
        >
          <Zap size={15} /> Plano
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'creditos'}
          style={{ ...styles.tab, ...(aba === 'creditos' ? styles.tabAtiva : {}) }}
          onClick={() => setAba('creditos')}
        >
          <Coins size={15} /> Créditos
        </button>
      </div>

      <div style={styles.content}>
        {aba === 'plano' ? (
          <>
            <h3 style={styles.sectionTitle}>Plano da loja</h3>
            <LojaPlanoPanel />
          </>
        ) : (
          <>
            <h3 style={styles.sectionTitle}>Créditos da loja</h3>
            <LojaCreditosPanel />
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  title: { margin: 0, color: '#e2e8f0', fontSize: 20, fontWeight: 600 },
  subtitle: { margin: '6px 0 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.45, maxWidth: 640 },
  tabs: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 4,
    background: '#0f111a',
    border: '1px solid #2a2e3f',
    borderRadius: 10,
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  tabAtiva: {
    background: 'rgba(56,189,248,0.12)',
    color: '#e2e8f0',
    boxShadow: 'inset 0 0 0 1px rgba(56,189,248,0.35)',
  },
  content: {
    background: '#0f111a',
    border: '1px solid #1f2233',
    borderRadius: 10,
    padding: 18,
  },
  sectionTitle: { margin: '0 0 14px', color: '#e2e8f0', fontSize: 15, fontWeight: 600 },
};
