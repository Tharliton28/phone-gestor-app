import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoja } from '../../contexts/LojaContext';
import { REGIMES_TRIBUTARIOS } from '../../services/lojaService';
import { createLojaOnboarding } from '../../services/onboardingService';
import { formatCnpj } from '../../utils/formatters';
import '../auth/login.css';

export default function OnboardingEmpresaPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { temLoja, loading, recarregar } = useLoja();

  const [form, setForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: user?.email ?? '',
    regimeTributario: 'Simples Nacional',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((prev) => ({ ...prev, email: user.email }));
    }
  }, [user?.email, form.email]);

  if (loading) {
    return (
      <div className="login-page dark-mode">
        <div className="login-wrapper" style={{ color: '#a1a1aa' }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (temLoja) {
    return <Navigate to="/app/inicio" replace />;
  }

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: createError } = await createLojaOnboarding(form);
    if (createError) {
      setSubmitting(false);
      setError(createError.message);
      return;
    }

    await recarregar();
    setSubmitting(false);
    navigate('/app/inicio', { replace: true });
  };

  return (
    <div className="login-page dark-mode">
      <div className="bg-glow glow-top" />

      <div className="login-wrapper">
        <div className="login-card gemini-border" style={{ maxWidth: 520 }}>
          <div className="login-header">
            <div className="login-brand">
              <div className="login-brand-icon">P</div>
              <span className="login-brand-text">PhoneGestor</span>
            </div>
            <h2>Dados da sua loja</h2>
            <p>
              Último passo: cadastramos a empresa e liberamos o plano{' '}
              <strong>Essencial</strong> com <strong>14 dias de trial</strong>.
            </p>
          </div>

          {error && (
            <div className="login-alert login-alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="razaoSocial">Razão social *</label>
              <input
                id="razaoSocial"
                value={form.razaoSocial}
                onChange={(e) => updateField('razaoSocial', e.target.value)}
                required
                placeholder="Nome jurídico da empresa"
              />
            </div>

            <div className="input-group">
              <label htmlFor="nomeFantasia">Nome fantasia</label>
              <input
                id="nomeFantasia"
                value={form.nomeFantasia}
                onChange={(e) => updateField('nomeFantasia', e.target.value)}
                placeholder="Como a loja é conhecida"
              />
            </div>

            <div className="input-group">
              <label htmlFor="cnpj">CNPJ *</label>
              <input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => updateField('cnpj', formatCnpj(e.target.value) || e.target.value)}
                required
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
              <div className="input-group">
                <label htmlFor="cidade">Cidade *</label>
                <input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  required
                  placeholder="Fortaleza"
                />
              </div>
              <div className="input-group">
                <label htmlFor="estado">UF</label>
                <input
                  id="estado"
                  value={form.estado}
                  onChange={(e) => updateField('estado', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="CE"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="telefone">Telefone / WhatsApp</label>
              <input
                id="telefone"
                value={form.telefone}
                onChange={(e) => updateField('telefone', e.target.value)}
                placeholder="(85) 99999-9999"
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">E-mail da loja</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contato@sualoja.com.br"
              />
            </div>

            <div className="input-group">
              <label htmlFor="regime">Regime tributário</label>
              <select
                id="regime"
                value={form.regimeTributario}
                onChange={(e) => updateField('regimeTributario', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #1f1f23',
                  background: '#111',
                  color: '#fff',
                }}
              >
                {REGIMES_TRIBUTARIOS.map((regime) => (
                  <option key={regime} value={regime}>
                    {regime}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-submit btn-login-action" disabled={submitting}>
              {submitting ? 'Criando loja...' : 'Entrar no sistema'}
            </button>
          </form>

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
                Sair e usar outra conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
