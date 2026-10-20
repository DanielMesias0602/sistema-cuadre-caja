import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import AppLayout from '../layouts/AppLayout';
import Dashboard from '../pages/Dashboard';
import { Operaciones } from '../pages/Operaciones/Operaciones';
import { NuevaOperacion } from '../pages/Operaciones/NuevaOperacion/NuevaOperacion';
import { Pagos } from '../pages/Pagos/Pagos';
import { Evidencias } from '../pages/Evidencias/Evidencias';
import { CierresCaja } from '../pages/CierresCaja/CierresCaja';
import { SalidasCaja } from '../pages/SalidasCaja/SalidasCaja';
import { Anulaciones } from '../pages/Anulaciones/Anulaciones';
import { NotasCredito } from '../pages/NotasCredito/NotasCredito';
import { Conciliacion } from '../pages/Conciliacion/Conciliacion';
import { Diferencias } from '../pages/Diferencias/Diferencias';
import { Reportes } from '../pages/Reportes/Reportes';
import { Indicadores } from '../pages/Indicadores/Indicadores';
import { Usuarios } from '../pages/Usuarios/Usuarios';
import { RolesPermisos } from '../pages/RolesPermisos/RolesPermisos';
import { RoleRoute } from './RoleRoute';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600 font-medium text-sm">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600 font-medium text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="operaciones" element={<Operaciones />} />
        <Route path="operaciones/nueva" element={<NuevaOperacion />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="evidencias" element={<Evidencias />} />
        <Route path="cierres-de-caja" element={<CierresCaja />} />
        <Route path="salidas-de-caja" element={<SalidasCaja />} />
        <Route path="salidas" element={<SalidasCaja />} />
        <Route path="anulaciones" element={<Anulaciones />} />
        <Route path="notas-de-credito" element={<NotasCredito />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="indicadores" element={<Indicadores />} />
        
        {/* RUTAS PROTEGIDAS SOLO PARA ADMINISTRADOR */}
        <Route
          path="conciliacion"
          element={
            <RoleRoute allowedRoles={['ADMINISTRADOR']}>
              <Conciliacion />
            </RoleRoute>
          }
        />
        <Route
          path="diferencias"
          element={
            <RoleRoute allowedRoles={['ADMINISTRADOR']}>
              <Diferencias />
            </RoleRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <RoleRoute allowedRoles={['ADMINISTRADOR']}>
              <Usuarios />
            </RoleRoute>
          }
        />
        <Route
          path="roles-y-permisos"
          element={
            <RoleRoute allowedRoles={['ADMINISTRADOR']}>
              <RolesPermisos />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}