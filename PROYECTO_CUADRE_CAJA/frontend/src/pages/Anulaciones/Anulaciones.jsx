import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Calendar, RefreshCw, Search, FileX, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export function Anulaciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anulaciones, setAnulaciones] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

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

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/anulaciones');
      const data = res.data?.data || res.data;
      setAnulaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar anulaciones:', err);
      setError('No se pudieron cargar las anulaciones.');
      setAnulaciones([]);
    } finally {
      setLoading(false);
    }
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
    cargarDatos();
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
      await cargarDatos();

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
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Anulaciones</h1>
          <p className="mt-2 text-base text-slate-500">Registra y gestiona las anulaciones de comprobantes y operaciones.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-orange-hover active:scale-95 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Anulación</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por comprobante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 focus:ring-1 focus:ring-brand-orange outline-none"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 focus:ring-1 focus:ring-brand-orange outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando anulaciones...</p>
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
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {anulacionesFiltradas.length > 0 ? anulacionesFiltradas.map((a) => (
                  <tr key={a.id_anulacion} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{a.fecha}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileX className="h-4 w-4 text-rose-600" />
                        <span className="font-mono font-semibold text-slate-900">
                          {a.tipo_comprobante} {a.serie}-{a.numero}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{a.motivo}</td>
                    <td className="p-4 text-slate-600">{a.usuario}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No hay anulaciones registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Registrar Anulación</h2>
                  <p className="text-blue-100 text-sm mt-1">Ingresa el motivo de la anulación</p>
                </div>
                <button onClick={cerrarModal} className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comprobante a Anular <span className="text-rose-500">*</span></label>
                {cargandoOperaciones ? (
                  <div className="flex items-center gap-2 h-12 text-sm text-slate-500 px-4 bg-white rounded-xl border border-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-orange" /> Cargando comprobantes...
                  </div>
                ) : operaciones.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No hay comprobantes disponibles para anular.
                  </div>
                ) : (
                  <select
                    value={formAnulacion.id_comprobante}
                    onChange={(e) => setFormAnulacion({ ...formAnulacion, id_comprobante: e.target.value })}
                    required
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Anulación <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={formAnulacion.fecha}
                  onChange={(e) => setFormAnulacion({ ...formAnulacion, fecha: e.target.value })}
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de la Anulación <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formAnulacion.motivo}
                  onChange={(e) => setFormAnulacion({ ...formAnulacion, motivo: e.target.value })}
                  required
                  placeholder="Ej. Error de digitación, Devolución de producto..."
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observación (Opcional)</label>
                <textarea
                  rows={2}
                  value={formAnulacion.observacion}
                  onChange={(e) => setFormAnulacion({ ...formAnulacion, observacion: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex gap-3">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || operaciones.length === 0} className="h-11 flex-[2] rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
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