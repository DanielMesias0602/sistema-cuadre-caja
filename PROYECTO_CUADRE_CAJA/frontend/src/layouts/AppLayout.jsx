import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import './AppLayout.css';
import { useAuth } from '../hooks/useAuth';
import { useRol } from '../context/RolContext';
import { TurnoAlertBanner } from '../components/layout/TurnoAlertBanner';
import {
  Menu,
  X,
  LogOut,
  AlertTriangle,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Paperclip,
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
  Sun,
  Moon,
} from 'lucide-react';

function AppLayout() {
  const { user, logout } = useAuth();
  const { isAdmin } = useRol();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

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
      { path: '/diferencias', label: 'Diferencias', icon: Equal },
    ]},
    { section: 'Reportes', items: [
      { path: '/reportes', label: 'Reportes', icon: BarChart2 },
      { path: '/indicadores', label: 'Indicadores', icon: TrendingUp },
    ]},
    ...(userIsAdmin ? [{
      section: 'Administración', items: [
        { path: '/conciliacion', label: 'Conciliación', icon: Scale },
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
          <button type="button" onClick={() => setShowLogoutModal(true)} className="sidebar-logout-button">
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
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <div className="user-info text-right">
              <span className="font-bold text-slate-800 block text-sm">
                {user?.nombres ? `${user.nombres} ${user.apellidos}` : (user?.usuario || 'Usuario')}
              </span>
              <small className="text-slate-500 block text-xs">
                {user?.condicion_personal ? `${user.condicion_personal} | ${user.rol}` : (user?.rol || 'Sesión activa')}
              </small>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="logout-button bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-400 border border-red-200 dark:border-rose-800/60 hover:bg-red-100 dark:hover:bg-rose-900/50"
            >
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
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl dark:shadow-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2 id="logout-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ¿Cerrar sesión?
              </h2>
            </div>
            <p id="logout-modal-description" className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              ¿Estás seguro que deseas cerrar sesión? Tendrás que volver a iniciar sesión para continuar.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;