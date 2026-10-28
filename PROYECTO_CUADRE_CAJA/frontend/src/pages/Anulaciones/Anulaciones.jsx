import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, RefreshCw, Search, FileX, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';

export function Anulaciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anulaciones, setAnulaciones] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  const hayFiltrosActivos = Boolean(busqueda || fechaFiltro);
  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaFiltro('');
  };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(null);

  const [operaciones, setOperaciones] = useState([]);
  const [cargandoOperaciones, setCargandoOperaciones] = useState(false);
  const [formAnulacion, setFormAnulacion] = useState({
    id_comprobante: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    motivo: '',
    observacion: ''
  });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  async function cargarDatos() {
    try {
      const res = await api.get('/anulaciones');
      const data = res.data?.data || res.data;
      setAnulaciones(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error al cargar anulaciones:', err);
      setError('No se pudieron cargar las anulaciones.');
      setAnulaciones([]);
    } finally {
      setLoading(false);
    }
  }

  const recargarDatos = () => {
    setLoading(true);
    setError(null);
    return cargarDatos();
  };

  const cargarOperaciones = async () => {
    try {
      setCargandoOperaciones(true);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      const ops = Array.isArray(data) ? data : [];

      const disponibles = ops.filter(op => {
        const estado = String(op.estado || op.estado_operacion || '').toUpperCase();
        return estado !== 'ANULADA';
      });

      setOperaciones(disponibles);
    } catch (err) {
      console.error('Error al cargar operaciones:', err);
      setOperaciones([]);
    } finally {
      setCargandoOperaciones(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(cargarDatos);
  }, []);

  const abrirModal = async () => {
    setModalAbierto(true);
    setErrorModal(null);
    setExitoModal(null);
    setFormAnulacion({
      id_comprobante: '',
      fecha: new Date().toLocaleDateString('en-CA'),
      motivo: '',
      observacion: ''
    });
    await cargarOperaciones();
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

    if (!formAnulacion.id_comprobante) {
      setErrorModal('Debes seleccionar un comprobante válido.');
      return;
    }
    if (!formAnulacion.motivo.trim()) {
      setErrorModal('El motivo de la anulación es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_comprobante: Number(formAnulacion.id_comprobante),
        fecha: formAnulacion.fecha,
        motivo: formAnulacion.motivo.trim(),
        observacion: formAnulacion.observacion.trim() || null
      };

      await api.post('/anulaciones', payload);
      setExitoModal('Anulación registrada exitosamente.');
      await recargarDatos();

      setTimeout(() => {
        setModalAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 1200);
    } catch (err) {
      const msj = err.response?.data?.message || err.message || 'Error al registrar la anulación';
      setErrorModal(msj);
      setGuardando(false);
    }
  };

  const anulacionesFiltradas = anulaciones.filter(a => {
    const comp = `${a.tipo_comprobante || ''} ${a.serie || ''}-${a.numero || ''}`.toLowerCase();
    if (busqueda && !comp.includes(busqueda.toLowerCase())) return false;
    if (fechaFiltro && a.fecha !== fechaFiltro) return false;
    return true;
  });

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Anulaciones</h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">Registra y gestiona las anulaciones de comprobantes y operaciones.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={recargarDatos}
            disabled={loading}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm dark:shadow-none transition hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-3 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-sm dark:shadow-none transition hover:bg-brand-orange-hover active:scale-95 cursor-pointer flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Registrar Anulación</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 sm:p-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por comprobante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-[42px] w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange/20 outline-none"
            />
          </div>
          <div className="w-full lg:w-64 flex-shrink-0">
            <SingleDatePicker
              value={fechaFiltro}
              onChange={(nuevaFecha) => setFechaFiltro(nuevaFecha)}
              placeholder="Filtrar por fecha"
            />
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
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando anulaciones...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-6 sm:p-8 text-center shadow-sm dark:shadow-none">
          <p className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button onClick={recargarDatos} className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer">Reintentar</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 shadow-sm dark:shadow-none overflow-hidden">
          {/* MOBILE: cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-600">
            {anulacionesFiltradas.length > 0 ? anulacionesFiltradas.map((a) => (
              <div key={a.id_anulacion} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{a.fecha}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{a.usuario}</p>
                </div>
                <div className="flex items-center gap-2">
                  <FileX className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {a.tipo_comprobante} {a.serie}-{a.numero}
                  </p>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 break-words">{a.motivo}</p>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No hay anulaciones registradas</div>
            )}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-sm">
                {anulacionesFiltradas.length > 0 ? anulacionesFiltradas.map((a) => (
                  <tr key={a.id_anulacion} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{a.fecha}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {a.tipo_comprobante} {a.serie}-{a.numero}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{a.motivo}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{a.usuario}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay anulaciones registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 backdrop-blur-sm p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl dark:shadow-none max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Registrar Anulación</h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Ingresa el motivo de la anulación</p>
                </div>
                <button onClick={cerrarModal} className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer flex-shrink-0 ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleGuardar} className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-800 space-y-3 sm:space-y-4 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
              {errorModal && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 sm:p-4 text-xs sm:text-sm text-rose-800 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0" /> {errorModal}
                </div>
              )}
              {exitoModal && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 sm:p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> {exitoModal}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Comprobante a Anular <span className="text-rose-500">*</span></label>
                {cargandoOperaciones ? (
                  <div className="flex items-center gap-2 h-10 sm:h-12 text-xs sm:text-sm text-slate-500 dark:text-slate-400 px-3 sm:px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-orange" /> Cargando comprobantes...
                  </div>
                ) : operaciones.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-[11px] sm:text-sm text-amber-800 dark:text-amber-400">
                    No hay comprobantes disponibles para anular.
                  </div>
                ) : (
                  <select
                    value={formAnulacion.id_comprobante}
                    onChange={(e) => setFormAnulacion({ ...formAnulacion, id_comprobante: e.target.value })}
                    required
                    className="w-full h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">Selecciona un comprobante...</option>
                    {operaciones.map(op => {
                      const idComp = op.id_comprobante || op.comprobante?.id_comprobante;
                      const tipo = op.tipo_comprobante || 'DOC';
                      const serieNum = `${op.serie || ''}-${op.numero || ''}`;
                      return (
                        <option key={op.id_operacion} value={idComp}>
                          {tipo} {serieNum} | {op.cliente || 'Sin cliente'} | {formatCurrency(op.monto)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fecha de Anulación <span className="text-rose-500">*</span></label>
                <SingleDatePicker
                  value={formAnulacion.fecha}
                  onChange={(nuevaFecha) => setFormAnulacion({ ...formAnulacion, fecha: nuevaFecha })}
                  placeholder="Seleccionar fecha de anulación"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Motivo de la Anulación <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formAnulacion.motivo}
                  onChange={(e) => setFormAnulacion({ ...formAnulacion, motivo: e.target.value })}
                  required
                  placeholder="Ej. Error de digitación..."
                  className="w-full h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Observación (Opcional)</label>
                <textarea
                  rows={2}
                  value={formAnulacion.observacion}
                  onChange={(e) => setFormAnulacion({ ...formAnulacion, observacion: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || operaciones.length === 0} className="h-10 sm:h-11 flex-[2] rounded-xl bg-rose-600 text-xs sm:text-sm font-bold text-white hover:bg-rose-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Registrar Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Anulaciones;