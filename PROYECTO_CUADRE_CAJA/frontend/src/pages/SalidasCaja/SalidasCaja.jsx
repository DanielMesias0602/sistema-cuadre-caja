import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../lib/api';
import {
  Plus,
  Calendar,
  ArrowDownRight,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Eye,
  Loader2,
  Sun,
  Moon,
  Info,
  ChevronDown
} from 'lucide-react';

const DEFAULT_COMPROBANTE_TEXT = 'Sin comprobante asociado';

// Componente Combobox para buscar comprobantes
function ComprobanteCombobox({ comprobantes, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_COMPROBANTE_TEXT);
  const wrapperRef = useRef(null);

  // Manejar clic fuera para cerrar
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Si no se ha seleccionado nada, restaurar el texto por defecto
        if (!value) {
          setSearchTerm(DEFAULT_COMPROBANTE_TEXT);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value]);

  // Sincronizar el texto mostrado cuando cambia el valor externo
  useEffect(() => {
    if (value) {
      const found = comprobantes.find(c => c.id_comprobante === value);
      if (found) {
        setSearchTerm(`${found.tipo_comprobante} ${found.serie}-${found.numero}`);
      }
    } else {
      setSearchTerm(DEFAULT_COMPROBANTE_TEXT);
    }
  }, [value, comprobantes]);

  const filtered = useMemo(() => {
    // Si el texto es el por defecto, mostrar todos
    if (!searchTerm || searchTerm === DEFAULT_COMPROBANTE_TEXT) {
      return comprobantes;
    }
    const term = searchTerm.toLowerCase();
    return comprobantes.filter(c => 
      `${c.tipo_comprobante} ${c.serie}-${c.numero}`.toLowerCase().includes(term) ||
      (c.cliente || '').toLowerCase().includes(term) ||
      String(c.monto).includes(term)
    );
  }, [searchTerm, comprobantes]);

  const handleSelect = (c) => {
    onChange(c ? c.id_comprobante : '');
    if (c) {
      setSearchTerm(`${c.tipo_comprobante} ${c.serie}-${c.numero}`);
    } else {
      setSearchTerm(DEFAULT_COMPROBANTE_TEXT);
    }
    setIsOpen(false);
  };

  const handleFocus = (e) => {
    // Si el texto es el por defecto, seleccionarlo todo para que el usuario escriba directo
    if (searchTerm === DEFAULT_COMPROBANTE_TEXT) {
      e.target.select();
    }
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          placeholder="Buscar por N°, cliente o monto..."
          className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-4 pr-10 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        {value ? (
          <button 
            type="button" 
            onClick={() => handleSelect(null)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 border-b border-slate-100"
          >
            Ninguno (Sin comprobante asociado)
          </button>
          
          {filtered.length > 0 ? (
            filtered.map(c => (
              <button
                key={c.id_comprobante}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 flex flex-col gap-0.5 last:border-0"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-slate-900">{c.tipo_comprobante} {c.serie}-{c.numero}</span>
                  <span className="font-black text-brand-orange">S/ {Number(c.monto).toFixed(2)}</span>
                </div>
                <span className="text-xs text-slate-500 truncate">{c.cliente || 'Sin cliente'}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No se encontraron resultados para "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SalidasCaja() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salidas, setSalidas] = useState([]);

  // Estados de Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(null);

  // Datos para los selects del Modal
  const [cierresDisponibles, setCierresDisponibles] = useState([]);
  const [cargandoCierres, setCargandoCierres] = useState(false);
  const [tiposSalida, setTiposSalida] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);

  // Estado del Formulario
  const [formSalida, setFormSalida] = useState({
    id_cierre: '',
    id_tipo_salida: '',
    id_comprobante: '',
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
    if (typeof fechaRaw === 'string' && fechaRaw.includes('T')) {
      const d = new Date(fechaRaw);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
    }
    const d = new Date(fechaRaw + 'T00:00:00');
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/salidas-caja');
      const data = res.data?.data || res.data;
      setSalidas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar salidas de caja:', err);
      setError('No hay datos disponibles');
      setSalidas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarCatalogos = async () => {
    try {
      // 1. Tipos de salida
      const resTipos = await api.get('/tipos-salida');
      const dataTipos = resTipos.data?.data || resTipos.data;
      const tipos = (Array.isArray(dataTipos) && dataTipos.length > 0) 
        ? dataTipos 
        : [
            { id_tipo_salida: 1, nombre: 'Gasto de caja' },
            { id_tipo_salida: 2, nombre: 'Agua / Servicios' },
            { id_tipo_salida: 3, nombre: 'Planilla' },
            { id_tipo_salida: 4, nombre: 'Otros gastos' }
          ];
      
      setTiposSalida(tipos);

      // 2. Comprobantes (Operaciones) para asociar opcionalmente
      const resOps = await api.get('/operaciones');
      const dataOps = resOps.data?.data || resOps.data;
      if (Array.isArray(dataOps)) {
        setComprobantes(dataOps.filter(op => op.estado !== 'ANULADA'));
      }
    } catch {
      // Fallbacks
      setTiposSalida([
        { id_tipo_salida: 1, nombre: 'Gasto de caja' },
        { id_tipo_salida: 2, nombre: 'Agua / Servicios' },
        { id_tipo_salida: 3, nombre: 'Planilla' },
        { id_tipo_salida: 4, nombre: 'Otros gastos' }
      ]);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarCatalogos();
  }, []);

  const abrirModalRegistro = async () => {
    setModalAbierto(true);
    setErrorModal(null);
    setExitoModal(null);
    
    const tipoGasto = tiposSalida.find(t => t.nombre.toLowerCase().includes('gasto')) || tiposSalida[0];

    setFormSalida({
      id_cierre: '',
      id_tipo_salida: tipoGasto ? tipoGasto.id_tipo_salida : 1,
      id_comprobante: '',
      monto: '',
      motivo: '',
      observacion: ''
    });

    try {
      setCargandoCierres(true);
      const res = await api.get('/cierres-caja');
      const data = res.data?.data || res.data;
      const todosCierres = Array.isArray(data) ? data : [];
      
      const abiertos = todosCierres.filter(
        (c) => String(c.estado || '').toUpperCase() !== 'CERRADO'
      );
      setCierresDisponibles(abiertos);

      if (abiertos.length > 0) {
        setFormSalida((prev) => ({
          ...prev,
          id_cierre: String(abiertos[0].id_cierre)
        }));
      }
    } catch (err) {
      console.error('Error al cargar cierres:', err);
      setCierresDisponibles([]);
    } finally {
      setCargandoCierres(false);
    }
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setErrorModal(null);
    setExitoModal(null);
  };

  const handleGuardarSalida = async (e) => {
    e.preventDefault();
    setErrorModal(null);
    setExitoModal(null);

    if (!formSalida.id_cierre) {
      setErrorModal('Debes seleccionar un cierre de caja válido.');
      return;
    }

    const montoNum = Number(formSalida.monto);
    if (!montoNum || montoNum <= 0) {
      setErrorModal('El monto debe ser un número positivo mayor a 0.');
      return;
    }

    if (!formSalida.motivo.trim()) {
      setErrorModal('El motivo de la salida es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_cierre: Number(formSalida.id_cierre),
        id_tipo_salida: Number(formSalida.id_tipo_salida),
        id_comprobante: formSalida.id_comprobante ? Number(formSalida.id_comprobante) : null,
        fecha: new Date().toLocaleDateString('en-CA'),
        monto: montoNum,
        motivo: formSalida.motivo.trim(),
        observacion: formSalida.observacion.trim() || null,
        storage_key: null
      };

      await api.post('/salidas-caja', payload);
      setExitoModal('Salida de caja registrada exitosamente.');
      await cargarDatos();

      setTimeout(() => {
        setModalAbierto(false);
        setGuardando(false);
        setExitoModal(null);
      }, 1000);
    } catch (err) {
      console.error('Error al registrar salida de caja:', err);
      const msj = err.response?.data?.message || err.message || 'Error al registrar la salida de caja';
      setErrorModal(msj);
      setGuardando(false);
    }
  };

  // Filtrado de la tabla
  const salidasFiltradas = useMemo(() => {
    return salidas.filter((s) => {
      if (busqueda) {
        const motivo = (s.motivo || '').toLowerCase();
        const tipo = (s.tipo || s.tipo_salida || '').toLowerCase();
        const q = busqueda.toLowerCase();
        if (!motivo.includes(q) && !tipo.includes(q)) return false;
      }
      if (fechaFiltro) {
        const fechaS = s.fecha ? s.fecha.substring(0, 10) : '';
        if (fechaS !== fechaFiltro) return false;
      }
      if (tipoFiltro) {
        const tipo = (s.tipo || s.tipo_salida || '').toLowerCase();
        if (tipo !== tipoFiltro.toLowerCase()) return false;
      }
      return true;
    });
  }, [salidas, busqueda, fechaFiltro, tipoFiltro]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaFiltro('');
    setTipoFiltro('');
  };

  const getStorageUrl = (key) => {
    if (!key) return null;
    return key.startsWith('http')
      ? key
      : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${key}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Salidas de Caja
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Control de egresos y gastos operativos durante el turno de caja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={abrirModalRegistro}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white shadow-sm shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Salida</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por motivo o tipo de salida..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="h-12 flex-1 sm:w-56 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer"
            >
              <option value="">Todos los tipos</option>
              {tiposSalida.map((t) => (
                <option key={t.id_tipo_salida} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>

            {(busqueda || fechaFiltro || tipoFiltro) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-12 w-12 flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                title="Limpiar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla y estados */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando salidas de caja...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={cargarDatos}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Tipo de Salida</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4">Cierre Asociado</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4 text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {salidasFiltradas.length > 0 ? (
                  salidasFiltradas.map((salida) => {
                    const esManana = (salida.turno || '').toLowerCase() === 'mañana';
                    const docUrl = getStorageUrl(salida.storage_key);

                    return (
                      <tr key={salida.id_salida} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 tabular-nums">
                          {formatearFecha(salida.fecha)}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{salida.motivo}</p>
                          {salida.observacion && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {salida.observacion}
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-100">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            {salida.tipo || salida.tipo_salida || 'Gasto'}
                          </span>
                        </td>

                        <td className="p-4 text-right font-black text-rose-600 tabular-nums">
                          {formatCurrency(salida.monto)}
                        </td>

                        <td className="p-4">
                          {salida.turno ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                esManana
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                              }`}
                            >
                              {esManana ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                              Turno {salida.turno}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              #{salida.id_cierre || 'N/A'}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-slate-600 font-medium">
                          {salida.usuario || 'Usuario'}
                        </td>

                        <td className="p-4 text-center">
                          {docUrl ? (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition active:scale-95"
                              title="Ver comprobante adjunto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No hay salidas de caja registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Salida */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Registrar Salida de Caja</h2>
                  <p className="text-blue-100 text-sm mt-1">Registra egresos con cargo al turno</p>
                </div>
                <button type="button" onClick={cerrarModal} disabled={guardando} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleGuardarSalida} className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              {errorModal && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">No se pudo registrar la salida</p>
                    <p className="mt-0.5 text-xs text-rose-700">{errorModal}</p>
                  </div>
                </div>
              )}

              {exitoModal && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="font-bold">{exitoModal}</p>
                </div>
              )}

              {/* Selector de Cierre */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Cierre de Caja <span className="text-rose-500">*</span>
                </label>
                {cargandoCierres ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                    Cargando turnos disponibles...
                  </div>
                ) : cierresDisponibles.length > 0 ? (
                  <select
                    value={formSalida.id_cierre}
                    onChange={(e) => setFormSalida({ ...formSalida, id_cierre: e.target.value })}
                    required
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                  >
                    {cierresDisponibles.map((c) => (
                      <option key={c.id_cierre} value={c.id_cierre}>
                        Cierre #{c.id_cierre} - Turno {c.turno} ({formatearFecha(c.fecha)}) - Disp: {formatCurrency(c.efectivo_esperado - (c.total_salidas || 0))}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800 flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      No hay turnos abiertos. Dirígete a <strong>Cierres de Caja</strong> y crea un "Nuevo Cierre" para iniciar el turno antes de registrar salidas.
                    </span>
                  </div>
                )}
              </div>

              {/* Selector de Comprobante (Combobox Mejorado) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  Comprobante Asociado (Opcional)
                </label>
                <ComprobanteCombobox 
                  comprobantes={comprobantes}
                  value={formSalida.id_comprobante}
                  onChange={(id) => setFormSalida({ ...formSalida, id_comprobante: id })}
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Monto (S/) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formSalida.monto}
                  onChange={(e) => setFormSalida({ ...formSalida, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all tabular-nums"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Motivo de la Salida <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSalida.motivo}
                  onChange={(e) => setFormSalida({ ...formSalida, motivo: e.target.value })}
                  placeholder="Ej: Compra de agua de mesa, útiles de limpieza..."
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Observación */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Observación (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formSalida.observacion}
                  onChange={(e) => setFormSalida({ ...formSalida, observacion: e.target.value })}
                  placeholder="Información adicional o justificación..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Botones del Modal */}
              <div className="pt-2 border-t border-slate-200 flex gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || cierresDisponibles.length === 0}
                  className="h-11 flex-1 rounded-xl bg-brand-orange text-sm font-bold text-white shadow-md shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Salida'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalidasCaja;