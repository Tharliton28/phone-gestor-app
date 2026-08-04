import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './login.css';

const LANDING_URL = import.meta.env.VITE_LANDING_URL?.trim() || '';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, authError, clearAuthError, isSupabaseConfigured } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearAuthError();
    setFeedback(null);

    if (password.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    setSubmitting(true);
    const { data, error } = await signUp(email.trim(), password, { nome: nome.trim() });
    setSubmitting(false);

    if (error) return;

    if (!data?.session) {
      setFeedback({
        type: 'success',
        message:
          'Conta criada. Confirme o e-mail (se solicitado) e faça login para cadastrar sua loja.',
      });
      return;
    }

    navigate('/onboarding/empresa', { replace: true });
  };

  return (
    <div className="login-page dark-mode">
      <div className="bg-glow glow-top" />

      <div className="login-wrapper">
        {LANDING_URL ? (
          <a className="btn-back" href={LANDING_URL}>
            ← Voltar para o site
          </a>
        ) : (
          <Link className="btn-back" to="/login">
            ← Já tenho conta
          </Link>
        )}

        <div className="login-card gemini-border">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-icon">P</div>
              <span className="login-brand-text">PhoneGestor</span>
            </div>
            <h2>Crie sua conta</h2>
            <p>Depois cadastramos os dados da sua loja e você entra no sistema.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="login-alert login-alert-info" style={{ marginBottom: '1rem' }}>
              Configure as variáveis do Supabase no <code>.env</code> para habilitar o cadastro.
            </div>
          )}

          {authError && (
            <div className="login-alert login-alert-error" style={{ marginBottom: '1rem' }}>
              {authError}
            </div>
          )}

          {feedback && (
            <div
              className={`login-alert login-alert-${feedback.type === 'error' ? 'error' : feedback.type}`}
              style={{ marginBottom: '1rem' }}
            >
              {feedback.message}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="nome">Seu nome</label>
              <input
                id="nome"
                type="text"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
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
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-submit btn-login-action" disabled={submitting}>
              {submitting ? 'Criando conta...' : 'Continuar'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Já tem conta? <Link to="/login">Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
