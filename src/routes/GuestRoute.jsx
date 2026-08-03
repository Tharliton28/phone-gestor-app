import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Rota pública: redireciona usuários já autenticados para o ERP. */
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#a1a1aa',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Carregando...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/inicio" replace />;
  }

  return children;
}
