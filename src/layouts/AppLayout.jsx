import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useErpNavigation } from '../hooks/useErpNavigation';

export default function AppLayout() {
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const { telaAtiva, mudarTela } = useErpNavigation();

  return (
    <div style={{ display: 'flex', width: '100%', overflowX: 'hidden', minHeight: '100vh' }}>
      <Sidebar
        aoMudarTela={mudarTela}
        telaAtiva={telaAtiva}
        sidebarAberta={sidebarAberta}
        setSidebarAberta={setSidebarAberta}
      />

      <main
        style={{
          marginLeft: sidebarAberta ? '260px' : '70px',
          width: `calc(100% - ${sidebarAberta ? '260px' : '70px'})`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'all 0.3s ease',
        }}
      >
        <Topbar />

        <div
          style={{
            padding: '24px',
            backgroundColor: '#0f111a',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
