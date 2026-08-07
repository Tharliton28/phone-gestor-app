import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import OnboardingEmpresaPage from './pages/onboarding/OnboardingEmpresaPage';
import OSAceiteClientePage from './pages/public/OSAceiteClientePage';
import AutorizacaoConsultaPage from './pages/public/AutorizacaoConsultaPage';
import ErpContent from './pages/erp/ErpContent';
import GuestRoute from './routes/GuestRoute';
import ProtectedRoute from './routes/ProtectedRoute';
import { LojaProvider } from './contexts/LojaContext';
import { ERP_ROUTE_ENTRIES } from './constants/erpRoutes';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />

      <Route
        path="/cadastro"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />

      <Route path="/aceite-os/:token" element={<OSAceiteClientePage />} />
      <Route path="/autorizacao-consulta/:token" element={<AutorizacaoConsultaPage />} />

      <Route
        path="/convite/:token"
        element={
          <LojaProvider>
            <AcceptInvitePage />
          </LojaProvider>
        }
      />

      <Route
        path="/onboarding/empresa"
        element={
          <ProtectedRoute>
            <LojaProvider>
              <OnboardingEmpresaPage />
            </LojaProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <LojaProvider>
              <AppLayout />
            </LojaProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/inicio" replace />} />
        <Route path="os" element={<Navigate to="/app/assistencia/os" replace />} />
        <Route path="os/nova" element={<Navigate to="/app/assistencia/os/nova" replace />} />
        {ERP_ROUTE_ENTRIES.map(({ relativePath }) => (
          <Route key={relativePath} path={relativePath} element={<ErpContent />} />
        ))}
        <Route path="*" element={<Navigate to="/app/inicio" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
