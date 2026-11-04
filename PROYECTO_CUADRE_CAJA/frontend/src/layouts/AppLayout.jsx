import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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
    <div className="relative flex min-h-screen min-h-dvh w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,18rem)] min-w-0 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 xl:static xl:z-auto xl:w-64 xl:min-w-64 xl:translate-x-0 xl:shadow-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 p-4 sm:p-5">
          <img
            src={`${import.meta.env.BASE_URL}logo-finito.png`}
            alt="FINITO Logo"
            className="h-9 w-12 shrink-0 object-contain"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <strong className="text-sm font-semibold leading-tight tracking-wide">Sistema de Cuadre de Caja</strong>
            <span className="break-words text-[10px] font-medium uppercase tracking-wide text-white/60">Distribuidora de Cerámica y Acabados</span>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange xl:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {menuItems.map((section) => (
            <div key={section.section} className="mb-5">
              <span className="mb-2 ml-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">{section.section}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-brand-orange ${isActive(item.path) ? 'bg-brand-orange font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => handleNavigation(item.path)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-white/10 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-white/75">Sistema interno</span>
            <small className="text-[10px] text-white/45">Turno activo</small>
          </div>
          <button type="button" onClick={() => setShowLogoutModal(true)} className="min-h-11 w-full rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 w-full flex-1 flex-col xl:w-[calc(100%-16rem)]">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-4 lg:px-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-brand-orange xl:hidden dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-col">
              <span className="hidden truncate text-[10px] font-bold tracking-wider text-slate-500 sm:block dark:text-slate-400">
                FINITO DISTRIBUIDORA ACABADOS
              </span>
              <strong className="truncate text-xs font-bold text-slate-900 sm:text-sm dark:text-slate-100">Sistema de Cuadre de Caja</strong>
            </div>
          </div>

          <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
            <div className="hidden w-[min(45vw,22rem)] min-w-0 flex-col items-end text-right md:flex">
              <span className="block max-w-full break-words text-sm font-bold text-slate-800 dark:text-slate-100">
                {user?.nombres ? `${user.nombres} ${user.apellidos}` : (user?.usuario || 'Usuario')}
              </span>
              <small className="block max-w-full break-words text-xs text-slate-500 dark:text-slate-400">
                {user?.condicion_personal ? `${user.condicion_personal} | ${user.rol}` : (user?.rol || 'Sesión activa')}
              </small>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-brand-orange dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-brand-orange dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 w-full flex-1 p-3 sm:p-4 lg:p-6">
          <TurnoAlertBanner />
          <Outlet />
        </main>
      </div>
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
            className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none"
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-h-11 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
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