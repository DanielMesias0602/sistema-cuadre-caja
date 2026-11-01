import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Search, ChevronDown, Loader2, ImageOff, X, CheckCircle, Clock, CreditCard, Banknote, Wallet, ZoomIn, ZoomOut, User, Calendar, ShieldCheck } from 'lucide-react';
import { EvidenceCard } from './EvidenceCard';

export function Evidencias() {
  const { user } = useAuth();
  const socket = useSocket();
  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';

  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState(''); // NUEVO: Filtro de estado
  const [selectedOp, setSelectedOp] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [estadosLocales, setEstadosLocales] = useState({});
  const [imagenPrincipalIndex, setImagenPrincipalIndex] = useState(0);

  const cargarOperaciones = useCallback(async () => {
    try {
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOperaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(cargarOperaciones);
  }, [cargarOperaciones]);

  useEffect(() => {
    if (!socket) return undefined;
    const actualizarEvidencias = () => {
      void cargarOperaciones();
    };
    const eventos = ['operacion_creada', 'pago_actualizado', 'ajuste_creado'];
    eventos.forEach((evento) => socket.on(evento, actualizarEvidencias));

    return () => {
      eventos.forEach((evento) => socket.off(evento, actualizarEvidencias));
    };
  }, [socket, cargarOperaciones]);

  const filtered = useMemo(() => {
    return operaciones.filter(op => {
      if (!op.evidencias || op.evidencias.length === 0) return false;

      const q = query.toLowerCase();
      const matchQuery = !q ||
        (op.cliente || '').toLowerCase().includes(q) ||
        `${op.serie}-${op.numero}`.toLowerCase().includes(q);

      const matchType = !docType || (op.tipo_comprobante || '').toUpperCase() === docType;

      // NUEVO: Filtro por Estado de Conciliación
      let matchEstado = true;
      if (estadoFiltro) {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const todosVerificados = pagos.length > 0 && pagos.every(p => {
          const est = String(p.estado || '').toUpperCase();
          return est === 'VERIFICADO' || est === 'VERIFICADA' || est === 'COMPLETADO';
        });
        
        if (estadoFiltro === 'CONCILIADO') matchEstado = todosVerificados;
        if (estadoFiltro === 'PENDIENTE') matchEstado = !todosVerificados;
      }

      return matchQuery && matchType && matchEstado;
    });
  }, [operaciones, query, docType, estadoFiltro]);

  const abrirModal = (op) => {
    setSelectedOp(op);
    setImagenPrincipalIndex(0);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setSelectedOp(null);
    setIsImageOpen(false);
    setSelectedImageUrl(null);
    setZoom(false);
  };

  const abrirEvidencia = (url) => {
    if (!url) return;
    setSelectedImageUrl(url);
    setIsImageOpen(true);
    setZoom(false);
  };

  const getEvidenciasDeOperacion = (operacion) => {
    const evidenciasArray = Array.isArray(operacion.evidencias) ? operacion.evidencias : [];
    const verificaciones = Array.isArray(operacion.verificaciones) ? operacion.verificaciones : [];

    // Crear un Set con los IDs de evidencias activas
    const idsActivos = new Set();
    verificaciones.forEach(v => {
      if (v.id_evidencia_cliente) idsActivos.add(String(v.id_evidencia_cliente));
      if (v.id_evidencia_empresa) idsActivos.add(String(v.id_evidencia_empresa));
    });

    // Filtrar las evidencias (si no hay verificaciones, mostrar todas por compatibilidad)
    const evidenciasFiltradas = idsActivos.size > 0 
      ? evidenciasArray.filter(e => idsActivos.has(String(e.id_evidencia)))
      : evidenciasArray;

    return evidenciasFiltradas.map((evidencia) => {
      const tipo = String(evidencia.tipo_evidencia || 'EVIDENCIA');
      const url = evidencia.url_firmada
        || (evidencia.storage_key?.startsWith('http') ? evidencia.storage_key : null);

      return {
        tipo: tipo.charAt(0) + tipo.slice(1).toLowerCase(),
        url,
        tieneUrl: Boolean(url),
      };
    });
  };

  const handleAprobarPagos = async () => {
    if (!selectedOp) return;

    const pagos = Array.isArray(selectedOp.pagos) ? selectedOp.pagos : [];
    const pagosPendientes = pagos.filter(p => {
      const estado = String(p.estado || 'PENDIENTE').toUpperCase();
      return estado === 'PENDIENTE' || estado === 'REGISTRADO';
    });

    if (pagosPendientes.length === 0) return;

    const nuevosEstados = {};
    pagosPendientes.forEach(p => {
      nuevosEstados[p.id_pago] = 'VERIFICADO';
    });
    setEstadosLocales(prev => ({ ...prev, ...nuevosEstados }));

    try {
      setVerificando(true);
      const promesas = pagosPendientes.map(p =>
        api.put(`/pagos/${p.id_pago}`, {
          id_medio_pago: p.id_medio_pago || p.id_medio,
          monto: Number(p.monto),
          referencia_bancaria: p.referencia || p.referencia_bancaria || null,
          observacion: p.observacion || null,
          estado: 'VERIFICADO'
        })
      );

      await Promise.all(promesas);

      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);

      cerrarModal();
    } catch (err) {
      console.error('Error al verificar pagos:', err);

      const revertirEstados = {};
      pagosPendientes.forEach(p => {
        revertirEstados[p.id_pago] = p.estado;
      });
      setEstadosLocales(prev => ({ ...prev, ...revertirEstados }));
    } finally {
      setVerificando(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderMedioIcon = (medio) => {
    const m = (medio || '').toLowerCase();
    if (m.includes('efectivo')) return <Banknote className="h-5 w-5" />;
    if (m.includes('tarjeta') || m.includes('pos')) return <CreditCard className="h-5 w-5" />;
    return <Wallet className="h-5 w-5" />;
  };

  const estaVerificado = (pago) => {
    const estado = estadosLocales[pago.id_pago] || pago.estado;
    const estadoUpper = String(estado || 'PENDIENTE').toUpperCase();
    return estadoUpper === 'VERIFICADO' || estadoUpper === 'VERIFICADA' || estadoUpper === 'COMPLETADO';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full dark:bg-slate-900">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Galería de Evidencias</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visualiza todas las evidencias documentales de las operaciones registradas.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-3 shadow-sm dark:shadow-none sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por comprobante o cliente..."
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-brand-orange focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <div className="relative sm:w-56">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 pl-3 pr-9 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-orange"
          >
            <option value="">Todos los comprobantes</option>
            <option value="BOLETA">Boleta</option>
            <option value="FACTURA">Factura</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
        {/* NUEVO: Selector de Estado de Conciliación */}
        <div className="relative sm:w-56">
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 pl-3 pr-9 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-orange focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-orange"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes de Conciliar</option>
            <option value="CONCILIADO">Conciliados</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((op) => {
            // Filtrar las evidencias activas para que la tarjeta no muestre las viejas
            const verificaciones = op.verificaciones || [];
            const idsActivos = new Set();
            verificaciones.forEach(v => {
              if (v.id_evidencia_cliente) idsActivos.add(String(v.id_evidencia_cliente));
              if (v.id_evidencia_empresa) idsActivos.add(String(v.id_evidencia_empresa));
            });

            const evidenciasFiltradas = idsActivos.size > 0 
              ? (op.evidencias || []).filter(e => idsActivos.has(String(e.id_evidencia)))
              : (op.evidencias || []);

            const opParaTarjeta = { ...op, evidencias: evidenciasFiltradas };

            return (
              <EvidenceCard
                key={op.id_operacion}
                operacion={opParaTarjeta}
                onImageClick={abrirEvidencia}
                onClick={() => abrirModal(op)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/60 py-20">
          <ImageOff className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron evidencias con los filtros aplicados.</p>
        </div>
      )}

      {modalAbierto && selectedOp && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={cerrarModal}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm"
          />

          <div className="absolute inset-0 z-30 flex flex-col sm:flex-row">
            <div className="flex-1 sm:w-1/2 h-[40vh] sm:h-full bg-slate-950 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Evidencias</h2>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col p-4 overflow-hidden [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                {(() => {
                  const evidencias = getEvidenciasDeOperacion(selectedOp);
                  if (evidencias.length === 0) {
                    return (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <p className="text-sm">No hay evidencias disponibles</p>
                      </div>
                    );
                  }

                  const imagenPrincipal = evidencias[imagenPrincipalIndex];

                  return (
                    <>
                      <div
                        onClick={() => imagenPrincipal.tieneUrl && abrirEvidencia(imagenPrincipal.url)}
                        className={`relative flex-1 flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden ${
                          imagenPrincipal.tieneUrl ? 'cursor-pointer group' : ''
                        }`}
                      >
                        {imagenPrincipal.tieneUrl ? (
                          <>
                            <img
                              src={imagenPrincipal.url}
                              alt={imagenPrincipal.tipo}
                              className="max-h-full max-w-full object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors">
                              <span className="flex items-center gap-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-md dark:shadow-none opacity-0 group-hover:opacity-100">
                                <ZoomIn className="h-3.5 w-3.5" />
                                Ampliar
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 p-6">
                            <ImageOff className="h-10 w-10 mb-2" />
                            <p className="text-xs text-center">Sin vista previa</p>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white">
                            {imagenPrincipal.tipo}
                          </span>
                        </div>
                      </div>

                      {evidencias.length > 1 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                          {evidencias.map((evidencia, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setImagenPrincipalIndex(idx)}
                              className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${
                                idx === imagenPrincipalIndex
                                  ? 'border-brand-orange ring-2 ring-brand-orange/30'
                                  : 'border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              {evidencia.tieneUrl ? (
                                <img
                                  src={evidencia.url}
                                  alt={evidencia.tipo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                  <ImageOff className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                              {idx === imagenPrincipalIndex && (
                                <div className="absolute inset-0 bg-brand-orange/20" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex-1 sm:w-1/2 bg-white dark:bg-slate-800 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Conciliación</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedOp.tipo_comprobante} {selectedOp.serie}-{selectedOp.numero}</p>
                </div>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="sm:hidden rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedOp.cliente}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedOp.fecha}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Monto Total</p>
                    <p className="text-2xl font-black text-brand-orange tabular-nums">
                      {formatCurrency(selectedOp.monto)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Pagos Asociados</h3>
                  <div className="space-y-2">
                    {(Array.isArray(selectedOp.pagos) ? selectedOp.pagos : []).map((pago, idx) => {
                      const verificado = estaVerificado(pago);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            verificado ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {renderMedioIcon(pago.medio_pago)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pago.medio_pago}</p>
                              {pago.referencia && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ref: {pago.referencia}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(pago.monto)}</p>
                            {verificado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-3 w-3" />
                                Verificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row gap-3">
                  {(() => {
                    const pagosPendientesCount = (Array.isArray(selectedOp.pagos) ? selectedOp.pagos : []).filter(p => {
                      const est = String(p.estado || 'PENDIENTE').toUpperCase();
                      return est === 'PENDIENTE' || est === 'REGISTRADO';
                    }).length;

                    return pagosPendientesCount > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={cerrarModal}
                          disabled={verificando}
                          className="flex-1 h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition active:scale-95 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        {esAdmin ? (
                          <button
                            type="button"
                            onClick={handleAprobarPagos}
                            disabled={verificando}
                            className="flex-[2] h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md dark:shadow-none shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                          >
                            <ShieldCheck className="h-5 w-5" />
                            {verificando ? 'Verificando...' : 'Aprobar y Verificar'}
                          </button>
                        ) : (
                          <div className="flex-[2] h-12 flex items-center justify-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-sm font-bold text-amber-800 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
                            <ShieldCheck className="h-5 w-5" />
                            Solo un Administrador puede verificar
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={cerrarModal}
                          disabled={verificando}
                          className="flex-1 h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition active:scale-95 disabled:opacity-50"
                        >
                          Cerrar
                        </button>
                        <div className="flex-[2] h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800">
                          <CheckCircle className="h-5 w-5" /> Operación ya conciliada
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isImageOpen && selectedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
          onClick={() => {
            setIsImageOpen(false);
            setSelectedImageUrl(null);
            setZoom(false);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsImageOpen(false);
              setSelectedImageUrl(null);
              setZoom(false);
            }}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(!zoom)}
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-slate-800/90 px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            {zoom ? (
              <>
                <ZoomOut className="h-4 w-4" />
                <span>Zoom 150%</span>
              </>
            ) : (
              <>
                <ZoomIn className="h-4 w-4" />
                <span>100%</span>
              </>
            )}
          </button>
          <img
            src={selectedImageUrl}
            alt="Evidencia ampliada"
            className={`max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-transform duration-200 ${
              zoom ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default Evidencias;