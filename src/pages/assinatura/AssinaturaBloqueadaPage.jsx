import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../../contexts/LojaContext';
import { useAuth } from '../../contexts/AuthContext';
import { getPlanoDef, PLANOS } from '../../domain/lojaPlanos';
import CheckoutOverlay from '../../components/CheckoutOverlay';
import {
  mensagemPlanoAtivado,
  reivindicarAvisoSucessoCheckout,
  useCheckoutAssinatura,
} from '../../hooks/useCheckoutAssinatura';
import { criarCheckoutAsaas } from '../../services/lojaPlanoService';
import '../auth/login.css';

const LANDING_URL = import.meta.env.VITE_LANDING_URL?.trim() || 'https://phone-gestor-landing.vercel.app';
const WHATSAPP = '5585989733574';

function formatData(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AssinaturaBloqueadaPage() {
  const navigate = useNavigate();
  const { lojaAtiva, lojaAtivaId, assinaturaStatus, assinaturaExpiraEm, papelAtivo, recarregar } =
    useLoja();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [faseCheckout, setFaseCheckout] = useState(null);
  const [planoCheckoutId, setPlanoCheckoutId] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const planoAtual = lojaAtiva?.plano || 'essencial';
  const planoLabel = getPlanoDef(planoAtual).label;
  const status = assinaturaStatus || lojaAtiva?.assinatura_status || 'suspensa';
  const expiraLabel = formatData(assinaturaExpiraEm || lojaAtiva?.assinatura_expira_em);
  const lojaNome = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'sua loja';
  const podePagar = ['owner', 'admin'].includes(papelAtivo);

  const { aguardandoPlanoId, iniciarMonitoramento, pararMonitoramento } = useCheckoutAssinatura({
    lojaId: lojaAtivaId,
    onAtivado: async (data) => {
      setFaseCheckout(null);
      setPlanoCheckoutId(null);
      await recarregar?.();
      if (reivindicarAvisoSucessoCheckout()) {
        setSucesso(mensagemPlanoAtivado(data.plano));
      }
      window.setTimeout(() => {
        navigate('/app/inicio', { replace: true });
      }, 2200);
    },
  });

  const desistirCheckout = () => {
    pararMonitoramento();
    setFaseCheckout(null);
    setPlanoCheckoutId(null);
    setBusy(false);
  };

  const waText = encodeURIComponent(
    `Olá! Minha loja "${lojaNome}" está com assinatura bloqueada (${status}). Quero regularizar o plano ${planoLabel}.`
  );
  const waHref = `https://wa.me/${WHATSAPP}?text=${waText}`;

  const pagar = async (planoId) => {
    if (!lojaAtivaId || !podePagar || aguardandoPlanoId || faseCheckout) return;
    try {
      sessionStorage.setItem('phonegestor_config_aba', 'plano');
    } catch {
      /* ignore */
    }
    setBusy(true);
    setPlanoCheckoutId(planoId);
    setFaseCheckout('preparando');
    setErro(null);
    setSucesso(null);
    const { data, error } = await criarCheckoutAsaas(lojaAtivaId, planoId);
    setBusy(false);
    if (error) {
      setFaseCheckout(null);
      setPlanoCheckoutId(null);
      setErro(error.message);
      return;
    }
    window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    setFaseCheckout('aguardando');
    await iniciarMonitoramento(planoId);
  };

  const planoAguardando = aguardandoPlanoId ? getPlanoDef(aguardandoPlanoId).label : null;

  return (
    <div className="login-page dark-mode">
      <CheckoutOverlay
        fase={faseCheckout || (aguardandoPlanoId ? 'aguardando' : null)}
        planoId={planoCheckoutId || aguardandoPlanoId}
        onDesistir={
          (faseCheckout === 'aguardando' || aguardandoPlanoId) && !sucesso
            ? desistirCheckout
            : undefined
        }
      />
      <div className="bg-glow glow-top" />
      <div className="login-wrapper">
        <div className="login-card gemini-border" style={{ maxWidth: 480 }}>
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-icon">P</div>
              <span className="login-brand-text">PhoneGestor</span>
            </div>
            <h2>Assinatura suspensa</h2>
            <p>
              O acesso de <strong>{lojaNome}</strong> foi bloqueado automaticamente
              {expiraLabel ? ` (vigência até ${expiraLabel} encerrada)` : ''}. Regularize o plano
              para continuar.
            </p>
          </div>

          <div
            className="login-alert login-alert-info"
            style={{ marginBottom: '1.25rem', textAlign: 'left' }}
          >
            Plano: <strong>{planoLabel}</strong>
            <br />
            Status: <strong>{status}</strong>
            {expiraLabel ? (
              <>
                <br />
                Expirou em: <strong>{expiraLabel}</strong>
              </>
            ) : null}
          </div>

          {erro ? (
            <div className="login-alert login-alert-error" style={{ marginBottom: '1rem' }}>
              {erro}
            </div>
          ) : null}

          {sucesso ? (
            <div className="login-alert login-alert-success" style={{ marginBottom: '1rem', whiteSpace: 'pre-line' }}>
              {sucesso}
              <br />
              <span style={{ opacity: 0.85 }}>Entrando no sistema...</span>
            </div>
          ) : null}

          {planoAguardando && !sucesso ? (
            <div className="login-alert login-alert-info" style={{ marginBottom: '1rem' }}>
              Aguardando confirmação do plano <strong>{planoAguardando}</strong>. Conclua o
              pagamento na aba do Asaas — liberamos automaticamente.
            </div>
          ) : null}

          {podePagar && !sucesso ? (
            <>
              <button
                type="button"
                className="btn-submit btn-login-action"
                disabled={busy || Boolean(aguardandoPlanoId) || !PLANOS[planoAtual]?.checkoutDisponivel}
                onClick={() => pagar(planoAtual)}
                style={{ marginBottom: 10 }}
              >
                {busy
                  ? 'Gerando cobrança...'
                  : aguardandoPlanoId
                    ? 'Aguardando pagamento...'
                    : `Pagar ${planoLabel} agora`}
              </button>
              {planoAtual !== 'profissional' ? (
                <button
                  type="button"
                  className="btn-submit btn-login-action"
                  disabled={busy || Boolean(aguardandoPlanoId)}
                  onClick={() => pagar('profissional')}
                  style={{
                    marginBottom: 12,
                    background: 'transparent',
                    border: '1px solid #3b82f6',
                  }}
                >
                  Assinar Profissional (R$ 197/mês)
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => recarregar?.()}
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: 16,
                  background: 'none',
                  border: 'none',
                  color: '#93c5fd',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Já paguei — atualizar status
              </button>
            </>
          ) : !sucesso ? (
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Peça ao proprietário ou admin da loja para regularizar o pagamento.
            </p>
          ) : null}

          <a
            className="btn-submit btn-login-action"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              marginBottom: 12,
              background: 'transparent',
              border: '1px solid #2a2e3f',
            }}
          >
            Falar no WhatsApp
          </a>

          <a
            href={`${LANDING_URL}#planos`}
            style={{
              display: 'block',
              textAlign: 'center',
              color: '#93c5fd',
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            Ver planos
          </a>

          <div className="login-footer">
            <p>
              <button
                type="button"
                onClick={() => signOut()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                Sair da conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
