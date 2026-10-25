import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import './AppLayout.css';
import { useAuth } from '../hooks/useAuth';
import { useRol } from '../context/RolContext';
import { TurnoAlertBanner } from '../components/layout/TurnoAlertBanner';
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Paperclip,
  CheckCircle,
  Store,
  ArrowUpRight,
  Ban,
  FileX,
  Scale,
  Equal,
  BarChart2,
  TrendingUp,
  Users,
  Shield,
} from 'lucide-react';

function AppLayout() {
  const { user, logout } = useAuth();
  const { isAdmin } = useRol();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userIsAdmin = typeof isAdmin === 'function' ? isAdmin() : !!isAdmin;

  const menuItems = [
    { section: 'Principal', items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/operaciones', label: 'Operaciones', icon: Receipt },
      { path: '/pagos', label: 'Pagos', icon: CreditCard },
      { path: '/evidencias', label: 'Evidencias', icon: Paperclip },
    ]},
    { section: 'Caja', items: [
      { path: '/cierres-de-caja', label: 'Cierres de caja', icon: Store },
      { path: '/salidas-de-caja', label: 'Salidas de caja', icon: ArrowUpRight },
    ]},
    { section: 'Ajustes', items: [
      { path: '/anulaciones', label: 'Anulaciones', icon: Ban },
      { path: '/notas-de-credito', label: 'Notas de crédito', icon: FileX },
    ]},
    { section: 'Control', items: [
      { path: '/conciliacion', label: 'Conciliación', icon: Scale },
      { path: '/diferencias', label: 'Diferencias', icon: Equal },
    ]},
    { section: 'Reportes', items: [
      { path: '/reportes', label: 'Reportes', icon: BarChart2 },
      { path: '/indicadores', label: 'Indicadores', icon: TrendingUp },
    ]},
    ...(userIsAdmin ? [{
      section: 'Administración', items: [
        { path: '/usuarios', label: 'Usuarios', icon: Users },
        { path: '/roles-y-permisos', label: 'Roles y permisos', icon: Shield },
      ],
    }] : []),
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    if (path === '/operaciones' && location.pathname.startsWith('/operaciones')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo-finito.png`}
            alt="FINITO Logo"
            className="h-9 w-auto object-contain"
          />
          <div className="sidebar-brand-text">
            <strong>Sistema de Cuadre de Caja</strong>
            <span>Distribuidora de Cerámica y Acabados</span>
          </div>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((section) => (
            <div key={section.section} className="sidebar-section">
              <span className="sidebar-section-title">{section.section}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <Icon className="sidebar-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <span>Sistema interno</span>
            <small>Turno activo</small>
          </div>
          <button type="button" onClick={logout} className="sidebar-logout-button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex flex-col">
              <span className="app-header-company">
                FINITO DISTRIBUIDORA ACABADOS
              </span>
              <strong>Sistema de Cuadre de Caja</strong>
            </div>
          </div>

          <div className="app-header-user">
            <div className="user-info text-right">
              <span className="font-bold text-slate-800 block text-sm">
                {user?.nombres ? `${user.nombres} ${user.apellidos}` : (user?.usuario || 'Usuario')}
              </span>
              <small className="text-slate-500 block text-xs">
                {user?.condicion_personal ? `${user.condicion_personal} | ${user.rol}` : (user?.rol || 'Sesión activa')}
              </small>
            </div>
            <button type="button" onClick={logout} className="logout-button">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="app-content">
          <TurnoAlertBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;