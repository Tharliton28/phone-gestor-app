import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AssinaturaBloqueadaPage from '../pages/assinatura/AssinaturaBloqueadaPage';
import { useLoja } from '../contexts/LojaContext';
import { useErpNavigation } from '../hooks/useErpNavigation';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './appLayout.css';

const SIDEBAR_WIDTH_OPEN = 260;
const SIDEBAR_WIDTH_COLLAPSED = 70;

export default function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [sidebarAberta, setSidebarAberta] = useState(!isMobile);
  const { telaAtiva, mudarTela } = useErpNavigation();
  const { loading, error, temLoja, assinaturaAtiva } = useLoja();

  useEffect(() => {
    setSidebarAberta(!isMobile);
  }, [isMobile]);

  const fecharSidebarMobile = () => {
    if (isMobile) setSidebarAberta(false);
  };

  const toggleSidebar = () => setSidebarAberta((prev) => !prev);

  const sidebarWidth = isMobile ? 0 : sidebarAberta ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_COLLAPSED;

  if (loading) {
    return (
      <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Carregando dados da loja...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="app-layout"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: '#94a3b8',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p>Não foi possível carregar os dados da loja.</p>
        <p style={{ fontSize: '13px', color: '#64748b' }}>{error}</p>
      </div>
    );
  }

  if (!temLoja) {
    return <Navigate to="/onboarding/empresa" replace />;
  }

  if (!assinaturaAtiva) {
    return <AssinaturaBloqueadaPage />;
  }

  return (
    <div className="app-layout">
      {isMobile && sidebarAberta && (
        <button
          type="button"
          className="app-layout__backdrop"
          onClick={fecharSidebarMobile}
          aria-label="Fechar menu"
        />
      )}

      <Sidebar
        aoMudarTela={(tela) => {
          mudarTela(tela);
          fecharSidebarMobile();
        }}
        telaAtiva={telaAtiva}
        sidebarAberta={sidebarAberta}
        setSidebarAberta={setSidebarAberta}
        isMobile={isMobile}
      />

      <main
        className="app-layout__main"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Topbar
          onMenuToggle={toggleSidebar}
          isMobile={isMobile}
          onAbrirCreditos={() => mudarTela('config', telaAtiva, { aba: 'creditos' })}
          onAbrirPlano={() => mudarTela('config', telaAtiva, { aba: 'plano' })}
        />

        <div className="app-layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
