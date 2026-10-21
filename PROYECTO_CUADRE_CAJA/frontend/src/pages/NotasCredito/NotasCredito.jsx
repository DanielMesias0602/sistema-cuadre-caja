import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Calendar, FileText, RefreshCw, Search, X, Loader2, AlertCircle, CheckCircle, ArrowDownLeft } from 'lucide-react';

export function NotasCredito() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notas, setNotas] = useState([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(null);

  // Datos para el modal
  const [operacionesAnuladas, setOperacionesAnuladas] = useState([]);
  const [cargandoOperaciones, setCargandoOperaciones] = useState(false);
  const [formNota, setFormNota] = useState({
    id_comprobante_original: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    monto: '',
    motivo: '',
    observacion: ''
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
      const res = await api.get('/notas-credito');
      const data = res.data?.data || res.data;
      setNotas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar notas de crédito:', err);
      setError('No se pudieron cargar las notas de crédito.');
      setNotas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarOperacionesAnuladas = async () => {
    try {
      setCargandoOperaciones(true);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      const ops = Array.isArray(data) ? data : [];

      // Solo operaciones ANULADAS
      const anuladas = ops.filter(op => String(op.estado || '').toUpperCase() === 'ANULADA');
      setOperacionesAnuladas(anuladas);
    } catch (err) {
      console.error('Error al cargar operaciones anuladas:', err);
      setOperacionesAnuladas([]);
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
    setFormNota({
      id_comprobante_original: '',
      fecha: new Date().toLocaleDateString('en-CA'),
      monto: '',
      motivo: '',
      observacion: ''
    });
    await cargarOperacionesAnuladas();
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const handleSeleccionarComprobante = (e) => {
    const idComp = e.target.value;
    const opSeleccionada = operacionesAnuladas.find(op => String(op.id_comprobante) === String(idComp));

    setFormNota(prev => ({
      ...prev,
      id_comprobante_original: idComp,
      monto: opSeleccionada ? opSeleccionada.monto : ''
    }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    setErrorModal(null);
    setExitoModal(null);

    if (!formNota.id_comprobante_original) {
      setErrorModal('Debes seleccionar un comprobante anulado.');
      return;
    }
    if (!formNota.motivo.trim()) {
      setErrorModal('El motivo de la nota de crédito es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_comprobante_original: Number(formNota.id_comprobante_original),
        fecha: formNota.fecha,
        monto: Number(formNota.monto),
        motivo: formNota.motivo.trim(),
        observacion: formNota.observacion.trim() || null
      };

      const res = await api.post('/notas-credito', payload);

      // Verificar si el backend generó una salida automática
      const generoSalida = res.data?.data?.salida_caja !== null;
      setExitoModal(generoSalida
        ? 'Nota de crédito registrada. Se generó automáticamente una salida de caja por la diferencia.'
        : 'Nota de crédito registrada exitosamente como saldo a favor.');

      await cargarDatos();

      setTimeout(() => {
        setModalAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 1500);
    } catch (err) {
      const msj = err.response?.data?.message || err.message || 'Error al registrar la nota de crédito';
      setErrorModal(msj);
      setGuardando(false);
    }
  };

  const notasFiltradas = notas.filter(n => {
    const comp = `${n.tipo_comprobante || ''} ${n.serie || ''}-${n.numero || ''}`.toLowerCase();
    if (busqueda && !comp.includes(busqueda.toLowerCase())) return false;
    if (fechaFiltro && n.fecha !== fechaFiltro) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Notas de Crédito
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Emite notas de crédito para devoluciones y correcciones de montos.
          </p>
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
            <span>Registrar Nota</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por comprobante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 focus:ring-1 focus:ring-brand-orange outline-none"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando notas de crédito...</p>
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
                  <th className="p-4">Comprobante Afectado</th>
                  <th className="p-4 text-right">Monto Original</th>
                  <th className="p-4 text-right">Monto Nota</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {notasFiltradas.length > 0 ? notasFiltradas.map((nota) => (
                  <tr key={nota.id_nota_credito} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{formatearFecha(nota.fecha)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-semibold text-slate-900">
                          {nota.tipo_comprobante} {nota.serie}-{nota.numero}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-slate-500 font-medium tabular-nums">
                      {formatCurrency(nota.monto_comprobante_original)}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600 tabular-nums">
                      {formatCurrency(nota.monto)}
                    </td>
                    <td className="p-4 text-slate-700">{nota.motivo}</td>
                    <td className="p-4 text-slate-600">{nota.usuario}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No hay notas de crédito registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Nota */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Registrar Nota de Crédito</h2>
                  <p className="text-blue-100 text-sm mt-1">Genera saldo a favor para el cliente</p>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comprobante Anulado <span className="text-rose-500">*</span></label>
                {cargandoOperaciones ? (
                  <div className="flex items-center gap-2 h-12 text-sm text-slate-500 px-4 bg-white rounded-xl border border-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-orange" /> Cargando comprobantes...
                  </div>
                ) : operacionesAnuladas.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No hay comprobantes anulados disponibles para emitir una nota.
                  </div>
                ) : (
                  <select
                    value={formNota.id_comprobante_original}
                    onChange={handleSeleccionarComprobante}
                    required
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">Selecciona un comprobante anulado...</option>
                    {operacionesAnuladas.map(op => (
                      <option key={op.id_operacion} value={op.id_comprobante}>
                        {op.tipo_comprobante} {op.serie}-{op.numero} | {op.cliente} | {formatCurrency(op.monto)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto de la Nota (S/) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formNota.monto}
                  onChange={(e) => setFormNota({ ...formNota, monto: e.target.value })}
                  required
                  placeholder="0.00"
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none tabular-nums"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Si el monto es menor al original, se generará una salida de caja automática por la diferencia.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Emisión <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={formNota.fecha}
                  onChange={(e) => setFormNota({ ...formNota, fecha: e.target.value })}
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formNota.motivo}
                  onChange={(e) => setFormNota({ ...formNota, motivo: e.target.value })}
                  required
                  placeholder="Ej. Devolución de producto, Corrección de monto..."
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observación (Opcional)</label>
                <textarea
                  rows={2}
                  value={formNota.observacion}
                  onChange={(e) => setFormNota({ ...formNota, observacion: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex gap-3">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || operacionesAnuladas.length === 0} className="h-11 flex-[2] rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Emitir Nota de Crédito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotasCredito;