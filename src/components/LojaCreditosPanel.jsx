import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, ExternalLink, RefreshCw } from 'lucide-react';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import {
  CUSTO_CREDITOS,
  PACOTES_CREDITOS,
  formatarSaldoCreditos,
  rotuloLancamento,
} from '../domain/lojaCreditos';
import {
  criarCheckoutCreditosAsaas,
  criarPixTesteAsaas,
  getSaldoCreditos,
  listCustosCreditos,
  listLancamentosCreditos,
} from '../services/lojaCreditoService';
import { emitirCreditosAtualizados } from '../utils/creditosEvents';
import CheckoutOverlay from './CheckoutOverlay';

const POLL_MS = 2500;
const TIMEOUT_MS = 10 * 60 * 1000;

export default function LojaCreditosPanel() {
  const { lojaAtivaId, papelAtivo } = useLoja();
  const { alert, confirm } = useDialog();
  const [saldo, setSaldo] = useState(0);
  const [lancamentos, setLancamentos] = useState([]);
  const [custos, setCustos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [faseCheckout, setFaseCheckout] = useState(null);
  const [pacoteCheckout, setPacoteCheckout] = useState(null);
  const baselineSaldoRef = useRef(null);
  const pollRef = useRef(null);

  const podeComprar = ['owner', 'admin'].includes(papelAtivo);
  const podeSmokePix = papelAtivo === 'owner';

  const carregar = useCallback(async () => {
    if (!lojaAtivaId) return;
    setCarregando(true);

    const [saldoResult, listResult, custosResult] = await Promise.all([
      getSaldoCreditos(lojaAtivaId),
      listLancamentosCreditos(lojaAtivaId, 40),
      listCustosCreditos(),
    ]);

    if (saldoResult.error) {
      await alert(saldoResult.error.message ?? 'Erro ao carregar saldo.', {
        type: 'error',
        title: 'Créditos',
      });
    } else {
      setSaldo(saldoResult.saldo);
      emitirCreditosAtualizados(saldoResult.saldo);
    }

    setLancamentos(listResult.data ?? []);
    setCustos(custosResult.data?.length
      ? custosResult.data
      : Object.entries(CUSTO_CREDITOS).map(([acao, item]) => ({
        acao,
        ...item,
        ativo: true,
      })));
    setCarregando(false);
    return saldoResult.saldo;
  }, [lojaAtivaId, alert]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pararPoll = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const desistirCheckout = () => {
    pararPoll();
    setFaseCheckout(null);
    setPacoteCheckout(null);
    baselineSaldoRef.current = null;
  };

  useEffect(() => () => pararPoll(), [pararPoll]);

  const comprarPacote = async (pacote) => {
    if (!podeComprar || !lojaAtivaId || faseCheckout) return;

    const ok = await confirm(
      `Comprar ${pacote.label} (${pacote.creditos} créditos) por ${pacote.precoHint}?\n\nVocê será levado ao checkout seguro (PIX, boleto ou cartão). Os créditos entram automaticamente após a confirmação.`,
      {
        title: 'Comprar créditos',
        confirmLabel: 'Ir para pagamento',
        confirmVariant: 'primary',
      }
    );
    if (!ok) return;

    try {
      sessionStorage.setItem('phonegestor_assinatura_aba', 'creditos');
    } catch {
      /* ignore */
    }

    setPacoteCheckout(pacote);
    setFaseCheckout('preparando');
    baselineSaldoRef.current = saldo;

    const { data, error } = await criarCheckoutCreditosAsaas(lojaAtivaId, pacote.id);
    if (error) {
      setFaseCheckout(null);
      setPacoteCheckout(null);
      await alert(error.message ?? 'Não foi possível iniciar o pagamento.', {
        type: 'error',
        title: 'Checkout',
      });
      return;
    }

    window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    setFaseCheckout('aguardando');

    const desde = Date.now();
    pararPoll();
    pollRef.current = window.setInterval(async () => {
      if (Date.now() - desde > TIMEOUT_MS) {
        desistirCheckout();
        await alert(
          'Ainda não confirmamos o crédito. Se você já pagou, clique em Atualizar.',
          { type: 'warning', title: 'Aguardando confirmação' }
        );
        return;
      }
      const { saldo: novo, error: errSaldo } = await getSaldoCreditos(lojaAtivaId);
      if (errSaldo) return;
      if (Number(novo) > Number(baselineSaldoRef.current ?? 0)) {
        pararPoll();
        setFaseCheckout(null);
        setPacoteCheckout(null);
        setSaldo(novo);
        emitirCreditosAtualizados(novo);
        await carregar();
        await alert(
          `Pagamento confirmado.\n\n+${pacote.creditos} créditos creditados na carteira.`,
          { type: 'success', title: 'Créditos liberados' }
        );
      }
    }, POLL_MS);
  };

  const gerarPixTeste = async () => {
    if (!podeSmokePix || !lojaAtivaId || faseCheckout) return;

    const ok = await confirm(
      'Gera cobrança PIX de R$ 1,00 nesta loja.\n\nApós o pagamento, o webhook deve creditar +1 crédito automaticamente.\nUse só para validar Asaas produção (preferir loja de teste, não a loja modelo).',
      {
        title: 'Pix teste R$ 1',
        confirmLabel: 'Gerar Pix R$ 1',
        confirmVariant: 'primary',
      }
    );
    if (!ok) return;

    try {
      sessionStorage.setItem('phonegestor_assinatura_aba', 'creditos');
    } catch {
      /* ignore */
    }

    const pacoteSmoke = { id: 'smoke_pix', label: 'Pix teste', creditos: 1, precoHint: 'R$ 1,00' };
    setPacoteCheckout(pacoteSmoke);
    setFaseCheckout('preparando');
    baselineSaldoRef.current = saldo;

    const { data, error } = await criarPixTesteAsaas(lojaAtivaId);
    if (error) {
      setFaseCheckout(null);
      setPacoteCheckout(null);
      await alert(error.message ?? 'Não foi possível criar o Pix de teste.', {
        type: 'error',
        title: 'Pix teste',
      });
      return;
    }

    if (data.invoice_url) {
      window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    }
    setFaseCheckout('aguardando');

    const desde = Date.now();
    pararPoll();
    pollRef.current = window.setInterval(async () => {
      if (Date.now() - desde > TIMEOUT_MS) {
        desistirCheckout();
        await alert(
          'Ainda não confirmamos o crédito. Se você já pagou, clique em Atualizar.',
          { type: 'warning', title: 'Aguardando confirmação' }
        );
        return;
      }
      const { saldo: novo, error: errSaldo } = await getSaldoCreditos(lojaAtivaId);
      if (errSaldo) return;
      if (Number(novo) > Number(baselineSaldoRef.current ?? 0)) {
        pararPoll();
        setFaseCheckout(null);
        setPacoteCheckout(null);
        setSaldo(novo);
        emitirCreditosAtualizados(novo);
        await carregar();
        await alert(
          'Pix confirmado.\n\n+1 crédito creditado — webhook Asaas OK.',
          { type: 'success', title: 'Smoke test OK' }
        );
      }
    }, POLL_MS);
  };

  if (carregando) {
    return <p style={styles.muted}>Carregando carteira de créditos...</p>;
  }

  return (
    <div style={styles.wrap}>
      <CheckoutOverlay
        fase={faseCheckout}
        rotulo={
          pacoteCheckout
            ? `${pacoteCheckout.label} · ${pacoteCheckout.precoHint}`
            : null
        }
        onDesistir={faseCheckout ? desistirCheckout : undefined}
      />

      <div style={styles.saldoCard}>
        <Coins size={22} color="#fbbf24" />
        <div>
          <p style={styles.saldoLabel}>Saldo da loja</p>
          <p style={styles.saldoValor}>{formatarSaldoCreditos(saldo)}</p>
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
        O plano libera o módulo (ex.: NFC-e no Profissional); os créditos pagam o uso da API.
        NFC-e autorizada = 4 créditos. Compre o pacote aqui — o Asaas confirma e creditamos
        automaticamente.
      </p>

      <h3 style={styles.titulo}>Tabela de consumo</h3>
      <div style={styles.tabela}>
        {custos.map((item) => (
          <div key={item.acao} style={styles.linha}>
            <span>{item.label}</span>
            <strong>{item.creditos} crédito{item.creditos === 1 ? '' : 's'}</strong>
          </div>
        ))}
      </div>

      <h3 style={styles.titulo}>Pacotes de créditos</h3>
      <div style={styles.pacotes}>
        {PACOTES_CREDITOS.map((pacote) => {
          const neste = pacoteCheckout?.id === pacote.id && Boolean(faseCheckout);
          return (
            <button
              key={pacote.id}
              type="button"
              style={{
                ...styles.pacote,
                ...(neste ? styles.pacoteWaiting : {}),
              }}
              disabled={!podeComprar || Boolean(faseCheckout)}
              onClick={() => comprarPacote(pacote)}
            >
              <strong>{pacote.label}</strong>
              <span>{pacote.creditos} créditos</span>
              <span style={styles.preco}>{pacote.precoHint}</span>
              <span style={styles.pacoteAcao}>
                {neste
                  ? faseCheckout === 'preparando'
                    ? 'Preparando checkout...'
                    : 'Aguardando pagamento...'
                  : !podeComprar
                    ? 'Só owner/admin'
                    : (
                      <>
                        Comprar <ExternalLink size={12} style={{ marginLeft: 4 }} />
                      </>
                      )}
              </span>
            </button>
          );
        })}
      </div>

      {podeSmokePix ? (
        <button
          type="button"
          style={styles.btnSmoke}
          disabled={Boolean(faseCheckout)}
          onClick={gerarPixTeste}
        >
          Gerar Pix teste R$ 1,00 (+1 crédito)
        </button>
      ) : null}

      <h3 style={styles.titulo}>Extrato recente</h3>
      {lancamentos.length === 0 ? (
        <p style={styles.muted}>Nenhum lançamento ainda.</p>
      ) : (
        <div style={styles.tabela}>
          {lancamentos.map((item) => (
            <div key={item.id} style={styles.linha}>
              <div>
                <div style={styles.lancDesc}>{rotuloLancamento(item)}</div>
                <div style={styles.lancMeta}>
                  {new Date(item.created_at).toLocaleString('pt-BR')} · {item.acao}
                </div>
              </div>
              <strong style={{ color: item.tipo === 'credito' ? '#4ade80' : '#f87171' }}>
                {item.tipo === 'credito' ? '+' : '-'}{item.quantidade}
                <span style={styles.saldoApos}> → {item.saldo_apos}</span>
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  saldoCard: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
    backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '8px',
  },
  saldoLabel: { margin: 0, color: '#94a3b8', fontSize: '12px' },
  saldoValor: { margin: '2px 0 0', color: '#fbbf24', fontSize: '22px', fontWeight: 'bold' },
  ajuda: { margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 },
  titulo: { margin: '8px 0 0', color: '#e2e8f0', fontSize: '14px' },
  tabela: {
    backgroundColor: '#0f111a', border: '1px solid #1f2233', borderRadius: '8px', overflow: 'hidden',
  },
  linha: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
    padding: '12px 14px', borderBottom: '1px solid #1f2233', color: '#e2e8f0', fontSize: '13px',
  },
  pacotes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' },
  pacote: {
    backgroundColor: '#161925', border: '1px solid #2a2e3f', borderRadius: '8px', padding: '14px',
    color: '#e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
    textAlign: 'left',
  },
  pacoteWaiting: {
    borderColor: '#fbbf24',
    boxShadow: '0 0 0 1px rgba(251,191,36,0.35)',
  },
  btnSmoke: {
    alignSelf: 'flex-start',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px dashed #64748b',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  preco: { color: '#94a3b8', fontSize: '12px' },
  pacoteAcao: {
    marginTop: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold',
    display: 'inline-flex', alignItems: 'center',
  },
  btnGhost: {
    marginLeft: 'auto', background: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8',
    borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', gap: '6px',
    fontSize: '12px', alignItems: 'center',
  },
  muted: { color: '#64748b', fontSize: '13px' },
  lancDesc: { fontWeight: 600 },
  lancMeta: { color: '#64748b', fontSize: '11px', marginTop: '2px' },
  saldoApos: { color: '#64748b', fontWeight: 'normal', fontSize: '11px' },
};
