import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDatosActualizados } from '../../hooks/useSocket';
import api from '../../lib/api';
import { 
  Plus, 
  Calendar, 
  User, 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Search, 
  Lock, 
  X, 
  Sun, 
  Moon, 
  ArrowRight, 
  AlertTriangle, 
  ChevronDown,
  Unlock,
  Loader2 // <-- AGREGADO AQUÍ
} from 'lucide-react';
import { CierreDetailDrawer } from '../../components/caja/CierreDetailDrawer';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';
import { getFechaPeru, getHoraPeru } from '../../utils/horaPeru';

export function CierresCaja() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [selectedCierre, setSelectedCierre] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasoModal, setPasoModal] = useState(1);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [turnosDeshabilitados, setTurnosDeshabilitados] = useState({ manana: false, tarde: false });
  const [motivoDeshabilitado, setMotivoDeshabilitado] = useState({ manana: '', tarde: '' });

  // ESTADOS PARA REABRIR TURNO
  const [modalReabrirAbierto, setModalReabrirAbierto] = useState(false);
  const [cierreAReabrir, setCierreAReabrir] = useState(null);
  const [errorReabrir, setErrorReabrir] = useState(null);
  const [cierreAEditar, setCierreAEditar] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('');

  const hayFiltrosActivos = Boolean(busqueda || fechaDesde || fechaHasta || turnoFiltro);
  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setTurnoFiltro('');
  };

  const [formCierre, setFormCierre] = useState({
    fecha: getFechaPeru(),
    turno: '',
    efectivoFisico: '',
    observaciones: ''
  });
  const [efectivoEsperado, setEfectivoEsperado] = useState(0);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';

  const cargarDatos = useCallback(async () => {
    try {
      const res = await api.get('/cierres-caja');
      const data = res.data?.data || res.data;
      setCierres(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error al cargar cierres de caja:', err);
      setError('No hay datos disponibles');
      setCierres([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const recargarDatos = () => {
    setLoading(true);
    setError(null);
    return cargarDatos();
  };

  useEffect(() => {
    void Promise.resolve().then(cargarDatos);
  }, [cargarDatos]);

  useDatosActualizados(() => {
    void cargarDatos();
  });

  const cierresFiltrados = useMemo(() => {
    return cierres.filter(c => {
      if (busqueda) {
        const responsable = (c.responsable || '').toLowerCase();
        if (!responsable.includes(busqueda.toLowerCase())) return false;
      }
      if (fechaDesde && c.fecha < fechaDesde) return false;
      if (fechaHasta && c.fecha > fechaHasta) return false;
      if (turnoFiltro && c.turno !== turnoFiltro) return false;
      return true;
    });
  }, [cierres, busqueda, fechaDesde, fechaHasta, turnoFiltro]);

  const cierresAgrupados = useMemo(() => {
    const gruposPorFecha = new Map();
    cierresFiltrados.forEach((cierre) => {
      const fecha = String(cierre.fecha || '').slice(0, 10);
      if (!gruposPorFecha.has(fecha)) {
        gruposPorFecha.set(fecha, { fecha, cierres: [] });
      }
      gruposPorFecha.get(fecha).cierres.push(cierre);
    });
    return Array.from(gruposPorFecha.values());
  }, [cierresFiltrados]);

  const formatearFechaCierre = (fecha) => {
    const fechaISO = String(fecha || '').slice(0, 10);
    if (!fechaISO) return '-';
    const fechaLocal = new Date(`${fechaISO}T00:00:00`);
    return Number.isNaN(fechaLocal.getTime())
      ? fechaISO
      : fechaLocal.toLocaleDateString('es-PE');
  };

  const kpis = useMemo(() => {
    const totalCierres = cierresFiltrados.length;
    const efectivoEsperadoTotal = cierresFiltrados.reduce(
      (acc, c) => acc + Number(c.efectivo_esperado || 0),
      0
    );
    const diferenciaAcumulada = cierresFiltrados.reduce(
      (acc, c) => acc + Number(c.diferencia || 0),
      0
    );

    return { totalCierres, efectivoEsperadoTotal, diferenciaAcumulada };
  }, [cierresFiltrados]);

  const calcularEfectivoEsperado = async (turno, fechaSeleccionada, idCierre = null) => {
    try {
      const fecha = fechaSeleccionada || formCierre.fecha || getFechaPeru();
      const params = new URLSearchParams({ fecha, turno });
      if (idCierre != null) params.set('id_cierre', idCierre);
      const res = await api.get(`/cierres-caja/pre-calculo?${params.toString()}`);
      const data = res.data.data;
      setEfectivoEsperado(Number(data.efectivo_esperado || 0));
    } catch (err) {
      console.error('Error al calcular efectivo esperado:', err);
      setEfectivoEsperado(0);
    }
  };

  const recalcularTurnosDisponibles = (fechaSeleccionada) => {
    const hoy = getFechaPeru();
    const horaActual = getHoraPeru();
    const esHoy = fechaSeleccionada === hoy;

    const cierresFecha = cierres.filter(c => c.fecha === fechaSeleccionada);
    const cierreManana = cierresFecha.find(c => c.turno === 'Mañana');
    const cierreTarde = cierresFecha.find(c => c.turno === 'Tarde');

    const nuevoDeshabilitados = { manana: false, tarde: false };
    const nuevoMotivo = { manana: '', tarde: '' };

    if (cierreManana?.estado?.toUpperCase() === 'CERRADO') {
      nuevoDeshabilitados.manana = true;
      nuevoMotivo.manana = 'Este turno ya fue cerrado';
    } else if (!cierreManana && esHoy && horaActual >= '14:00:00') {
      nuevoMotivo.manana = 'Cierre pendiente de regularización';
    }

    if (cierreTarde?.estado?.toUpperCase() === 'CERRADO') {
      nuevoDeshabilitados.tarde = true;
      nuevoMotivo.tarde = 'Este turno ya fue cerrado';
    } else if (!cierreTarde && esHoy && horaActual < '14:00:00') {
      nuevoDeshabilitados.tarde = true;
      nuevoMotivo.tarde = 'El turno Tarde comienza a las 2:00 PM';
    }

    setTurnosDeshabilitados(nuevoDeshabilitados);
    setMotivoDeshabilitado(nuevoMotivo);
  };

  const abrirModal = () => {
    const hoy = getFechaPeru();
    setCierreAEditar(null);
    setFormCierre({ fecha: hoy, turno: '', efectivoFisico: '', observaciones: '' });
    setEfectivoEsperado(0);
    recalcularTurnosDisponibles(hoy);
    setPasoModal(1);
    setModalAbierto(true);
  };

  const abrirCierrePendiente = async (cierre) => {
    setCierreAEditar(cierre);
    setFormCierre({
      fecha: cierre.fecha,
      turno: cierre.turno,
      efectivoFisico: '',
      observaciones: ''
    });
    setEfectivoEsperado(0);
    setConfirmacionAbierta(false);
    await calcularEfectivoEsperado(cierre.turno, cierre.fecha, cierre.id_cierre);
    setPasoModal(2);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCierreAEditar(null);
    setPasoModal(1);
    setConfirmacionAbierta(false);
    setFormCierre({
      fecha: getFechaPeru(),
      turno: '',
      efectivoFisico: '',
      observaciones: ''
    });
    setEfectivoEsperado(0);
  };

  const seleccionarTurno = async (turno) => {
    setFormCierre({ ...formCierre, turno });
    await calcularEfectivoEsperado(turno, formCierre.fecha);
    setPasoModal(2);
  };

  const calcularDiferencia = () => {
    const fisico = Number(formCierre.efectivoFisico) || 0;
    return fisico - efectivoEsperado;
  };

  const abrirConfirmacion = () => {
    setConfirmacionAbierta(true);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        id_cierre: cierreAEditar?.id_cierre ?? null,
        fecha: formCierre.fecha,
        turno: formCierre.turno,
        efectivo_fisico: Number(formCierre.efectivoFisico),
        observaciones: formCierre.observaciones,
        fecha_fin: new Date().toISOString()
      };

      await api.post('/cierres-caja', payload);
      await recargarDatos();
      cerrarModal();
    } catch (err) {
      console.error('Error al guardar cierre:', err);
    } finally {
      setGuardando(false);
    }
  };

  // --- LÓGICA DE REABRIR TURNO ---
  const abrirModalReabrir = (cierre) => {
    setCierreAReabrir(cierre);
    setErrorReabrir(null);
    setModalReabrirAbierto(true);
  };

  const handleReabrirTurno = async () => {
    if (!cierreAReabrir) return;
    setGuardando(true);
    setErrorReabrir(null);

    try {
      await api.put(`/cierres-caja/${cierreAReabrir.id_cierre}/reabrir`);
      setModalReabrirAbierto(false);
      await recargarDatos();
    } catch (err) {
      console.error('Error al reabrir turno:', err);
      setErrorReabrir(err.response?.data?.message || 'Error al reabrir el turno');
    } finally {
      setGuardando(false);
    }
  };

  const nombreResponsable = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : 'Usuario autenticado';
  const hayTurnosAbiertos = cierres.some(
    (cierre) => String(cierre.estado).toUpperCase() === 'ABIERTO'
  );

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Cierres de Caja
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">
            Gestiona los cierres diarios de caja con arqueo y verificación de efectivo.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={recargarDatos}
            disabled={loading}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm dark:shadow-none transition hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-sm dark:shadow-none shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95 flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nuevo Cierre</span>
          </button>
        </div>
      </div>

      {hayTurnosAbiertos && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Atención: Tienes turnos abiertos pendientes de cierre. Por favor, finalízalos para mantener la caja cuadrada.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 sm:p-5 shadow-sm dark:shadow-none">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600/10">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cierres</p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {kpis.totalCierres}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              {kpis.totalCierres === 1 ? 'turno cerrado' : 'turnos cerrados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 sm:p-5 shadow-sm dark:shadow-none">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-600/10">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Efectivo Esperado</p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums break-words">
              {formatCurrency(kpis.efectivoEsperadoTotal)}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              Total del período
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 sm:p-5 shadow-sm dark:shadow-none">
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${kpis.diferenciaAcumulada === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-emerald-600/10'
              : kpis.diferenciaAcumulada < 0
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 ring-rose-600/10'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-blue-600/10'
            }`}>
            {kpis.diferenciaAcumulada === 0 ? (
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : kpis.diferenciaAcumulada < 0 ? (
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Diferencia Acumulada</p>
            <p className={`mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black tabular-nums break-words ${kpis.diferenciaAcumulada === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : kpis.diferenciaAcumulada < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
              {formatCurrency(kpis.diferenciaAcumulada)}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              {kpis.diferenciaAcumulada === 0 ? 'Cuadrado perfecto' : kpis.diferenciaAcumulada < 0 ? 'Faltante' : 'Sobrante'}
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 sm:p-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3 w-full">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por responsable..."
              className="w-full h-[42px] pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none"
            />
          </div>

          <div className="w-full lg:w-[320px] flex-shrink-0">
            <DateRangePicker
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                setFechaDesde(newDesde);
                setFechaHasta(newHasta);
              }}
            />
          </div>

          <div className="relative w-full lg:w-[180px] flex-shrink-0">
            <select
              value={turnoFiltro}
              onChange={(e) => setTurnoFiltro(e.target.value)}
              className="w-full h-[42px] px-3 pr-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none appearance-none cursor-pointer"
            >
              <option value="">Todos los turnos</option>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="h-[42px] px-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition flex-shrink-0 text-sm font-semibold w-full lg:w-auto cursor-pointer"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span className="lg:hidden">Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLA / CARDS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando cierres de caja...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-6 sm:p-8 text-center shadow-sm dark:shadow-none">
          <p className="text-xs sm:text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={recargarDatos}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 shadow-sm dark:shadow-none overflow-hidden">
          {/* MOBILE: cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-600">
            {cierresAgrupados.length > 0 ? cierresAgrupados.map((grupo) => (
              <section key={grupo.fecha}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatearFechaCierre(grupo.fecha)}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {grupo.cierres.length} {grupo.cierres.length === 1 ? 'turno' : 'turnos'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-600">
                  {grupo.cierres.map((cierre) => {
                    const difNum = Number(cierre.diferencia || 0);
                    return (
                <div key={cierre.id_cierre} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {cierre.responsable || 'No asignado'}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${cierre.turno === 'Mañana'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                      }`}>
                      {cierre.turno === 'Mañana' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                      {cierre.turno}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                      <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">Ingresos</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.total_ingresos)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                      <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">Efec. Esperado</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.efectivo_esperado)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                      <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">Efec. Físico</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.efectivo_fisico)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${difNum === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : difNum < 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-blue-50 dark:bg-blue-950/40'}`}>
                      <p className="text-[9px] uppercase font-semibold text-slate-500 dark:text-slate-400">Diferencia</p>
                      <p className={`font-bold tabular-nums ${difNum === 0 ? 'text-emerald-700 dark:text-emerald-400' : difNum < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400'}`}>
                        {formatCurrency(difNum)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.get(`/cierres-caja/${cierre.id_cierre}`);
                          setSelectedCierre(res.data.data);
                        } catch (err) {
                          console.error("Error al traer detalle", err);
                          setSelectedCierre(cierre);
                        }
                        setDrawerAbierto(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95"
                    >
                      Ver Detalle
                    </button>
                    {esAdmin && cierre.estado === 'CERRADO' && (
                      <button
                        type="button"
                        onClick={() => abrirModalReabrir(cierre)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition active:scale-95"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Reabrir
                      </button>
                    )}
                    {String(cierre.estado).toUpperCase() === 'ABIERTO' && (
                      <button
                        type="button"
                        onClick={() => abrirCierrePendiente(cierre)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition active:scale-95"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Cerrar Turno
                      </button>
                    )}
                  </div>
                </div>
                    );
                  })}
                </div>
              </section>
            )) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No hay cierres de caja registrados
              </div>
            )}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block w-full overflow-x-auto [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Turno</th>
                  <th className="p-4">Responsable</th>
                  <th className="p-4 text-right">Total Ingresos</th>
                  <th className="p-4 text-right">Efectivo Esperado</th>
                  <th className="p-4 text-right">Efectivo Físico</th>
                  <th className="p-4 text-right">Diferencia</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-sm">
                {cierresAgrupados.length > 0 ? cierresAgrupados.map((grupo) => (
                  <Fragment key={grupo.fecha}>
                    <tr className="border-y border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900">
                      <td colSpan={8} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {formatearFechaCierre(grupo.fecha)}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {grupo.cierres.length} {grupo.cierres.length === 1 ? 'turno' : 'turnos'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {grupo.cierres.map((cierre) => {
                      const difNum = Number(cierre.diferencia || 0);
                      return (
                    <tr key={cierre.id_cierre} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 text-slate-400 dark:text-slate-500">
                        —
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold ${cierre.turno === 'Mañana'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                          }`}>
                          {cierre.turno === 'Mañana' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                          {cierre.turno}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">{cierre.responsable || 'No asignado'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.total_ingresos)}</td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.efectivo_esperado)}</td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(cierre.efectivo_fisico)}</td>
                      <td className="p-4 text-right">
                        {difNum === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        ) : difNum < 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-400">
                            <AlertCircle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.get(`/cierres-caja/${cierre.id_cierre}`);
                                setSelectedCierre(res.data.data);
                              } catch (err) {
                                console.error("Error al traer detalle", err);
                                setSelectedCierre(cierre);
                              }
                              setDrawerAbierto(true);
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            Detalle
                          </button>
                          {esAdmin && cierre.estado === 'CERRADO' && (
                            <button
                              type="button"
                              onClick={() => abrirModalReabrir(cierre)}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition cursor-pointer active:scale-95"
                              title="Reabrir este turno"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              Reabrir
                            </button>
                          )}
                          {String(cierre.estado).toUpperCase() === 'ABIERTO' && (
                            <button
                              type="button"
                              onClick={() => abrirCierrePendiente(cierre)}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition cursor-pointer active:scale-95"
                              title="Cerrar este turno"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Cerrar Turno
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                      );
                    })}
                  </Fragment>
                )) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No hay cierres de caja registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CIERRE */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
          <div className="my-auto flex max-h-[90vh] max-h-[90dvh] w-[95%] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">{pasoModal === 1 ? 'Seleccionar Turno' : 'Arqueo de Caja'}</h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Gestiona el cierre de forma segura</p>
                </div>
                <button type="button" onClick={cerrarModal} aria-label="Cerrar modal" className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-800">
              {pasoModal === 1 ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                      Fecha del cierre
                    </label>
                    <SingleDatePicker
                      value={formCierre.fecha}
                      onChange={(nuevaFecha) => {
                        setFormCierre({ ...formCierre, fecha: nuevaFecha, turno: '' });
                        recalcularTurnosDisponibles(nuevaFecha);
                      }}
                      placeholder="Seleccionar fecha del cierre"
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center font-medium">¿Qué turno deseas cerrar?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => seleccionarTurno('Mañana')}
                      disabled={turnosDeshabilitados.manana}
                      className={`flex flex-col items-center gap-2 sm:gap-3 rounded-2xl border-2 p-4 sm:p-6 transition-all active:scale-95 ${turnosDeshabilitados.manana
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 opacity-50 cursor-not-allowed'
                          : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-md dark:hover:shadow-none'
                        }`}
                    >
                      <div className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full ${turnosDeshabilitados.manana                       ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        }`}>
                        <Sun className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Mañana</span>
                      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center">
                        {motivoDeshabilitado.manana || 'Antes de las 2:00 PM'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => seleccionarTurno('Tarde')}
                      disabled={turnosDeshabilitados.tarde}
                      className={`flex flex-col items-center gap-2 sm:gap-3 rounded-2xl border-2 p-4 sm:p-6 transition-all active:scale-95 ${turnosDeshabilitados.tarde
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 opacity-50 cursor-not-allowed'
                          : 'border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-md dark:hover:shadow-none'
                        }`}
                    >
                      <div className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full ${turnosDeshabilitados.tarde                       ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        }`}>
                        <Moon className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Tarde</span>
                      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center">
                        {turnosDeshabilitados.tarde ? motivoDeshabilitado.tarde : 'A partir de las 2:00 PM'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-600 shadow-sm dark:shadow-none space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">Responsable: <strong className="text-slate-900 dark:text-slate-100">{nombreResponsable}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Fecha: <strong className="text-slate-900 dark:text-slate-100">{new Date(formCierre.fecha + 'T00:00:00').toLocaleDateString('es-PE')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Turno: <strong className="text-slate-900 dark:text-slate-100">{formCierre.turno}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <Wallet className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Efectivo Esperado: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(efectivoEsperado)}</strong></span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Efectivo Físico</label>
                    <input
                      type="number"
                      value={formCierre.efectivoFisico}
                      onChange={(e) => setFormCierre({ ...formCierre, efectivoFisico: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Diferencia</label>
                    <div className={`h-10 sm:h-12 w-full rounded-xl border px-3 sm:px-4 flex items-center text-xs sm:text-sm font-bold tabular-nums ${calcularDiferencia() === 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                        : calcularDiferencia() < 0
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
                          : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400'
                      }`}>
                      {formatCurrency(calcularDiferencia())}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Observaciones</label>
                    <textarea
                      value={formCierre.observaciones}
                      onChange={(e) => setFormCierre({ ...formCierre, observaciones: e.target.value })}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {pasoModal === 1 ? (
                <button type="button" onClick={cerrarModal} className="w-full h-10 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  Cancelar
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setPasoModal(1)} disabled={guardando} className="w-full sm:w-1/3 h-10 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                    Atrás
                  </button>
                  <button type="button" onClick={abrirConfirmacion} disabled={guardando || !formCierre.efectivoFisico} className="w-full sm:w-2/3 h-10 sm:h-11 rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                    Guardar Cierre
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN */}
      {confirmacionAbierta && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
          <div className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">¿Confirmar cierre de turno?</h3>
                <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                Estás a punto de cerrar el turno <strong className="text-slate-900 dark:text-slate-100">{formCierre.turno}</strong> del <strong className="text-slate-900 dark:text-slate-100">{new Date(formCierre.fecha + 'T00:00:00').toLocaleDateString('es-PE')}</strong> como <strong className="text-slate-900 dark:text-slate-100">{nombreResponsable}</strong>.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2">
                Efectivo esperado: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(efectivoEsperado)}</strong>
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                Efectivo físico: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(Number(formCierre.efectivoFisico))}</strong>
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                Diferencia: <strong className={`${calcularDiferencia() === 0 ? 'text-emerald-600' : calcularDiferencia() < 0 ? 'text-rose-600' : 'text-blue-600'
                  }`}>{formatCurrency(calcularDiferencia())}</strong>
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setConfirmacionAbierta(false)}
                disabled={guardando}
                className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                className="h-10 sm:h-11 flex-1 rounded-xl bg-emerald-600 text-xs sm:text-sm font-bold text-white shadow-md dark:shadow-none shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Sí, cerrar turno
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REABRIR TURNO */}
      {modalReabrirAbierto && cierreAReabrir && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
          <div className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-5 text-white relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate">Reabrir Turno</h2>
                  <p className="text-amber-100 text-[11px] sm:text-xs mt-0.5">Esto permitirá registrar nuevas operaciones</p>
                </div>
                <button type="button" onClick={() => setModalReabrirAbierto(false)} aria-label="Cerrar modal" className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {errorReabrir && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs sm:text-sm text-rose-800 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <p>{errorReabrir}</p>
                </div>
              )}

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas reabrir el turno <strong className="text-slate-900 dark:text-slate-100">{cierreAReabrir.turno}</strong> del <strong className="text-slate-900 dark:text-slate-100">{new Date(cierreAReabrir.fecha + 'T00:00:00').toLocaleDateString('es-PE')}</strong>?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60">
                <strong>Importante:</strong> Al reabrirlo, el sistema permitirá nuevamente registrar ventas y salidas de caja en este turno. Deberás volver a cerrarlo cuando termines.
              </p>

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setModalReabrirAbierto(false)}
                  disabled={guardando}
                  className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleReabrirTurno}
                  disabled={guardando}
                  className="h-10 sm:h-11 flex-1 rounded-xl bg-amber-500 text-xs sm:text-sm font-bold text-white shadow-md dark:shadow-none hover:bg-amber-600 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                  Sí, reabrir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CierreDetailDrawer
        cierre={drawerAbierto ? selectedCierre : null}
        onClose={() => {
          setDrawerAbierto(false);
          setSelectedCierre(null);
        }}
      />
    </div>
  );
}

export default CierresCaja;