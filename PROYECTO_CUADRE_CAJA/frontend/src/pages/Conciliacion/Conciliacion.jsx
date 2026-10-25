import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import {
  Plus, Calendar, CheckCircle, AlertCircle, RefreshCw, Search,
  X, Loader2, Sun, Moon, BarChart2, AlertTriangle, FileText, Eye, Info
} from 'lucide-react';

// Función auxiliar para evaluar el estado del número de operación
const evaluarOperacion = (opPago, opEmpresa, medioPago) => {
  if (!opPago && !opEmpresa) return { estado: 'SIN DATOS', color: 'bg-slate-100 text-slate-500 border-slate-200', icono: 'info' };
  if (!opPago || !opEmpresa) return { estado: 'INCOMPLETO', color: 'bg-slate-100 text-slate-500 border-slate-200', icono: 'info' };

  const medio = String(medioPago || '').toLowerCase();

  if (medio.includes('bcp')) {
    const cleanPago = String(opPago).replace(/\D/g, '').replace(/^0+/, '');
    const cleanEmpresa = String(opEmpresa).replace(/\D/g, '').replace(/^0+/, '');
    
    if (cleanPago === cleanEmpresa) {
      return { estado: 'COINCIDE (BCP)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icono: 'check' };
    }
    return { estado: 'DIFERENTE (BCP)', color: 'bg-amber-50 text-amber-700 border-amber-200', icono: 'alert' };
  }

  return { estado: 'REVISIÓN MANUAL', color: 'bg-slate-50 text-slate-700 border-slate-200', icono: 'eye' };
};

export function Conciliacion() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
    total_efectivo_esperado: 0,
    total_salidas: 0,
    operaciones_pendientes_evidencia: 0,
    operaciones_con_numeros: []
  });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return '-';
    const d = new Date(fechaRaw + (fechaRaw.includes('T') ? '' : 'T00:00:00'));
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : fechaRaw;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/conciliaciones');
      const data = res.data?.data || res.data;
      setConciliaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('No hay datos disponibles');
      setConciliaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const calcularPreCalculo = async (fecha) => {
    try {
      const res = await api.get(`/conciliaciones/pre-calculo?fecha=${fecha}`);
      const data = res.data.data;
      setPreCalculo(data);
      setFormConciliacion(prev => ({ ...prev, diferencia_detectada: data.diferencia_total }));
    } catch (err) {
      setPreCalculo({
        cierres: [],
        diferencia_total: 0,
        total_ingresos: 0,
        total_efectivo_esperado: 0,
        total_salidas: 0,
        operaciones_pendientes_evidencia: 0,
        operaciones_con_numeros: []
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

      await api.post('/conciliaciones', payload);
      setExitoModal('Conciliación registrada exitosamente.');
      await cargarDatos();

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
    <div className="max-w-7xl mx-auto w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Conciliación Diaria</h1>
          <p className="mt-2 text-base text-slate-500">Revisión y validación de operaciones agrupadas por día.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={cargarDatos} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {esAdmin && (
            <button type="button" onClick={abrirModal} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-orange-hover active:scale-95 cursor-pointer">
              <Plus className="h-5 w-5" />
              <span>Nueva Conciliación</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por responsable..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 focus:ring-1 focus:ring-brand-orange outline-none" />
          </div>
          <div className="relative w-full sm:w-64">
            <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 focus:ring-1 focus:ring-brand-orange outline-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando conciliaciones...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button onClick={cargarDatos} className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold cursor-pointer">Reintentar</button>
        </div>
      ) : conciliacionesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No hay conciliaciones registradas</h3>
          <p className="text-slate-500 mt-1">Las conciliaciones que registres aparecerán aquí.</p>
        </div>
      ) : (
        /* CONTENEDOR DE TARJETAS: Ahora es flex-col con items-start para que no se estiren al 100% */
        <div className="flex flex-col gap-5 items-start">
          {conciliacionesFiltradas.map((c) => (
            <div key={c.id_conciliacion} className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
              
              <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 capitalize">
                    {formatearFecha(c.fecha)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Conciliado por: <span className="font-semibold text-slate-700">{c.usuario || 'No asignado'}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Diferencia</p>
                    <p className={`text-base font-black tabular-nums ${Number(c.diferencia) === 0 ? 'text-slate-900' : Number(c.diferencia) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(c.diferencia)}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${c.resultado === 'CONCILIADO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                    {c.resultado === 'CONCILIADO' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {c.resultado}
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Operaciones y Nros. de Validación
                  </p>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {c.operaciones_con_numeros?.length || 0} operación(es)
                  </span>
                </div>

                {c.operaciones_con_numeros && c.operaciones_con_numeros.length > 0 ? (
                  /* LISTA COMPACTA: Cada operación es una fila fina */
                  <div className="flex flex-col divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
                    {c.operaciones_con_numeros.map((op, idx) => {
                      const nroEmpresa = op.num_operacion_empresa || op.num_op_empresa_alt;
                      const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa, op.medio_pago);
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-white transition-colors gap-2">
                          {/* 1. Comprobante */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{op.tipo_comprobante} {op.serie}-{op.numero}</p>
                            <p className="text-xs text-slate-500">{op.medio_pago}</p>
                          </div>
                          
                          {/* 2. Números */}
                          <div className="flex items-center gap-4 text-xs sm:justify-center">
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-slate-400">Cliente</p>
                              <p className="font-mono text-slate-700 font-semibold">{op.num_operacion_pago || '-'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-slate-400">Empresa</p>
                              <p className="font-mono text-slate-700 font-semibold">{nroEmpresa || '-'}</p>
                            </div>
                          </div>

                          {/* 3. Badge */}
                          <div className="flex sm:justify-end sm:w-32">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${evaluacion.color}`}>
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
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl text-center border border-slate-100">No hay pagos virtuales registrados para esta fecha.</p>
                )}
              </div>

              <div className="bg-slate-50/80 p-3 border-t border-slate-100 flex justify-end">
                <button onClick={() => navigate(`/reportes?fecha=${c.fecha}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition shadow-sm cursor-pointer">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Ver Reporte
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Nueva Conciliación</h2>
                  <p className="text-blue-100 text-sm mt-1">Cierre diario de todos los turnos</p>
                </div>
                <button onClick={cerrarModal} className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <form onSubmit={handleGuardar} className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              {errorModal && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" /> {errorModal}
                </div>
              )}
              {exitoModal && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> {exitoModal}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha a Conciliar <span className="text-rose-500">*</span></label>
                <input type="date" value={formConciliacion.fecha} onChange={(e) => { const newDate = e.target.value; setFormConciliacion({ ...formConciliacion, fecha: newDate }); calcularPreCalculo(newDate); }} className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Resumen del Día</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Ingresos Totales</p>
                    <p className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(preCalculo.total_ingresos)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Efectivo Esperado</p>
                    <p className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(preCalculo.total_efectivo_esperado)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {preCalculo.cierres.length > 0 ? (
                    preCalculo.cierres.map(c => (
                      <div key={c.id_cierre} className="flex items-center justify-between text-xs py-1.5 border-t border-slate-50">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          {c.turno === 'Mañana' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                          Turno {c.turno}
                        </span>
                        <span className={`font-bold tabular-nums ${Number(c.diferencia) === 0 ? 'text-slate-700' : Number(c.diferencia) < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                          {formatCurrency(c.diferencia)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2">No hay cierres registrados en esta fecha.</p>
                  )}
                </div>

                <div className="border-t border-slate-200 mt-2 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Diferencia Total</span>
                  <span className={`text-xl font-black tabular-nums ${preCalculo.diferencia_total === 0 ? 'text-emerald-600' : preCalculo.diferencia_total < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                    {formatCurrency(preCalculo.diferencia_total)}
                  </span>
                </div>
              </div>

              {preCalculo.operaciones_con_numeros && preCalculo.operaciones_con_numeros.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Validación de Nros. de Operación
                    </p>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {preCalculo.operaciones_con_numeros.length} operación(es)
                    </span>
                  </div>
                  
                  <div className="overflow-y-auto max-h-64 pr-1 space-y-2">
                    {preCalculo.operaciones_con_numeros.map((op, idx) => {
                      const nroEmpresa = op.num_operacion_empresa || op.num_op_empresa_alt;
                      const evaluacion = evaluarOperacion(op.num_operacion_pago, nroEmpresa, op.medio_pago);
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {op.tipo_comprobante} {op.serie}-{op.numero}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {op.medio_pago}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">Cliente</span>
                              <span className="font-mono text-slate-700">{op.num_operacion_pago || '-'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">Empresa</span>
                              <span className="font-mono text-slate-700">{nroEmpresa || '-'}</span>
                            </div>
                          </div>
                          <div className="sm:ml-4 shrink-0 mt-2 sm:mt-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${evaluacion.color}`}>
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>{pendientesEvidencia} {pendientesEvidencia === 1 ? 'operación tiene' : 'operaciones tienen'}</strong>{' '}
                    pago no efectivo sin evidencia de empresa registrada.
                    La conciliación puede continuar; la evidencia puede subirse después desde el historial de operaciones.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resultado <span className="text-rose-500">*</span></label>
                <select value={formConciliacion.resultado} onChange={(e) => setFormConciliacion({ ...formConciliacion, resultado: e.target.value })} className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                  <option value="CONCILIADO">CONCILIADO (Diferencia 0.00)</option>
                  <option value="CON DIFERENCIA">CON DIFERENCIA (Revisar)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observación (Opcional)</label>
                <textarea rows={2} value={formConciliacion.observacion} onChange={(e) => setFormConciliacion({ ...formConciliacion, observacion: e.target.value })} placeholder="Detalles adicionales..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              <div className="pt-2 border-t border-slate-200 flex gap-3">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={guardando} className="h-11 flex-[2] rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Conciliación'}
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