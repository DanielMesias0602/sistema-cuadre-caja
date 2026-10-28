import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, FileText, RefreshCw, Search, X, Loader2, AlertCircle, CheckCircle, SearchCheck, Pencil } from 'lucide-react';
import { SingleDatePicker } from '../../components/ui/SingleDatePicker';

export function NotasCredito() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notas, setNotas] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  const hayFiltrosActivos = Boolean(busqueda || fechaFiltro);
  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaFiltro('');
  };

  // Estados del Modal Crear
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(null);

  // Estados Búsqueda Comprobante
  const [textoBusquedaComp, setTextoBusquedaComp] = useState('');
  const [buscandoComp, setBuscandoComp] = useState(false);
  const [comprobanteEncontrado, setComprobanteEncontrado] = useState(null);
  const [errorBusqueda, setErrorBusqueda] = useState(null);

  const [formNota, setFormNota] = useState({
    id_comprobante_original: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    monto: '',
    motivo: '',
    observacion: ''
  });

  // Estados del Modal Editar
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [notaAEditar, setNotaAEditar] = useState(null);
  const [formEditar, setFormEditar] = useState({ motivo: '', observacion: '' });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return '-';
    const d = new Date(fechaRaw + (fechaRaw.includes('T') ? '' : 'T00:00:00'));
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
  };

  async function cargarDatos() {
    try {
      const res = await api.get('/notas-credito');
      const data = res.data?.data || res.data;
      setNotas(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error al cargar notas de crédito:', err);
      setError('No se pudieron cargar las notas de crédito.');
      setNotas([]);
    } finally {
      setLoading(false);
    }
  }

  const recargarDatos = () => {
    setLoading(true);
    setError(null);
    return cargarDatos();
  };

  useEffect(() => {
    void Promise.resolve().then(cargarDatos);
  }, []);

  const abrirModal = () => {
    setModalAbierto(true);
    setErrorModal(null);
    setExitoModal(null);
    setTextoBusquedaComp('');
    setComprobanteEncontrado(null);
    setErrorBusqueda(null);
    setFormNota({
      id_comprobante_original: '',
      fecha: new Date().toLocaleDateString('en-CA'),
      monto: '',
      motivo: '',
      observacion: ''
    });
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const handleBuscarComprobante = async () => {
    if (!textoBusquedaComp.trim()) {
      setErrorBusqueda('Por favor, ingresa un número de comprobante.');
      return;
    }

    setBuscandoComp(true);
    setErrorBusqueda(null);
    setComprobanteEncontrado(null);

    try {
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      const operaciones = Array.isArray(data) ? data : [];
      const term = textoBusquedaComp.trim().toLowerCase();

      const encontrada = operaciones.find(op => {
        const compStr = `${op.tipo_comprobante} ${op.serie}-${op.numero}`.toLowerCase();
        const compStrAlt = `${op.serie}-${op.numero}`.toLowerCase();
        return compStr.includes(term) || compStrAlt.includes(term);
      });

      if (encontrada) {
        setComprobanteEncontrado(encontrada);
        setFormNota(prev => ({
          ...prev,
          id_comprobante_original: encontrada.id_comprobante,
          monto: encontrada.monto
        }));
      } else {
        setErrorBusqueda('No se encontró ningún comprobante con ese número.');
      }
    } catch (err) {
      console.error('Error al buscar comprobante:', err);
      setErrorBusqueda('Error al buscar el comprobante.');
    } finally {
      setBuscandoComp(false);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    setErrorModal(null);
    setExitoModal(null);

    if (!formNota.id_comprobante_original) {
      setErrorModal('Debes buscar y seleccionar un comprobante.');
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

      const generoSalida = res.data?.data?.salida_caja !== null;
      setExitoModal(generoSalida
        ? 'Nota registrada. Se generó una salida de caja por el saldo a favor del cliente.'
        : 'Nota de crédito registrada exitosamente.');

      await recargarDatos();

      setTimeout(() => {
        setModalAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 2000);
    } catch (err) {
      const msj = err.response?.data?.message || err.message || 'Error al registrar la nota de crédito';
      setErrorModal(msj);
      setGuardando(false);
    }
  };

  // --- LÓGICA DE EDICIÓN ---
  const abrirEditar = (nota) => {
    setNotaAEditar(nota);
    setFormEditar({
      motivo: nota.motivo || '',
      observacion: nota.observacion || ''
    });
    setErrorModal(null);
    setExitoModal(null);
    setModalEditarAbierto(true);
  };

  const handleEditarGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    if (!formEditar.motivo.trim()) {
      setErrorModal('El motivo es obligatorio.');
      return;
    }

    setGuardando(true);
    setErrorModal(null);

    try {
      await api.put(`/notas-credito/${notaAEditar.id_nota_credito}`, {
        motivo: formEditar.motivo.trim(),
        observacion: formEditar.observacion.trim() || null
      });

      setExitoModal('Nota de crédito actualizada correctamente.');
      await recargarDatos();

      setTimeout(() => {
        setModalEditarAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 1500);

    } catch (err) {
      const msj = err.response?.data?.message || err.message || 'Error al actualizar la nota.';
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
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Notas de Crédito
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">
            Emite notas de crédito para devoluciones y correcciones de montos.
          </p>
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
            <span>Registrar Nota</span>
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
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando notas de crédito...</p>
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
            {notasFiltradas.length > 0 ? notasFiltradas.map((nota) => (
              <div key={nota.id_nota_credito} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{formatearFecha(nota.fecha)}</p>
                  <button onClick={() => abrirEditar(nota)} className="text-slate-400 dark:text-slate-500 hover:text-brand-orange p-1">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {nota.tipo_comprobante} {nota.serie}-{nota.numero}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Monto Original</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(nota.monto_comprobante_original)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-2">
                    <p className="text-[9px] text-blue-700 dark:text-blue-400 uppercase font-semibold">Monto Nota</p>
                    <p className="font-bold text-blue-700 dark:text-blue-400 tabular-nums">{formatCurrency(nota.monto)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 break-words">{nota.motivo}</p>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No hay notas de crédito registradas</div>
            )}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Comprobante Afectado</th>
                  <th className="p-4 text-right">Monto Original</th>
                  <th className="p-4 text-right">Monto Nota</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-600 text-sm">
                {notasFiltradas.length > 0 ? notasFiltradas.map((nota) => (
                  <tr key={nota.id_nota_credito} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{formatearFecha(nota.fecha)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {nota.tipo_comprobante} {nota.serie}-{nota.numero}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {formatCurrency(nota.monto_comprobante_original)}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(nota.monto)}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{nota.motivo}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{nota.usuario}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => abrirEditar(nota)}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-orange transition-colors cursor-pointer"
                        title="Editar motivo/observación"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay notas de crédito registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 backdrop-blur-sm p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl dark:shadow-none max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Registrar Nota de Crédito</h2>
                  <p className="text-blue-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Digita el comprobante afectado</p>
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
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Comprobante Afectado <span className="text-rose-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: BE03-00002773"
                    value={textoBusquedaComp}
                    onChange={(e) => setTextoBusquedaComp(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscarComprobante(); } }}
                    className="flex-1 h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarComprobante}
                    disabled={buscandoComp}
                    className="h-10 sm:h-12 px-4 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs sm:text-sm hover:bg-slate-900 dark:hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {buscandoComp ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                    Buscar
                  </button>
                </div>
                {errorBusqueda && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{errorBusqueda}</p>}
              </div>

              {comprobanteEncontrado && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/40 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">Comprobante Encontrado</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${String(comprobanteEncontrado.estado).toUpperCase() === 'ANULADA' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'}`}>
                      {comprobanteEncontrado.estado}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Cliente</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{comprobanteEncontrado.cliente}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Monto Original</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(comprobanteEncontrado.monto)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className={`transition-opacity ${!comprobanteEncontrado ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Monto de la Nota (S/) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formNota.monto}
                      onChange={(e) => setFormNota({ ...formNota, monto: e.target.value })}
                      required
                      placeholder="0.00"
                      className="w-full h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none tabular-nums"
                    />
                    <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Ingresa el valor exacto del producto no entregado o del ajuste. No necesariamente el total del comprobante.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fecha de Emisión <span className="text-rose-500">*</span></label>
                    <SingleDatePicker
                      value={formNota.fecha}
                      onChange={(nuevaFecha) => setFormNota({ ...formNota, fecha: nuevaFecha })}
                      placeholder="Seleccionar fecha"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Motivo <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formNota.motivo}
                      onChange={(e) => setFormNota({ ...formNota, motivo: e.target.value })}
                      required
                      placeholder="Ej. Producto no entregado..."
                      className="w-full h-10 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Observación (Opcional)</label>
                    <textarea
                      rows={2}
                      value={formNota.observacion}
                      onChange={(e) => setFormNota({ ...formNota, observacion: e.target.value })}
                      placeholder="Detalles adicionales..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button type="button" onClick={cerrarModal} disabled={guardando} className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !comprobanteEncontrado}
                  className="h-10 sm:h-11 flex-[2] rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Emitir Nota de Crédito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {modalEditarAbierto && notaAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/70 backdrop-blur-sm p-3 sm:p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl dark:shadow-none flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Editar Nota de Crédito</h2>
                  <p className="text-amber-100 text-[11px] sm:text-sm mt-0.5 sm:mt-1">Corrige el motivo u observación</p>
                </div>
                <button onClick={() => setModalEditarAbierto(false)} className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer flex-shrink-0 ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditarGuardar} className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800 space-y-4">
              {errorModal && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs sm:text-sm text-rose-800 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0" /> {errorModal}
                </div>
              )}
              {exitoModal && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> {exitoModal}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 mb-2 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Comprobante</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{notaAEditar.tipo_comprobante} {notaAEditar.serie}-{notaAEditar.numero}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Monto</p>
                  <p className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(notaAEditar.monto)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Motivo <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formEditar.motivo}
                  onChange={(e) => setFormEditar({ ...formEditar, motivo: e.target.value })}
                  required
                  className="w-full h-10 sm:h-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Observación</label>
                <textarea
                  rows={3}
                  value={formEditar.observacion}
                  onChange={(e) => setFormEditar({ ...formEditar, observacion: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setModalEditarAbierto(false)} disabled={guardando} className="h-10 sm:h-11 flex-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="h-10 sm:h-11 flex-[2] rounded-xl bg-amber-500 text-xs sm:text-sm font-bold text-white hover:bg-amber-600 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
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