import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import {
  Plus, Calendar, CheckCircle, AlertCircle, RefreshCw, Search,
  X, Loader2, Sun, Moon, BarChart2
} from 'lucide-react';

export function Conciliacion() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Validamos si es Administrador (id_rol = 1)
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
    cierres: [], diferencia_total: 0, total_ingresos: 0, total_efectivo_esperado: 0, total_salidas: 0
  });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return '-';
    const d = new Date(fechaRaw + (fechaRaw.includes('T') ? '' : 'T00:00:00'));
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
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
      setPreCalculo({ cierres: [], diferencia_total: 0, total_ingresos: 0, total_efectivo_esperado: 0, total_salidas: 0 });
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
    if (guardando) return; // <-- PROTECCIÓN CONTRA DOBLE CLIC

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

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Conciliación Diaria</h1>
          <p className="mt-2 text-base text-slate-500">Realiza la conciliación diaria uniendo los turnos de la fecha seleccionada.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={cargarDatos} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* ✅ BOTÓN DUPLICADO ELIMINADO */}

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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Diferencia Detectada</th>
                  <th className="p-4">Resultado</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {conciliacionesFiltradas.length > 0 ? conciliacionesFiltradas.map((c) => (
                  <tr key={c.id_conciliacion} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{formatearFecha(c.fecha)}</td>
                    <td className="p-4 text-right font-bold tabular-nums">
                      <span className={Number(c.diferencia) === 0 ? 'text-slate-900' : Number(c.diferencia) < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {formatCurrency(c.diferencia)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${c.resultado === 'CONCILIADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {c.resultado === 'CONCILIADO' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {c.resultado}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{c.usuario || 'No asignado'}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => navigate(`/reportes?fecha=${c.fecha}`)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer">
                        <BarChart2 className="h-3.5 w-3.5" />
                        Ver Reporte
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No hay conciliaciones registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva Conciliación */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
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