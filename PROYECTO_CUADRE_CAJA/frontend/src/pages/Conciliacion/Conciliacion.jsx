import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import api from '../../lib/api';
import {
  Plus, CheckCircle, AlertCircle, RefreshCw, Search,
  X, Loader2, Sun, Moon, BarChart2, AlertTriangle, FileText, Eye, Info
} from 'lucide-react';
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';

const evaluarOperacion = (opPago, opEmpresa, medioPago) => {
  if (!opPago && !opEmpresa) return { estado: 'SIN DATOS', color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600', icono: 'info' };
  if (!opPago || !opEmpresa) return { estado: 'INCOMPLETO', color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600', icono: 'info' };

  const medio = String(medioPago || '').toLowerCase();

  if (medio.includes('bcp')) {
    const cleanPago = String(opPago).replace(/\D/g, '').replace(/^0+/, '');
    const cleanEmpresa = String(opEmpresa).replace(/\D/g, '').replace(/^0+/, '');

    if (cleanPago === cleanEmpresa) {
      return { estado: 'COINCIDE (BCP)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60', icono: 'check' };
    }
    return { estado: 'DIFERENTE (BCP)', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60', icono: 'alert' };
  }

  return { estado: 'REVISIÓN MANUAL', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600', icono: 'eye' };
};

export function Conciliacion() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conciliaciones, setConciliaciones] = useState([]);

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
    operaciones_con_numeros: []
  });

  // NUEVO: Detectar si la fecha del formulario ya está conciliada
  const yaConciliado = conciliaciones.some(c => c.fecha === formConciliacion.fecha);

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

  useEffect(() => { void Promise.resolve().then(cargarDatos); }, [cargarDatos]);

  useEffect(() => {
    if (!socket) return undefined;
    const actualizarConciliaciones = () => {
      void cargarDatos();
    };
    const eventos = [
      'operacion_creada',
      'pago_actualizado',
      'salida_creada',
      'cierre_actualizado',
      'ajuste_creado',
    ];
    eventos.forEach((evento) => socket.on(evento, actualizarConciliaciones));

    return () => {
      eventos.forEach((evento) => socket.off(evento, actualizarConciliaciones));
    };
  }, [socket, cargarDatos]);

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
        operaciones_pendientes_evidencia: 0, operaciones_con_numeros: []
      });
    }
  };

  const abrirModal = () => {
    setModalAbierto(true);
    setErrorModal(null);
    setExitoModal(null);
    const hoy = new Date().toLocaleDateString('en-CA');
    setFormConciliacion({ fecha: hoy, diferencia_detectada: 0, resultado: 'CONCILIADO', observacion: '' });
    calcularPreCalculo(hoy);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando || yaConciliado) return;
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

      await api.post('/conciliaciones', payload);
      setExitoModal('Conciliación registrada exitosamente.');
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

  const conciliacionesFiltradas = conciliaciones.filter(c => {
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
        <div className="flex flex-col gap-4 sm:gap-5 items-start">
          {conciliacionesFiltradas.map((c) => (
            <div key={c.id_conciliacion} className="w-full max-w-full sm:max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none dark:hover:shadow-none">

              <div className="bg-slate-50/50 p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 dark:bg-slate-800 dark:border-slate-600">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 capitalize break-words dark:text-slate-100">
                    {formatearFecha(c.fecha)}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                    <span className="truncate">Conciliado por: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.usuario || 'No asignado'}</span></span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Diferencia</p>
                    <p className={`text-sm sm:text-base font-black tabular-nums ${Number(c.diferencia) === 0 ? 'text-slate-900 dark:text-slate-100' : Number(c.diferencia) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(c.diferencia)}
                    </p>
                  </div>
                  <div className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 ${c.resultado === 'CONCILIADO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' : 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'}`}>
                    {c.resultado === 'CONCILIADO' ? <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    {c.resultado}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 flex-1">
                <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 dark:text-slate-400">
                    <FileText className="w-3 w-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate">Operaciones y Nros. de Validación</span>
                  </p>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0 dark:bg-slate-700 dark:text-slate-300">
                    {c.operaciones_con_numeros?.length || 0}
                  </span>
                </div>

                {c.operaciones_con_numeros && c.operaciones_con_numeros.length > 0 ? (
                  <div className="flex flex-col divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30 dark:divide-slate-600 dark:border-slate-600 dark:bg-slate-900/60">
                    {c.operaciones_con_numeros.map((op, idx) => {
                      const nroEmpresa = op.num_operacion_empresa || op.num_op_empresa_alt;
                      const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa, op.medio_pago);

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 hover:bg-white transition-colors gap-2 dark:hover:bg-slate-700/60">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate dark:text-slate-100">{op.tipo_comprobante} {op.serie}-{op.numero}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{op.medio_pago}</p>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs sm:justify-center">
                            <div className="text-center">
                              <p className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Cliente</p>
                              <p className="font-mono text-slate-700 font-semibold dark:text-slate-300">{op.num_operacion_pago || '-'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Empresa</p>
                              <p className="font-mono text-slate-700 font-semibold dark:text-slate-300">{nroEmpresa || '-'}</p>
                            </div>
                          </div>

                          <div className="flex sm:justify-end sm:w-32">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-bold border ${evaluacion.color}`}>
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
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl text-center border border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-600">No hay pagos virtuales registrados para esta fecha.</p>
                )}
              </div>

              <div className="bg-slate-50/80 p-3 border-t border-slate-100 flex justify-end dark:bg-slate-800 dark:border-slate-600">
                <button onClick={() => navigate(`/reportes?fecha=${c.fecha}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition shadow-sm cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-600 dark:shadow-none">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Ver Reporte
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-6 dark:bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Nueva Conciliación</h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Cierre diario de todos los turnos</p>
                </div>
                <button onClick={cerrarModal} className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer flex-shrink-0 ml-2"><X className="h-5 w-5" /></button>
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
                    setFormConciliacion({ ...formConciliacion, fecha: nuevaFecha });
                    calcularPreCalculo(nuevaFecha);
                  }}
                  placeholder="Seleccionar fecha a conciliar"
                />
              </div>

              {/* NUEVO: Aviso visual si la fecha ya está conciliada */}
              {yaConciliado && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 animate-fade-in dark:bg-amber-950/40 dark:border-amber-800/60">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Esta fecha ya fue conciliada</p>
                    <p className="text-xs text-amber-800 mt-0.5 dark:text-amber-400">Ya existe un registro para esta fecha. No puedes volver a conciliar el mismo día.</p>
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
                      const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa, op.medio_pago);

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
                  <option value="CONCILIADO">CONCILIADO (Diferencia 0.00)</option>
                  <option value="CON DIFERENCIA">CON DIFERENCIA (Revisar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 dark:text-slate-300">Observación (Opcional)</label>
                <textarea rows={2} value={formConciliacion.observacion} onChange={(e) => setFormConciliacion({ ...formConciliacion, observacion: e.target.value })} placeholder="Detalles adicionales..." className="w-full rounded-xl border border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange/20 outline-none resize-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" />
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 dark:border-slate-600">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Cancelar</button>
                <button type="submit" disabled={guardando || yaConciliado} className={`h-10 sm:h-11 flex-[2] rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${yaConciliado ? 'bg-slate-300 cursor-not-allowed dark:bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : yaConciliado ? 'Fecha ya Conciliada' : 'Guardar Conciliación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Conciliacion;