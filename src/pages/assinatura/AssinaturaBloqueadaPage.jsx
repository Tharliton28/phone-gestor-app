import { useLoja } from '../../contexts/LojaContext';
import { useAuth } from '../../contexts/AuthContext';
import { getPlanoDef } from '../../domain/lojaPlanos';
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
  const { lojaAtiva, assinaturaStatus, assinaturaExpiraEm } = useLoja();
  const { signOut } = useAuth();

  const planoLabel = getPlanoDef(lojaAtiva?.plano).label;
  const status = assinaturaStatus || lojaAtiva?.assinatura_status || 'suspensa';
  const expiraLabel = formatData(assinaturaExpiraEm || lojaAtiva?.assinatura_expira_em);
  const lojaNome = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'sua loja';

  const waText = encodeURIComponent(
    `Olá! Minha loja "${lojaNome}" está com assinatura bloqueada (${status}). Quero regularizar o plano ${planoLabel}.`
  );
  const waHref = `https://wa.me/${WHATSAPP}?text=${waText}`;

  return (
    <div className="login-page dark-mode">
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
              {status === 'trial' || expiraLabel
                ? ` (vigência${expiraLabel ? ` até ${expiraLabel}` : ''} encerrada)`
                : ''}
              . Regularize o plano para continuar usando o sistema.
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

          <a
            className="btn-submit btn-login-action"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 12 }}
          >
            Falar no WhatsApp para reativar
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
