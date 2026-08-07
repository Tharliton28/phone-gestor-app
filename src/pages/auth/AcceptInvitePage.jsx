import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoja } from '../../contexts/LojaContext';
import { labelPapel } from '../../domain/equipePapeis';
import { aceitarConviteLoja, getConvitePublico } from '../../services/equipeService';
import './login.css';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, signIn, signUp, authError, clearAuthError, loading: authLoading } =
    useAuth();
  const { recarregar, temLoja } = useLoja();

  const [convite, setConvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loadingConvite, setLoadingConvite] = useState(true);
  const [modo, setModo] = useState('signup'); // signup | login
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [aceitouAuto, setAceitouAuto] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingConvite(true);
      const { data, error } = await getConvitePublico(token);
      if (!alive) return;
      if (error) {
        setLoadError(error.message);
        setConvite(null);
      } else {
        setConvite(data);
        setLoadError(null);
      }
      setLoadingConvite(false);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const aceitar = async () => {
    setFeedback(null);
    setSubmitting(true);
    const { data, error } = await aceitarConviteLoja(token);
    if (error) {
      setSubmitting(false);
      setFeedback({ type: 'error', message: error.message });
      return;
    }
    await recarregar?.();
    setSubmitting(false);
    navigate('/app/inicio', { replace: true, state: { conviteAceito: data } });
  };

  useEffect(() => {
    if (aceitouAuto || submitting) return;
    if (!isAuthenticated || !convite || convite.status !== 'pendente' || authLoading) return;
    const emailUser = (user?.email || '').toLowerCase();
    if (emailUser && emailUser === convite.email) {
      setAceitouAuto(true);
      aceitar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, convite?.email, convite?.status, user?.email, authLoading, aceitouAuto, submitting]);

  const handleSignup = async (e) => {
    e.preventDefault();
    clearAuthError();
    setFeedback(null);
    if (password.length < 6) {
      setFeedback({ type: 'error', message: 'Senha com pelo menos 6 caracteres.' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await signUp(convite.email, password, { nome: nome.trim() });
    if (error) {
      setSubmitting(false);
      return;
    }
    if (!data?.session) {
      setSubmitting(false);
      setFeedback({
        type: 'success',
        message: 'Conta criada. Confirme o e-mail e depois entre por este mesmo link do convite.',
      });
      return;
    }
    const { error: acceptError } = await aceitarConviteLoja(token);
    setSubmitting(false);
    if (acceptError) {
      setFeedback({ type: 'error', message: acceptError.message });
      return;
    }
    await recarregar?.();
    navigate('/app/inicio', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearAuthError();
    setFeedback(null);
    setSubmitting(true);
    const { error } = await signIn(convite.email, password);
    if (error) {
      setSubmitting(false);
      return;
    }
    const { error: acceptError } = await aceitarConviteLoja(token);
    setSubmitting(false);
    if (acceptError) {
      setFeedback({ type: 'error', message: acceptError.message });
      return;
    }
    await recarregar?.();
    navigate('/app/inicio', { replace: true });
  };

  if (loadingConvite || authLoading) {
    return (
      <div className="login-page dark-mode">
        <div className="login-wrapper" style={{ color: '#a1a1aa' }}>
          Carregando convite...
        </div>
      </div>
    );
  }

  if (loadError || !convite) {
    return (
      <div className="login-page dark-mode">
        <div className="login-wrapper">
          <div className="login-card gemini-border">
            <div className="login-header">
              <h2>Convite inválido</h2>
              <p>{loadError || 'Este link não é válido.'}</p>
            </div>
            <Link to="/login" className="btn-submit btn-login-action" style={{ textAlign: 'center' }}>
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (convite.status !== 'pendente') {
    return (
      <div className="login-page dark-mode">
        <div className="login-wrapper">
          <div className="login-card gemini-border">
            <div className="login-header">
              <h2>Convite indisponível</h2>
              <p>
                Status: <strong>{convite.status}</strong>. Peça um novo link ao administrador da loja.
              </p>
            </div>
            {temLoja ? (
              <Link to="/app/inicio" className="btn-submit btn-login-action" style={{ textAlign: 'center' }}>
                Ir para o sistema
              </Link>
            ) : (
              <Link to="/login" className="btn-submit btn-login-action" style={{ textAlign: 'center' }}>
                Ir para o login
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const emailMismatch =
    isAuthenticated && user?.email && user.email.toLowerCase() !== convite.email;

  return (
    <div className="login-page dark-mode">
      <div className="bg-glow glow-top" />
      <div className="login-wrapper">
        <div className="login-card gemini-border">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-icon">P</div>
              <span className="login-brand-text">Phone Gestor</span>
            </div>
            <h2>Convite para a equipe</h2>
            <p>
              Você foi convidado para <strong>{convite.loja_nome}</strong> como{' '}
              <strong>{labelPapel(convite.papel)}</strong>.
            </p>
          </div>

          <div className="login-alert login-alert-info" style={{ marginBottom: '1rem' }}>
            Use o e-mail <strong>{convite.email}</strong> para aceitar.
          </div>

          {emailMismatch && (
            <div className="login-alert login-alert-error" style={{ marginBottom: '1rem' }}>
              Você está logado como {user.email}. Saia e entre com {convite.email}.
            </div>
          )}

          {(authError || feedback) && (
            <div
              className={`login-alert login-alert-${feedback?.type === 'success' ? 'success' : 'error'}`}
              style={{ marginBottom: '1rem' }}
            >
              {feedback?.message || authError}
            </div>
          )}

          {isAuthenticated && !emailMismatch ? (
            <button
              type="button"
              className="btn-submit btn-login-action"
              disabled={submitting}
              onClick={aceitar}
            >
              {submitting ? 'Entrando na loja...' : 'Aceitar convite e entrar'}
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setModo('signup')}
                  style={tabStyle(modo === 'signup')}
                >
                  Criar conta
                </button>
                <button
                  type="button"
                  onClick={() => setModo('login')}
                  style={tabStyle(modo === 'login')}
                >
                  Já tenho conta
                </button>
              </div>

              <form
                className="login-form"
                onSubmit={modo === 'signup' ? handleSignup : handleLogin}
              >
                {modo === 'signup' && (
                  <div className="input-group">
                    <label htmlFor="nome">Seu nome</label>
                    <input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" type="email" value={convite.email} disabled readOnly />
                </div>

                <div className="input-group">
                  <label htmlFor="password">Senha</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={modo === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>

                <button type="submit" className="btn-submit btn-login-action" disabled={submitting}>
                  {submitting
                    ? 'Aguarde...'
                    : modo === 'signup'
                      ? 'Criar conta e aceitar'
                      : 'Entrar e aceitar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: 1,
    padding: '10px',
    borderRadius: 6,
    border: active ? '1px solid #3b82f6' : '1px solid #2a2e3f',
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 13,
  };
}
