import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { PLANOS, PLANOS_IDS } from '../domain/lojaPlanos';
import { atualizarPlanoLoja, getLojaEntitlements } from '../services/lojaPlanoService';

export default function LojaPlanoPanel() {
  const { lojaAtivaId, papelAtivo, recarregar } = useLoja();
  const { alert, confirm } = useDialog();
  const [entitlements, setEntitlements] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const escolherPlano = async (planoId) => {
    if (!podeEditar || !lojaAtivaId) return;
    if (entitlements?.plano === planoId) return;

    const def = PLANOS[planoId];
    const ok = await confirm(
      `Definir plano ${def.label} (${def.precoHint}) nesta loja?\n\nAté o gateway de pagamento, a atribuição é manual — use para soft-launch e testes.`,
      {
        title: 'Alterar plano',
        confirmLabel: 'Confirmar plano',
        confirmVariant: 'primary',
      }
    );
    if (!ok) return;

    setSalvando(true);
    const { data, error } = await atualizarPlanoLoja(lojaAtivaId, planoId, 'ativa');
    setSalvando(false);

    if (error) {
      await alert(error.message ?? 'Não foi possível atualizar o plano.', {
        type: 'error',
        title: 'Erro',
      });
      return;
    }

    setEntitlements(data);
    await recarregar?.();
    await alert(`Plano ${def.label} ativo. Limites e NFC-e já respeitam este contrato.`, {
      type: 'success',
      title: 'Plano atualizado',
    });
  };

  if (carregando) {
    return <p style={styles.muted}>Carregando plano da loja...</p>;
  }

  if (!entitlements) {
    return (
      <div style={styles.wrap}>
        <p style={styles.muted}>Não foi possível carregar o plano. Aplique a migration 025 se ainda não rodou.</p>
        <button type="button" style={styles.btnGhost} onClick={carregar}>
          <RefreshCw size={14} /> Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
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
            Origem: {entitlements.assinaturaOrigem || 'manual'} — gateway de pagamento entra depois
          </p>
        </div>
        <button type="button" style={styles.btnGhost} onClick={carregar} disabled={salvando}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <p style={styles.ajuda}>
        Este contrato já limita usuários e NFC-e no banco. Quando o pagamento estiver ligado,
        o webhook só muda status/origem — sem reescrever a regra de negócio.
      </p>

      <div style={styles.grid}>
        {PLANOS_IDS.map((id) => {
          const def = PLANOS[id];
          const ativo = entitlements.plano === id;
          return (
            <button
              key={id}
              type="button"
              style={{
                ...styles.card,
                ...(ativo ? styles.cardAtivo : {}),
              }}
              disabled={!podeEditar || salvando || ativo}
              onClick={() => escolherPlano(id)}
            >
              <strong>{def.label}</strong>
              <span style={styles.preco}>{def.precoHint}</span>
              <ul style={styles.lista}>
                {def.destaques.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <span style={styles.cta}>
                {ativo ? 'Plano atual' : podeEditar ? 'Definir (manual)' : 'Só owner/admin'}
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
  preco: { color: '#94a3b8', fontSize: '12px' },
  lista: {
    margin: '6px 0 0',
    paddingLeft: '18px',
    color: '#cbd5e1',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  cta: { marginTop: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' },
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
