import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Coins, HelpCircle, LogOut, Menu, Store, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoja } from '../contexts/LojaContext';
import { useDialog } from '../contexts/DialogContext';
import { formatCnpj, getInitials, truncate } from '../utils/formatters';
import { getPlanoDef } from '../domain/lojaPlanos';
import { getSaldoCreditos } from '../services/lojaCreditoService';
import { CREDITOS_ATUALIZADOS_EVENT } from '../utils/creditosEvents';
import './topbar.css';

export default function Topbar({ onMenuToggle, isMobile, onAbrirCreditos, onAbrirPlano }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { alert } = useDialog();
  const { perfil, lojaAtiva, lojas, lojaAtivaId, setLojaAtiva } = useLoja();
  const planoDef = getPlanoDef(lojaAtiva?.plano);
  const [menuAberto, setMenuAberto] = useState(false);
  const [saldoCreditos, setSaldoCreditos] = useState(null);

  const nomeExibicao = lojaAtiva?.nome_fantasia || lojaAtiva?.razao_social || 'Sem loja vinculada';
  const cnpjFormatado = lojaAtiva?.cnpj ? formatCnpj(lojaAtiva.cnpj) : '';
  const nomeUsuario = perfil?.nome ?? 'Usuário';
  const iniciais = getInitials(nomeUsuario);

  useEffect(() => {
    if (!lojaAtivaId) {
      setSaldoCreditos(null);
      return undefined;
    }

    let ativo = true;
    const carregarSaldo = () => {
      getSaldoCreditos(lojaAtivaId).then(({ saldo, error }) => {
        if (!ativo) return;
        setSaldoCreditos(error ? null : saldo);
      });
    };

    carregarSaldo();

    const aoAtualizar = (event) => {
      if (typeof event.detail?.saldo === 'number') {
        setSaldoCreditos(event.detail.saldo);
        return;
      }
      carregarSaldo();
    };

    window.addEventListener(CREDITOS_ATUALIZADOS_EVENT, aoAtualizar);
    return () => {
      ativo = false;
      window.removeEventListener(CREDITOS_ATUALIZADOS_EVENT, aoAtualizar);
    };
  }, [lojaAtivaId]);

  const handleLogout = async () => {
    setMenuAberto(false);
    const { error } = await signOut();
    if (!error) navigate('/login', { replace: true });
  };

  const abrirCreditos = () => {
    if (typeof onAbrirCreditos === 'function') {
      onAbrirCreditos();
      return;
    }
    alert('Abra Configurações → Créditos da loja para ver o extrato e comprar pacotes.', {
      type: 'info',
      title: 'Créditos',
    });
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
          {lojaAtivaId && saldoCreditos != null && (
            <button
              type="button"
              className="topbar__btn-creditos"
              onClick={abrirCreditos}
              title="Créditos da loja"
            >
              <Coins size={14} color="#fbbf24" />
              <span className="topbar__creditos-text">{saldoCreditos}</span>
            </button>
          )}

          <button
            type="button"
            className="topbar__btn-upgrade"
            title={`Plano ${planoDef.label}`}
            onClick={() => {
              if (typeof onAbrirPlano === 'function') {
                onAbrirPlano();
                return;
              }
              alert(
                `Plano atual: ${planoDef.label}. Abra Configurações → Plano para ver limites ou alterar (manual até o gateway).`,
                { type: 'info', title: 'Plano da loja' }
              );
            }}
          >
            <Zap size={14} color="#fbbf24" fill="#fbbf24" />
            <span className="topbar__upgrade-text">{planoDef.label}</span>
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
