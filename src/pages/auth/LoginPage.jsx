import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './login.css';

const LANDING_URL = import.meta.env.VITE_LANDING_URL?.trim() || '';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, resetPassword, authError, clearAuthError, isSupabaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const redirectTo = location.state?.from ?? '/app/vendas';

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearAuthError();
    setFeedback(null);
    setSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    setSubmitting(false);

    if (error) return;

    if (rememberMe) {
      localStorage.setItem('pg_remember_email', email.trim());
    } else {
      localStorage.removeItem('pg_remember_email');
    }

    navigate(redirectTo, { replace: true });
  };

  const handleForgotPassword = async () => {
    clearAuthError();
    setFeedback(null);

    if (!email.trim()) {
      setFeedback({
        type: 'info',
        message: 'Informe seu e-mail no campo acima para receber o link de recuperação.',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await resetPassword(email.trim());
    setSubmitting(false);

    if (error) return;

    setFeedback({
      type: 'success',
      message: 'Se o e-mail existir, enviamos um link para redefinir sua senha.',
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('pg_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const displayError = authError;
  const displayFeedback = feedback;

  return (
    <div className="login-page dark-mode">
      <div className="bg-glow glow-top" />

      <div className="login-wrapper">
        {LANDING_URL ? (
          <a className="btn-back" href={LANDING_URL}>
            ← Voltar para o site
          </a>
        ) : null}

        <div className="login-card gemini-border">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-icon">P</div>
              <span className="login-brand-text">PhoneGestor</span>
            </div>
            <h2>Bem-vindo de volta!</h2>
            <p>Acesse seu painel de controle.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="login-alert login-alert-info" style={{ marginBottom: '1rem' }}>
              Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no
              arquivo <code>.env</code> para habilitar o login.
            </div>
          )}

          {displayError && (
            <div className="login-alert login-alert-error" style={{ marginBottom: '1rem' }}>
              {displayError}
            </div>
          )}

          {displayFeedback && (
            <div
              className={`login-alert login-alert-${displayFeedback.type}`}
              style={{ marginBottom: '1rem' }}
            >
              {displayFeedback.message}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">E-mail corporativo</label>
              <input
                type="email"
                id="email"
                placeholder="contato@sualoja.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <button type="button" className="forgot-password" onClick={handleForgotPassword}>
                Esqueceu a senha?
              </button>
            </div>

            <button type="submit" className="btn-submit btn-login-action" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Ainda não tem uma conta?{' '}
              {LANDING_URL ? (
                <a href={`${LANDING_URL}#planos`}>Escolha um plano</a>
              ) : (
                <Link to="/login">Escolha um plano</Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
