import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useDatosActualizados } from '../../hooks/useSocket';
import { OperacionDetailDrawerPremium } from '../../components/dashboard/OperacionDetailDrawerPremium';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Plus, Search, Calendar, Receipt,
  CheckCircle, Clock, AlertCircle, FileText,
  User, CreditCard, Eye, Filter, ChevronDown, Sun, Moon, XCircle, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const REGISTROS_POR_PAGINA = 30;

export function Operaciones() {
  const navigate = useNavigate();

  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const [selectedOp, setSelectedOp] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const cargarOperaciones = useCallback(async () => {
    try {
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      const lista = Array.isArray(data) ? data : [];
      setOperaciones(lista);
      return lista;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const recargarOperaciones = () => {
    setLoading(true);
    return cargarOperaciones();
  };

  useEffect(() => {
    void Promise.resolve().then(cargarOperaciones);
  }, [cargarOperaciones]);

  useDatosActualizados(async () => {
    const lista = await cargarOperaciones();
    setSelectedOp((actual) => {
      if (!actual) return actual;
      return lista.find(
        (operacion) => Number(operacion.id_operacion) === Number(actual.id_operacion)
      ) || actual;
    });
  });

  const limpiarFiltros = () => {
    setPagina(1);
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('');
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTurno = (hora) => {
    if (!hora) return '-';
    const textoHora = String(hora).trim();
    let horaComparar;
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(textoHora)) {
      const [horas, minutos, segundos = '00'] = textoHora.split(':');
      horaComparar = `${horas.padStart(2, '0')}:${minutos}:${segundos}`;
    } else {
      const fecha = new Date(textoHora);
      if (Number.isNaN(fecha.getTime())) return '-';
      horaComparar = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).format(fecha);
    }

    if (horaComparar >= '08:00:00' && horaComparar < '14:00:00') return 'MAÑANA';
    if (horaComparar >= '14:00:00' && horaComparar <= '20:00:00') return 'TARDE';
    return 'FUERA DE TURNO';
  };

  const getTurnoAsignado = (hora) => {
    if (!hora) return null;
    const textoHora = String(hora).trim();
    let horaComparar;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(textoHora)) {
      const [horas, minutos, segundos = '00'] = textoHora.split(':');
      horaComparar = `${horas.padStart(2, '0')}:${minutos}:${segundos}`;
    } else {
      const fecha = new Date(textoHora);
      if (Number.isNaN(fecha.getTime())) return null;
      horaComparar = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).format(fecha);
    }

    return horaComparar >= '14:00:00' ? 'Tarde' : 'Mañana';
  };

  const getTurnoBadge = (hora) => {
    const turno = getTurno(hora);
    if (turno === 'MAÑANA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-bold border border-amber-100 dark:border-amber-800/60">
          <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Mañana
        </span>
      );
    }
    if (turno === 'TARDE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs font-bold border border-indigo-100 dark:border-indigo-800/60">
          <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Tarde
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs font-bold border border-slate-200 dark:border-slate-700">
        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {turno}
      </span>
    );
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'PAGADA' || st === 'VERIFICADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-100 dark:border-emerald-800/60">
          <CheckCircle className="w-3 h-3" /> {st}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-bold border border-amber-100 dark:border-amber-800/60">
          <Clock className="w-3 h-3" /> PENDIENTE
        </span>
      );
    }
    if (st === 'ANULADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] sm:text-xs font-bold border border-rose-100 dark:border-rose-800/60">
          <XCircle className="w-3 h-3" /> ANULADA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] sm:text-xs font-bold border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-3 h-3" /> {st || 'REGISTRADO'}
      </span>
    );
  };

  const operacionesFiltradas = operaciones.filter((op) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const comp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.toLowerCase();
      const cliente = (op.cliente || '').toLowerCase();
      const usuario = `${op.nombres || ''} ${op.apellidos || ''}`.toLowerCase();
      if (!comp.includes(q) && !cliente.includes(q) && !usuario.includes(q)) return false;
    }
    if (fechaDesde && op.fecha < fechaDesde) return false;
    if (fechaHasta && op.fecha > fechaHasta) return false;
    if (estadoFiltro && (op.estado || '').toUpperCase() !== estadoFiltro.toUpperCase()) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(operacionesFiltradas.length / REGISTROS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const operacionesPaginadas = operacionesFiltradas.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  );

  const hayFiltrosActivos = busqueda || fechaDesde || fechaHasta || estadoFiltro;
  const hayAnuladas = operacionesFiltradas.some(op => (op.estado || '').toUpperCase() === 'ANULADA');

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 sm:gap-3">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-brand-orange dark:text-orange-400 flex-shrink-0" />
            <span className="break-words">Historial de Operaciones</span>
          </h1>
          <p className="hidden sm:block text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 font-medium">
            Consulta, filtra y exporta todas las ventas registradas en el sistema.
          </p>
        </div>

        <button
          onClick={() => navigate('/operaciones/nueva')}
          className="w-full sm:w-auto sm:self-end bg-brand-orange hover:bg-brand-orange-hover text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-xs sm:text-sm transition-all shadow-md dark:shadow-none active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Nueva Operación
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3 w-full">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por comprobante o cliente..."
              value={busqueda}
              onChange={e => { setPagina(1); setBusqueda(e.target.value); }}
              className="w-full h-[42px] pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none"
            />
          </div>

          <div className="w-full lg:w-[320px] flex-shrink-0">
            <DateRangePicker
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                setPagina(1);
                setFechaDesde(newDesde);
                setFechaHasta(newHasta);
              }}
            />
          </div>

          <div className="relative w-full lg:w-[180px] flex-shrink-0">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <select
              value={estadoFiltro}
              onChange={e => { setPagina(1); setEstadoFiltro(e.target.value); }}
              className="w-full h-[42px] pl-10 pr-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none appearance-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="PAGADA">Pagadas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="ANULADA">Anuladas</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="h-[42px] px-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition flex-shrink-0 text-sm font-semibold w-full lg:w-auto cursor-pointer"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span className="lg:hidden">Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLA / CARDS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* MOBILE: cards */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Cargando historial...</div>
          ) : operacionesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              No se encontraron operaciones con los filtros seleccionados.
            </div>
          ) : operacionesPaginadas.map((op) => {
            const esAnulada = (op.estado || '').toUpperCase() === 'ANULADA';
            const hayPagoNoEfectivo = Array.isArray(op.pagos) && op.pagos.some((p) => {
              const medio = String(p.medio_pago || p.nombre_medio || '').toLowerCase();
              return medio !== '' && !medio.includes('efectivo');
            });
            const tieneEvidenciaEmpresa = Array.isArray(op.evidencias) && op.evidencias.some(
              (e) => e.tipo_evidencia === 'EMPRESA'
            );
            const evidenciaEmpresaPendiente = hayPagoNoEfectivo && !tieneEvidenciaEmpresa && !esAnulada;

            return (
              <div
                key={op.id_operacion}
                className={`p-3 space-y-2 ${esAnulada ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className={`text-xs font-semibold ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                        {op.fecha}
                      </span>
                      {getTurnoBadge(op.hora)}
                    </div>
                    <p className={`text-sm font-bold break-words ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mr-1">{op.tipo_comprobante || 'DOC'}</span>
                      {op.serie}-{op.numero}
                    </p>
                    <p className={`text-xs mt-0.5 break-words ${esAnulada ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {op.cliente || 'No registrado'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold tabular-nums ${esAnulada ? 'text-slate-400 line-through' : 'text-brand-orange dark:text-orange-400'}`}>
                      {formatCurrency(op.monto)}
                    </p>
                    <div className="mt-1">{getStatusBadge(op.estado)}</div>
                  </div>
                </div>

                {op.pagos && op.pagos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {op.pagos.map((pago, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium ${esAnulada ? 'line-through text-slate-400' : ''}`}
                      >
                        {pago.medio_pago || pago.nombre_medio || 'Efectivo'}: S/ {parseFloat(pago.monto).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}

                {evidenciaEmpresaPendiente && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 border border-amber-200 dark:border-amber-800/60">
                    <Clock className="w-3 h-3" /> Evidencia empresa pendiente
                  </span>
                )}

                <button
                  onClick={() => { setSelectedOp(op); setDrawerAbierto(true); }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  <Eye className="h-3.5 w-3.5" /> Ver Detalle
                </button>
              </div>
            );
          })}
        </div>

        {/* DESKTOP: tabla */}
        <div className="hidden md:block overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Fecha</th>
                <th className="p-4">Turno</th>
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Medios de Pago</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 dark:text-slate-400 text-lg">Cargando historial...</td>
                </tr>
              ) : operacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 dark:text-slate-400 text-lg">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      No se encontraron operaciones con los filtros seleccionados.
                    </div>
                  </td>
                </tr>
              ) : operacionesPaginadas.map((op) => {
                const esAnulada = (op.estado || '').toUpperCase() === 'ANULADA';
                const hayPagoNoEfectivo = Array.isArray(op.pagos) && op.pagos.some((p) => {
                  const medio = String(p.medio_pago || p.nombre_medio || '').toLowerCase();
                  return medio !== '' && !medio.includes('efectivo');
                });
                const tieneEvidenciaEmpresa = Array.isArray(op.evidencias) && op.evidencias.some(
                  (e) => e.tipo_evidencia === 'EMPRESA'
                );
                const evidenciaEmpresaPendiente = hayPagoNoEfectivo && !tieneEvidenciaEmpresa && !esAnulada;
                const turnoAsignado = getTurnoAsignado(op.hora || op.fecha_registro);
                const mostrarTurnoAsignado = turnoAsignado && getTurno(op.hora) !== turnoAsignado.toUpperCase();

                return (
                  <tr key={op.id_operacion} className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group ${esAnulada ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className={`text-sm font-semibold ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{op.fecha}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        {getTurnoBadge(op.hora)}
                        {mostrarTurnoAsignado && (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            turnoAsignado === 'Tarde'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                          }`}>
                            Turno {turnoAsignado}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-5 h-5 flex-shrink-0 ${esAnulada ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`} />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">{op.tipo_comprobante || 'DOC'}</span>
                          <span className={`text-sm font-bold ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{op.serie}-{op.numero}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className={`max-w-[240px] whitespace-normal break-words text-sm font-medium ${esAnulada ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`} title={op.cliente || 'No registrado'}>
                          {op.cliente || 'No registrado'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {op.pagos && op.pagos.length > 0 ? op.pagos.map((pago, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CreditCard className={`w-4 h-4 flex-shrink-0 ${esAnulada ? 'text-slate-300 dark:text-slate-600' : 'text-blue-600 dark:text-blue-400'}`} />
                            <span className={`text-xs font-semibold ${esAnulada ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{pago.medio_pago || pago.nombre_medio || 'Efectivo'}:</span>
                            <span className={`text-xs font-bold ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>S/ {parseFloat(pago.monto).toFixed(2)}</span>
                          </div>
                        )) : <span className="text-xs text-slate-400 dark:text-slate-500">-</span>}

                        {evidenciaEmpresaPendiente && (
                          <span className="inline-flex items-center gap-1 mt-1 w-fit rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 border border-amber-200 dark:border-amber-800/60">
                            <Clock className="w-3 h-3" />
                            Evidencia empresa pendiente
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(op.estado)}
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <span className={`text-lg font-bold ${esAnulada ? 'text-slate-400 line-through' : 'text-brand-orange dark:text-orange-400'}`}>
                        {formatCurrency(op.monto)}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => { setSelectedOp(op); setDrawerAbierto(true); }}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && operacionesFiltradas.length > 0 && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
              disabled={paginaActual === 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
              disabled={paginaActual === totalPaginas}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {operacionesFiltradas.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-2 sm:gap-4">
            {hayAnuladas && (
              <span className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 sm:px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                El total excluye operaciones anuladas
              </span>
            )}
            <div className="text-right w-full sm:w-auto">
              <span className="text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 mr-2 uppercase">Total Conciliado:</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(
                  operacionesFiltradas
                    .filter(op => (op.estado || '').toUpperCase() !== 'ANULADA')
                    .reduce((sum, op) => sum + Number(op.monto), 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <OperacionDetailDrawerPremium
        op={drawerAbierto ? selectedOp : null}
        onClose={() => setDrawerAbierto(false)}
        onEvidenciaSubida={async (idOperacion) => {
          const lista = await recargarOperaciones();
          const opActualizada = lista.find(
            (o) => Number(o.id_operacion) === Number(idOperacion)
          );
          if (opActualizada) {
            setSelectedOp(opActualizada);
          }
        }}
        onRegistroActualizado={async (idOperacion) => {
          const lista = await recargarOperaciones();
          const opActualizada = lista.find(
            (o) => Number(o.id_operacion) === Number(idOperacion)
          );
          if (!opActualizada) return false;
          setSelectedOp(opActualizada);
          return true;
        }}
      />
    </div>
  );
}

export default Operaciones;