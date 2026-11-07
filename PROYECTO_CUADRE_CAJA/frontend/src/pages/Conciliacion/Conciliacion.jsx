import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDatosActualizados } from '../../hooks/useSocket';
import api from '../../lib/api';
import {
  Plus, CheckCircle, AlertCircle, RefreshCw, Search,
  X, Loader2, Sun, Moon, BarChart2, AlertTriangle, FileText, Eye, Info
} from 'lucide-react';
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';
import { compararReferencias } from '../../utils/referenciaPago';

const evaluarOperacion = (opPago, opEmpresa) => {
  const estado = compararReferencias(opPago, opEmpresa);
  if (estado === 'COINCIDE') {
    return {
      estado,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
      icono: 'check'
    };
  }
  if (estado === 'NO COINCIDEN (REQUIERE VALIDACIÓN)') {
    return {
      estado,
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
      icono: 'alert'
    };
  }
  return {
    estado,
    color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    icono: 'info'
  };
};

export function Conciliacion() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conciliaciones, setConciliaciones] = useState([]);
  const [poniendoEnRevisionId, setPoniendoEnRevisionId] = useState(null);
  const [estadoRevision, setEstadoRevision] = useState(null);
  const [modalRevisionAbierto, setModalRevisionAbierto] = useState(false);
  const [motivoRevision, setMotivoRevision] = useState('');
  const [conciliacionARevisar, setConciliacionARevisar] = useState(null);
  const [errorMotivoRevision, setErrorMotivoRevision] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [conciliacionDetalle, setConciliacionDetalle] = useState(null);
  const [detallePreCalculo, setDetallePreCalculo] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(null);

  const [formConciliacion, setFormConciliacion] = useState({
    fecha: new Date().toLocaleDateString('en-CA'),
    diferencia_detectada: 0,
    resultado: 'CONCILIADO',
    observacion: ''
  });
  const [preCalculo, setPreCalculo] = useState({
    cierres: [],
    diferencia_total: 0,
    total_ingresos: 0,
    total_no_efectivo: 0,
    total_efectivo_esperado: 0,
    total_salidas: 0,
    operaciones_pendientes_evidencia: 0,
    operaciones_con_numeros: [],
    todas_las_operaciones: []
  });

  const conciliacionesUnicas = useMemo(() => {
    const porFecha = new Map();
    conciliaciones.forEach((conciliacion) => {
      const fecha = String(conciliacion.fecha || '').slice(0, 10);
      if (!fecha) return;

      const existente = porFecha.get(fecha);
      if (!existente) {
        porFecha.set(fecha, conciliacion);
        return;
      }

      const fechaRegistroNueva = Date.parse(conciliacion.fecha_registro || '');
      const fechaRegistroExistente = Date.parse(existente.fecha_registro || '');
      const idNuevo = Number(conciliacion.id_conciliacion) || 0;
      const idExistente = Number(existente.id_conciliacion) || 0;
      const esMasReciente = Number.isFinite(fechaRegistroNueva) &&
        (!Number.isFinite(fechaRegistroExistente) ||
          fechaRegistroNueva > fechaRegistroExistente ||
          (fechaRegistroNueva === fechaRegistroExistente && idNuevo > idExistente));

      if (esMasReciente || (
        !Number.isFinite(fechaRegistroNueva) &&
        !Number.isFinite(fechaRegistroExistente) &&
        idNuevo > idExistente
      )) {
        porFecha.set(fecha, conciliacion);
      }
    });

    return Array.from(porFecha.values()).sort((a, b) => (
      String(b.fecha || '').localeCompare(String(a.fecha || ''))
    ));
  }, [conciliaciones]);

  const conciliacionExistente = conciliacionesUnicas.find(
    (conciliacion) =>
      String(conciliacion.fecha || '').slice(0, 10) === formConciliacion.fecha
  );
  const fechaOcupada = Boolean(conciliacionExistente);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return '-';
    const d = new Date(fechaRaw + (fechaRaw.includes('T') ? '' : 'T00:00:00'));
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : fechaRaw;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const res = await api.get('/conciliaciones');
      const data = res.data?.data || res.data;
      setConciliaciones(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('No hay datos disponibles');
      setConciliaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const recargarDatos = () => {
    setLoading(true);
    setError(null);
    return cargarDatos();
  };

  const abrirDetalle = async (conciliacion) => {
    setConciliacionDetalle(conciliacion);
    setDetallePreCalculo(null);
    setErrorDetalle(null);
    setCargandoDetalle(true);
    setModalDetalleAbierto(true);

    try {
      const fecha = String(conciliacion.fecha || '').slice(0, 10);
      const res = await api.get(`/conciliaciones/pre-calculo?fecha=${encodeURIComponent(fecha)}`);
      setDetallePreCalculo(res.data?.data || res.data);
    } catch (err) {
      console.error('Error al cargar el detalle diario de conciliación:', err);
      setErrorDetalle(
        err.response?.data?.message || err.message || 'No se pudo cargar el detalle de la conciliación.'
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setModalDetalleAbierto(false);
    setConciliacionDetalle(null);
    setDetallePreCalculo(null);
    setErrorDetalle(null);
  };

  useEffect(() => { void Promise.resolve().then(cargarDatos); }, [cargarDatos]);

  useDatosActualizados(() => {
    void cargarDatos();
  });

  const calcularPreCalculo = async (fecha) => {
    try {
      const res = await api.get(`/conciliaciones/pre-calculo?fecha=${fecha}`);
      const data = res.data.data;
      setPreCalculo(data);
      setFormConciliacion(prev => ({ ...prev, diferencia_detectada: data.diferencia_total }));
    } catch {
      setPreCalculo({
        cierres: [], diferencia_total: 0, total_ingresos: 0,
        total_no_efectivo: 0, total_efectivo_esperado: 0, total_salidas: 0,
        operaciones_pendientes_evidencia: 0, operaciones_con_numeros: [],
        todas_las_operaciones: []
      });
    }
  };

  const abrirModalRevision = (conciliacion) => {
    setConciliacionARevisar(conciliacion);
    setMotivoRevision('');
    setErrorMotivoRevision(null);
    setEstadoRevision(null);
    setModalRevisionAbierto(true);
  };

  const cerrarModalRevision = () => {
    if (poniendoEnRevisionId !== null) return;
    setModalRevisionAbierto(false);
    setConciliacionARevisar(null);
    setMotivoRevision('');
    setErrorMotivoRevision(null);
  };

  const handlePonerEnRevision = async (e) => {
    e.preventDefault();
    if (!conciliacionARevisar || poniendoEnRevisionId !== null) return;

    const motivo = motivoRevision.trim();
    if (!motivo) {
      setErrorMotivoRevision('Debes indicar el motivo para ponerla en revisión.');
      return;
    }

    setPoniendoEnRevisionId(conciliacionARevisar.id_conciliacion);
    setEstadoRevision(null);
    setErrorMotivoRevision(null);
    try {
      await api.put(`/conciliaciones/${conciliacionARevisar.id_conciliacion}/revertir`, {
        motivo
      });
      setEstadoRevision({ tipo: 'success', mensaje: 'Conciliación puesta en revisión.' });
      setModalRevisionAbierto(false);
      setConciliacionARevisar(null);
      setMotivoRevision('');
      await recargarDatos();
    } catch (err) {
      setErrorMotivoRevision(
        err.response?.data?.message || err.message || 'No se pudo poner la conciliación en revisión.'
      );
    } finally {
      setPoniendoEnRevisionId(null);
    }
  };

  const abrirModal = () => {
    setModalAbierto(true);
    setErrorModal(null);
    setExitoModal(null);
    const hoy = new Date().toLocaleDateString('en-CA');
    const conciliacionHoy = conciliacionesUnicas.find(
      (conciliacion) => String(conciliacion.fecha || '').slice(0, 10) === hoy
    );
    setFormConciliacion({
      fecha: hoy,
      diferencia_detectada: conciliacionHoy?.diferencia ?? 0,
      resultado: conciliacionHoy?.resultado || 'CONCILIADO',
      observacion: conciliacionHoy?.observacion || ''
    });
    calcularPreCalculo(hoy);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setErrorModal(null);
    setExitoModal(null);
    setGuardando(true);

    try {
      const payload = {
        fecha: formConciliacion.fecha,
        diferencia_detectada: preCalculo.diferencia_total,
        resultado: formConciliacion.resultado,
        observacion: formConciliacion.observacion.trim() || null
      };

      if (conciliacionExistente) {
        await api.put(
          `/conciliaciones/${conciliacionExistente.id_conciliacion}`,
          payload
        );
        setExitoModal('Conciliación actualizada exitosamente.');
      } else {
        await api.post('/conciliaciones', payload);
        setExitoModal('Conciliación registrada exitosamente.');
      }
      await recargarDatos();

      setTimeout(() => {
        setModalAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 1000);
    } catch (err) {
      const msj = err.response?.data?.message || err.message || 'Error al registrar la conciliación';
      setErrorModal(msj);
      setGuardando(false);
    }
  };

  const conciliacionesFiltradas = conciliacionesUnicas.filter(c => {
    if (busqueda) {
      const userStr = (c.usuario || '').toLowerCase();
      if (!userStr.includes(busqueda.toLowerCase())) return false;
    }
    if (fechaFiltro && c.fecha !== fechaFiltro) return false;
    return true;
  });

  const pendientesEvidencia = Number(preCalculo.operaciones_pendientes_evidencia || 0);

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 pb-10 animate-fade-in-up dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Conciliación Diaria</h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">Revisión y validación de operaciones agrupadas por día.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={recargarDatos} disabled={loading} className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:shadow-none">
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {esAdmin && (
            <button type="button" onClick={abrirModal} className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-3 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-brand-orange-hover active:scale-95 cursor-pointer flex-1 sm:flex-initial dark:shadow-none">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Nueva Conciliación</span>
            </button>
          )}
        </div>
      </div>

      {estadoRevision && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${
          estadoRevision.tipo === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {estadoRevision.mensaje}
        </div>
      )}

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input type="text" placeholder="Buscar por responsable..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-[42px] w-full rounded-xl border border-slate-300 bg-white pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange/20 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" />
          </div>
          <div className="w-full sm:w-64">
            <SingleDatePicker
              value={fechaFiltro}
              onChange={(nuevaFecha) => setFechaFiltro(nuevaFecha)}
              placeholder="Filtrar por fecha"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando conciliaciones...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none">
          <p className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button onClick={recargarDatos} className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold cursor-pointer dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Reintentar</button>
        </div>
      ) : conciliacionesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none">
          <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mb-3 dark:text-slate-500" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">No hay conciliaciones registradas</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 dark:text-slate-400">Las conciliaciones que registres aparecerán aquí.</p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 sm:gap-5">
          {conciliacionesFiltradas.map((c) => (
            <div key={c.id_conciliacion} className="w-full max-w-full sm:max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none dark:hover:shadow-none">

              <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-3 sm:p-4 border-b border-blue-900/30 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-white capitalize break-words">
                      {formatearFecha(c.fecha)}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-blue-100 font-medium mt-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.resultado === 'CONCILIADO' ? 'bg-emerald-300' : 'bg-amber-300'}`}></span>
                      <span className="truncate">Registrado por: <span className="font-semibold text-white">{c.usuario || 'No asignado'}</span></span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-100">Diferencia</p>
                      <p className={`text-sm sm:text-base font-black tabular-nums ${Number(c.diferencia) === 0 ? 'text-white' : Number(c.diferencia) < 0 ? 'text-rose-200' : 'text-emerald-200'}`}>
                        {formatCurrency(c.diferencia)}
                      </p>
                    </div>
                    <div className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 ${c.resultado === 'CONCILIADO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {c.resultado === 'CONCILIADO' ? <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                      {c.resultado}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    ['Total Ingresos', c.total_ingresos],
                    ['Total Efectivo', c.total_efectivo],
                    ['Total No Efectivo', c.total_no_efectivo],
                  ].map(([label, amount]) => (
                    <div key={label} className="min-w-0 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 sm:px-3">
                      <p className="truncate text-[8px] sm:text-[10px] font-bold uppercase tracking-wide text-blue-100">{label}</p>
                      <p className="mt-0.5 truncate text-xs sm:text-sm font-black tabular-nums text-white">{formatCurrency(amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {String(c.resultado || '').toUpperCase() === 'EN REVISIÓN' && c.observacion && (
                <p className="px-3 pt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Observación:</span> {c.observacion}
                </p>
              )}

              <div className="flex-1 px-3 py-3 sm:px-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consulta el consolidado, todas las operaciones del día y la validación de números.
                </p>
              </div>

              <div className="bg-slate-50/80 p-3 border-t border-slate-100 flex flex-wrap justify-end gap-2 dark:bg-slate-800 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => abrirDetalle(c)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver Detalle
                </button>
                <button onClick={() => navigate(`/reportes?fecha=${c.fecha}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-600 dark:shadow-none">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Ver Reporte
                </button>
                {esAdmin && String(c.resultado || '').toUpperCase() === 'CONCILIADO' && (
                  <button
                    type="button"
                    onClick={() => abrirModalRevision(c)}
                    disabled={poniendoEnRevisionId === c.id_conciliacion}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800/60 dark:bg-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:shadow-none"
                  >
                    {poniendoEnRevisionId === c.id_conciliacion
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <AlertTriangle className="h-3.5 w-3.5" />}
                    Poner en Revisión
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {modalDetalleAbierto && conciliacionDetalle && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detalle-conciliacion-titulo"
        >
          <div className="my-auto flex max-h-[92vh] max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-5 py-5 text-white sm:px-8 sm:py-7">
              <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">Conciliación diaria</p>
                  <h2 id="modal-detalle-conciliacion-titulo" className="mt-1 text-xl font-black sm:text-2xl">
                    Resumen del Día
                  </h2>
                  <p className="mt-1 text-xs capitalize text-blue-100 sm:text-sm">
                    {formatearFecha(conciliacionDetalle.fecha)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarDetalle}
                  aria-label="Cerrar detalle"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-7 dark:bg-slate-950">
              {cargandoDetalle ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm font-semibold">Cargando detalle del día...</p>
                </div>
              ) : errorDetalle ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{errorDetalle}</p>
                </div>
              ) : detallePreCalculo ? (
                <>
                  <section aria-label="Totales consolidados" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      {
                        label: 'Total Facturado',
                        value: detallePreCalculo.total_ingresos,
                        style: 'border-blue-100 bg-white text-slate-900 dark:border-blue-900/60 dark:bg-slate-900 dark:text-white'
                      },
                      {
                        label: 'Total No Efectivo',
                        value: detallePreCalculo.total_no_efectivo,
                        style: 'border-violet-100 bg-white text-violet-800 dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-300'
                      },
                      {
                        label: 'Total Salidas',
                        value: detallePreCalculo.total_salidas,
                        style: 'border-rose-100 bg-white text-rose-700 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300'
                      },
                      {
                        label: 'Efectivo Neto',
                        value: detallePreCalculo.total_efectivo_esperado,
                        style: 'border-emerald-100 bg-white text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300'
                      }
                    ].map((total) => (
                      <div key={total.label} className={`rounded-2xl border p-4 shadow-sm ${total.style}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{total.label}</p>
                        <p className="mt-2 text-lg font-black tabular-nums sm:text-xl">
                          {formatCurrency(total.value)}
                        </p>
                      </div>
                    ))}
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-5">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Operaciones del día</h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Incluye operaciones en efectivo y otros medios de pago.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        {detallePreCalculo.todas_las_operaciones?.length || 0}
                      </span>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-bold">Comprobante</th>
                            <th className="px-4 py-3 font-bold">Cliente</th>
                            <th className="px-4 py-3 font-bold">Medio de Pago</th>
                            <th className="px-4 py-3 text-right font-bold">Monto</th>
                            <th className="px-4 py-3 font-bold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {detallePreCalculo.todas_las_operaciones?.length > 0 ? (
                            detallePreCalculo.todas_las_operaciones.map((op) => (
                              <tr key={op.id_operacion} className="text-slate-700 dark:text-slate-300">
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                  <span>{op.comprobante || `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`}</span>
                                  <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                                    Operación #{op.id_operacion}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{op.cliente || 'Sin cliente'}</td>
                                <td className="px-4 py-3">{op.medio_pago || 'Sin medio de pago'}</td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(op.monto)}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    String(op.estado || '').toUpperCase() === 'ANULADA'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  }`}>
                                    {op.estado || 'Sin estado'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                No hay operaciones registradas para esta fecha.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm dark:border-violet-900/60 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3 border-b border-violet-100 bg-violet-50/70 px-4 py-4 dark:border-violet-900/60 dark:bg-violet-950/30 sm:px-5">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Validación de Nros.</h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Comparación de referencias del cliente y la empresa.</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-slate-800 dark:text-violet-300">
                        {detallePreCalculo.operaciones_con_numeros?.length || 0}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detallePreCalculo.operaciones_con_numeros?.length > 0 ? (
                        detallePreCalculo.operaciones_con_numeros.map((op) => {
                          const nroEmpresa = op.num_operacion_empresa || op.num_op_empresa_alt;
                          const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa);

                          return (
                            <div key={`${op.id_operacion}-${op.id_pago ?? ''}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {op.tipo_comprobante} {op.serie}-{op.numero}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  {op.medio_pago || 'Medio de pago no indicado'}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs sm:min-w-64">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cliente</p>
                                  <p className="mt-1 break-all font-mono text-slate-700 dark:text-slate-300">{op.num_operacion_pago || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Empresa</p>
                                  <p className="mt-1 break-all font-mono text-slate-700 dark:text-slate-300">{nroEmpresa || '-'}</p>
                                </div>
                              </div>
                              <span className={`inline-flex w-fit items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${evaluacion.color}`}>
                                {evaluacion.icono === 'check' && <CheckCircle className="h-3 w-3" />}
                                {evaluacion.icono === 'alert' && <AlertTriangle className="h-3 w-3" />}
                                {evaluacion.icono === 'eye' && <Eye className="h-3 w-3" />}
                                {evaluacion.icono === 'info' && <Info className="h-3 w-3" />}
                                {evaluacion.estado}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-4 py-7 text-center text-sm text-slate-500 dark:text-slate-400">
                          No hay pagos que requieran validación de números para esta fecha.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
          <div className="my-auto flex max-h-[90vh] max-h-[90dvh] w-[95%] max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Nueva Conciliación</h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Cierre diario de todos los turnos</p>
                </div>
                <button type="button" onClick={cerrarModal} aria-label="Cerrar modal" className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <form onSubmit={handleGuardar} className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-3 sm:space-y-4 dark:bg-slate-900">
              {errorModal && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-2 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 shrink-0 dark:text-rose-400" /> {errorModal}
                </div>
              )}
              {exitoModal && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 text-xs sm:text-sm text-emerald-800 flex items-center gap-2 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0 dark:text-emerald-400" /> {exitoModal}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Fecha a Conciliar <span className="text-rose-500">*</span></label>
                <SingleDatePicker
                  value={formConciliacion.fecha}
                  onChange={(nuevaFecha) => {
                    const existente = conciliacionesUnicas.find(
                      (conciliacion) =>
                        String(conciliacion.fecha || '').slice(0, 10) === nuevaFecha
                    );
                    setFormConciliacion((actual) => ({
                      ...actual,
                      fecha: nuevaFecha,
                      diferencia_detectada: existente?.diferencia ?? 0,
                      resultado: existente?.resultado || 'CONCILIADO',
                      observacion: existente?.observacion || ''
                    }));
                    calcularPreCalculo(nuevaFecha);
                  }}
                  placeholder="Seleccionar fecha a conciliar"
                />
              </div>

              {fechaOcupada && (
                <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 animate-fade-in dark:bg-amber-950/40 dark:border-amber-800/60">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Esta fecha ya tiene una conciliación registrada.</p>
                    <p className="text-xs text-amber-800 mt-0.5 dark:text-amber-400">Al guardar, actualizarás el registro existente sin crear otra tarjeta.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 sm:mb-3 dark:text-slate-400">Resumen del Día</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-600">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">Ingresos Totales</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums dark:text-slate-100">{formatCurrency(preCalculo.total_ingresos)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-600">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">No Efectivo</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums dark:text-slate-100">{formatCurrency(preCalculo.total_no_efectivo)}</p>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-2 sm:p-3 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-800/60">
                    <p className="text-[9px] sm:text-[10px] font-bold text-rose-600 uppercase dark:text-rose-400">Total Salidas</p>
                    <p className="text-xs sm:text-sm font-black text-rose-700 tabular-nums dark:text-rose-300">{formatCurrency(preCalculo.total_salidas)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-600">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">Efectivo Neto</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums dark:text-slate-100">{formatCurrency(preCalculo.total_efectivo_esperado)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {preCalculo.cierres.length > 0 ? (
                    preCalculo.cierres.map(c => (
                      <div key={c.id_cierre} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                            {c.turno === 'Mañana' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                            Turno {c.turno}
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{c.estado}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5">
                          <div>
                            <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Ingresos</p>
                            <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(c.total_ingresos)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">No efectivo</p>
                            <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(c.total_no_efectivo)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400">Salidas</p>
                            <p className="text-xs font-bold tabular-nums text-rose-700 dark:text-rose-300">{formatCurrency(c.total_salidas)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Efectivo neto</p>
                            <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(Number(c.efectivo_esperado || 0) - Number(c.total_salidas || 0))}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Diferencia</p>
                            <p className={`text-xs font-bold tabular-nums ${Number(c.diferencia) === 0 ? 'text-slate-700 dark:text-slate-200' : Number(c.diferencia) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {formatCurrency(c.diferencia)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2 dark:text-slate-400">No hay cierres registrados en esta fecha.</p>
                  )}
                </div>

                <div className="border-t border-slate-200 mt-2 pt-3 flex items-center justify-between gap-2 dark:border-slate-600">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Diferencia Total</span>
                  <span className={`text-base sm:text-xl font-black tabular-nums ${preCalculo.diferencia_total === 0 ? 'text-emerald-600 dark:text-emerald-400' : preCalculo.diferencia_total < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {formatCurrency(preCalculo.diferencia_total)}
                  </span>
                </div>
              </div>

              {preCalculo.operaciones_con_numeros && preCalculo.operaciones_con_numeros.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 dark:text-slate-400">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="truncate">Validación de Nros.</span>
                    </p>
                    <span className="text-[9px] sm:text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0 dark:bg-slate-700 dark:text-slate-300">
                      {preCalculo.operaciones_con_numeros.length}
                    </span>
                  </div>

                  <div className="overflow-y-auto max-h-56 sm:max-h-64 pr-1 space-y-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                    {preCalculo.operaciones_con_numeros.map((op, idx) => {
                      const nroEmpresa = op.num_operacion_empresa || op.num_op_empresa_alt;
                      const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa);

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-700">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate dark:text-slate-100">
                              {op.tipo_comprobante} {op.serie}-{op.numero}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 dark:text-slate-400">{op.medio_pago}</p>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
                            <div>
                              <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold dark:text-slate-500">Cliente</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{op.num_operacion_pago || '-'}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold dark:text-slate-500">Empresa</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{nroEmpresa || '-'}</span>
                            </div>
                          </div>
                          <div className="sm:ml-4 shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border ${evaluacion.color}`}>
                              {evaluacion.icono === 'check' && <CheckCircle className="w-3 h-3" />}
                              {evaluacion.icono === 'alert' && <AlertTriangle className="w-3 h-3" />}
                              {evaluacion.icono === 'eye' && <Eye className="w-3 h-3" />}
                              {evaluacion.icono === 'info' && <Info className="w-3 h-3" />}
                              {evaluacion.estado}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendientesEvidencia > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2 dark:bg-amber-950/40 dark:border-amber-800/60">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 dark:text-amber-400" />
                  <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed dark:text-amber-400">
                    <strong>{pendientesEvidencia} {pendientesEvidencia === 1 ? 'operación tiene' : 'operaciones tienen'}</strong>{' '}
                    pago no efectivo sin evidencia de empresa registrada.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Resultado <span className="text-rose-500">*</span></label>
                <select value={formConciliacion.resultado} onChange={(e) => setFormConciliacion({ ...formConciliacion, resultado: e.target.value })} className="w-full h-[42px] rounded-xl border border-slate-300 bg-white px-3 sm:px-4 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-brand-orange/20 outline-none cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                  <option value="CONCILIADO">CONCILIADO</option>
                  <option value="EN REVISIÓN">EN REVISIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Observación (Opcional)</label>
                <textarea rows={2} value={formConciliacion.observacion} onChange={(e) => setFormConciliacion({ ...formConciliacion, observacion: e.target.value })} placeholder="Detalles adicionales..." className="w-full rounded-xl border border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange/20 outline-none resize-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" />
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 dark:border-slate-600">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Cancelar</button>
                <button type="submit" disabled={guardando} className="h-10 sm:h-11 flex-[2] rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                    : fechaOcupada
                      ? 'Actualizar Conciliación'
                      : 'Guardar Conciliación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRevisionAbierto && conciliacionARevisar && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-revision-titulo"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModalRevision();
          }}
        >
          <form
            onSubmit={handlePonerEnRevision}
            className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-6"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="modal-revision-titulo" className="text-lg font-bold text-slate-900 dark:text-slate-100">Poner en Revisión</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Indica por qué se pone en revisión la conciliación del {formatearFecha(conciliacionARevisar.fecha)}.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalRevision}
                disabled={poniendoEnRevisionId !== null}
                aria-label="Cerrar modal"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label htmlFor="motivo-revision" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="motivo-revision"
              rows={4}
              value={motivoRevision}
              onChange={(e) => {
                setMotivoRevision(e.target.value);
                if (e.target.value.trim()) setErrorMotivoRevision(null);
              }}
              placeholder="Escribe el motivo por el cual se reabre esta conciliación..."
              aria-invalid={Boolean(errorMotivoRevision)}
              aria-describedby={errorMotivoRevision ? 'motivo-revision-error' : undefined}
              disabled={poniendoEnRevisionId !== null}
              className={`w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                errorMotivoRevision
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                  : 'border-slate-300 focus:border-brand-orange focus:ring-brand-orange/20 dark:border-slate-600'
              }`}
            />
            {errorMotivoRevision && (
              <p id="motivo-revision-error" role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errorMotivoRevision}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModalRevision}
                disabled={poniendoEnRevisionId !== null}
                className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={poniendoEnRevisionId !== null}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {poniendoEnRevisionId !== null
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                  : 'Confirmar Revisión'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Conciliacion;