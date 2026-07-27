import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Store, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoja } from '../contexts/LojaContext';
import { formatCnpj, getInitials, truncate } from '../utils/formatters';
import './topbar.css';

export default function Topbar({ onMenuToggle, isMobile }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { perfil, lojaAtiva, lojas, lojaAtivaId, setLojaAtiva, papelAtivo } = useLoja();
  const [menuAberto, setMenuAberto] = useState(false);

  const nomeExibicao = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'Sem loja vinculada';
  const cnpjFormatado = lojaAtiva?.cnpj ? formatCnpj(lojaAtiva.cnpj) : '';
  const nomeUsuario = perfil?.nome ?? 'Usuário';
  const iniciais = getInitials(nomeUsuario);

  const handleLogout = async () => {
    setMenuAberto(false);
    const { error } = await signOut();
    if (!error) navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        {isMobile && (
          <button type="button" className="topbar__menu-btn" onClick={onMenuToggle} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
        )}
      </div>

      <div className="topbar__center">
        {lojas.length > 1 ? (
          <div className="topbar__loja-select">
            <Store size={14} className="topbar__loja-icon" />
            <select
              className="topbar__select"
              value={lojaAtivaId ?? ''}
              onChange={(e) => setLojaAtiva(e.target.value)}
              aria-label="Selecionar loja"
            >
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome_fantasia || loja.razao_social}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="topbar__company">
            Empresa: {truncate(nomeExibicao, 28)}
            {cnpjFormatado ? ` — ${truncate(cnpjFormatado, 20)}` : ''}
          </span>
        )}
      </div>

      <div className="topbar__right">
        <div className="topbar__icons">
          <button type="button" className="topbar__btn-upgrade" onClick={() => alert('Abrir planos de assinatura...')}>
            <Zap size={14} color="#fbbf24" fill="#fbbf24" />
            <span className="topbar__upgrade-text">Upgrade PRO</span>
          </button>

          <span className="topbar__icon-wrap" title="Ajuda">
            <HelpCircle size={18} />
          </span>
          <span className="topbar__icon-wrap" title="Notificações">
            <Bell size={18} />
          </span>
        </div>

        <div className="topbar__user">
          <button
            type="button"
            className="topbar__user-btn"
            onClick={() => setMenuAberto((prev) => !prev)}
            aria-expanded={menuAberto}
            aria-haspopup="true"
          >
            <div className="topbar__avatar">{iniciais}</div>
            <span className="topbar__user-name">{truncate(nomeUsuario, 22)}</span>
            <ChevronDown size={16} className="topbar__chevron" />
          </button>

          {menuAberto && (
            <>
              <button
                type="button"
                className="topbar__menu-backdrop"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
              />
              <div className="topbar__dropdown">
                <div className="topbar__dropdown-header">
                  <strong>{nomeUsuario}</strong>
                  <span>{perfil?.email}</span>
                  {papelAtivo && <span className="topbar__papel">{papelAtivo}</span>}
                </div>
                <button type="button" className="topbar__dropdown-item" onClick={handleLogout}>
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
