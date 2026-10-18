import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { OperacionDetailDrawer } from '../../components/dashboard/OperacionDetailDrawer';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  Plus, Search, Calendar, Receipt, 
  CheckCircle, Clock, AlertCircle, FileText, 
  Download, ChevronDown, FileSpreadsheet, FileDown,
  User, CreditCard, Link as LinkIcon
} from 'lucide-react';

export function Operaciones() {
  const navigate = useNavigate();
  
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const [selectedOp, setSelectedOp] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    cargarOperaciones();
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarOperaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el historial de operaciones.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'PAGADA' || st === 'VERIFICADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
          <CheckCircle className="w-3 h-3" /> {st}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
          <Clock className="w-3 h-3" /> PENDIENTE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
        <AlertCircle className="w-3 h-3" /> {st || 'REGISTRADO'}
      </span>
    );
  };

  const operacionesFiltradas = operaciones.filter((op) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const comp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.toLowerCase();
      const cliente = (op.cliente || '').toLowerCase();
      const usuario = `${op.nombres || ''} ${op.apellidos || ''}`.toLowerCase();
      if (!comp.includes(q) && !cliente.includes(q) && !usuario.includes(q)) return false;
    }
    if (fechaDesde && op.fecha < fechaDesde) return false;
    if (fechaHasta && op.fecha > fechaHasta) return false;
    if (estadoFiltro && (op.estado || '').toUpperCase() !== estadoFiltro.toUpperCase()) return false;
    return true;
  });

  const cargarImagenBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  // --- EXPORTACIÓN A PDF ---
  const exportarPDF = async () => {
    setExportMenuOpen(false);
    if (operacionesFiltradas.length === 0) return;

    try {
      let logoBase64 = null;
      try {
        const logoUrl = `${import.meta.env.BASE_URL}logo-finito.png`;
        logoBase64 = await cargarImagenBase64(logoUrl);
      } catch (error) {
        console.warn("No se pudo cargar el logo.", error);
      }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // --- COORDENADAS EXACTAS DE COLUMNAS ---
      const X_FECHA = 18;
      const X_COMPROBANTE = 46;
      const X_CLIENTE = 88;
      const X_MEDIOS = 150;
      const X_REFERENCIA = 214;
      const X_MONTO = 279;

      // --- CABECERA ---
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 35, 15);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); 
      doc.text('DISTRIBUIDORA DE CERÁMICA Y ACABADOS S.A.C.', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(13);
      doc.setTextColor(232, 93, 44); 
      doc.text('CONCILIACIÓN DE OPERACIONES CAJA', pageWidth / 2, 27, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); 
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} | Filtro: ${fechaDesde || 'Inicio'} al ${fechaHasta || 'Fin'}`, pageWidth / 2, 33, { align: 'center' });

      y = 42;

      const totalGeneral = operacionesFiltradas.reduce((acc, op) => acc + Number(op.monto || 0), 0);

      // --- FILAS (TARJETAS) ---
      operacionesFiltradas.forEach(op => {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const alturaFila = 15 + (pagos.length > 1 ? (pagos.length - 1) * 6.5 : 0);

        if (y + alturaFila > 190) {
          doc.addPage();
          y = 20;
        }

        // Fondo y borde de la tarjeta
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, pageWidth - 28, alturaFila, 2, 2, 'FD');

        // 1. FECHA
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('FECHA', X_FECHA, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(op.fecha || '-', X_FECHA, y + 9.5);

        // 2. COMPROBANTE
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text((op.tipo_comprobante || 'COMPROBANTE').toUpperCase(), X_COMPROBANTE, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${op.serie || ''}-${op.numero || ''}`, X_COMPROBANTE, y + 9.5);

        // 3. CLIENTE
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('CLIENTE', X_CLIENTE, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const clienteLineas = doc.splitTextToSize(op.cliente || 'No registrado', 55);
        doc.text(clienteLineas, X_CLIENTE, y + 9.5);

        // 4. MEDIOS DE PAGO
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('MEDIO DE PAGO', X_MEDIOS, y + 5);

        let pagoY = y + 9.5;
        if (pagos.length > 0) {
          pagos.forEach(p => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            const medio = p.medio_pago || p.nombre_medio || 'Efectivo';
            doc.text(`${medio}:`, X_MEDIOS, pagoY);
            doc.setFont('helvetica', 'normal');
            doc.text(`S/ ${Number(p.monto || 0).toFixed(2)}`, X_MEDIOS + 30, pagoY);
            pagoY += 6;
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('No detallado', X_MEDIOS, pagoY);
        }

        // 5. REFERENCIA / EVIDENCIA (LINK OCI)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('REFERENCIA / EVIDENCIA', X_REFERENCIA, y + 5);
        
        const pagoConEvidencia = pagos.find(p => p.evidencia_url && p.evidencia_url !== 'None');
        if (pagoConEvidencia) {
          const urlEvidencia = pagoConEvidencia.evidencia_url;
          const urlFinal = urlEvidencia.startsWith('http') 
            ? urlEvidencia 
            : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${urlEvidencia}`;
          
          const textoLink = (pagoConEvidencia.referencia && pagoConEvidencia.referencia !== 'None') 
            ? pagoConEvidencia.referencia 
            : 'Ver Evidencia';
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(37, 99, 235);
          doc.text(textoLink, X_REFERENCIA, y + 9.5);
          doc.link(X_REFERENCIA, y + 6.5, doc.getTextWidth(textoLink) + 2, 4.5, { url: urlFinal });
        } else {
          const refGeneral = pagos.find(p => p.referencia && p.referencia !== 'None')?.referencia;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(refGeneral || '-', X_REFERENCIA, y + 9.5);
        }

        // 6. MONTO TOTAL
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('TOTAL', X_MONTO, y + 5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(232, 93, 44);
        doc.text(`S/ ${Number(op.monto || 0).toFixed(2)}`, X_MONTO, y + 9.5, { align: 'right' });

        y += alturaFila + 3;
      });

      // --- TOTAL CONCILIADO ---
      if (y + 15 > 190) { 
        doc.addPage(); 
        y = 20; 
      }

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`TOTAL CONCILIADO: S/ ${totalGeneral.toFixed(2)}`, X_MONTO, y, { align: 'right' });

      // --- PIE DE PÁGINA ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); 
        doc.text(`Página ${i} de ${pageCount} | Sistema de Cuadre de Caja - FINITO`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`Conciliacion_Operaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert(`Hubo un error al generar el PDF: ${err.message}`);
    }
  };
  
  // --- EXPORTACIÓN A EXCEL ---
  const exportarExcel = () => {
    setExportMenuOpen(false);
    if (operacionesFiltradas.length === 0) return;
    const datos = operacionesFiltradas.map(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      return {
        'Fecha': op.fecha, 'Comprobante': `${op.tipo_comprobante} ${op.serie}-${op.numero}`,
        'Cliente': op.cliente || '-', 'Medios de Pago': pagos.map(p => p.medio_pago).join(' / ') || '-',
        'Referencias': pagos.map(p => p.referencia).filter(r => r).join(' / ') || '-',
        'Monto Total': Number(op.monto), 'Estado': op.estado, 'Registrado por': `${op.nombres} ${op.apellidos}`
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operaciones");
    worksheet['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
    XLSX.writeFile(workbook, `Conciliacion_Operaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- EXPORTACIÓN A CSV ---
  const exportarCSV = () => {
    setExportMenuOpen(false);
    if (operacionesFiltradas.length === 0) return;
    const headers = ['Fecha', 'Comprobante', 'Cliente', 'Medios de Pago', 'Referencias', 'Monto Total', 'Estado', 'Registrado por'];
    const rows = operacionesFiltradas.map(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      return [
        op.fecha, `${op.tipo_comprobante} ${op.serie}-${op.numero}`, op.cliente || '-',
        pagos.map(p => p.medio_pago).join(' / ') || '-', pagos.map(p => p.referencia).filter(r => r).join(' / ') || '-',
        Number(op.monto).toFixed(2), op.estado, `${op.nombres} ${op.apellidos}`
      ];
    });
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Conciliacion_Operaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-brand-orange" />
            Historial de Operaciones
          </h1>
          <p className="text-base text-slate-500 mt-2 font-medium">
            Consulta, filtra y exporta todas las ventas registradas en el sistema.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={operacionesFiltradas.length === 0}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> 
              Exportar 
              <ChevronDown className={`w-4 h-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-fade-in-down">
                <button onClick={exportarPDF} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition">
                  <FileText className="w-4 h-4 text-rose-500" /> Exportar a PDF
                </button>
                <button onClick={exportarExcel} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar a Excel
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button onClick={exportarCSV} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition">
                  <FileDown className="w-4 h-4 text-blue-500" /> Exportar a CSV
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/operaciones/nueva')}
            className="w-full sm:w-auto bg-brand-orange hover:bg-brand-orange-hover text-white px-5 py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nueva Operación
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por comprobante o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none transition" />
        </div>
        <div className="relative">
          <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-brand-orange outline-none transition" />
        </div>
        <div className="relative">
          <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-brand-orange outline-none transition" />
        </div>
        <div>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-brand-orange outline-none transition cursor-pointer">
            <option value="">Todos los estados</option>
            <option value="PAGADA">Pagadas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="ANULADA">Anuladas</option>
          </select>
        </div>
      </div>

      {/* TABLA CON overflow-x-auto */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Fecha</th>
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Medios de Pago</th>
                <th className="p-4">Referencia</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-lg">Cargando historial...</td>
                </tr>
              ) : operacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-lg flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-300" />
                    No se encontraron operaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : operacionesFiltradas.map((op) => {
                const pagoPrincipal = op.pagos && op.pagos.length > 0 ? op.pagos[0] : null;
                const tieneEvidencia = pagoPrincipal?.evidencia_url && pagoPrincipal.evidencia_url !== 'None';

                return (
                  <tr key={op.id_operacion} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">{op.fecha}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 uppercase">{op.tipo_comprobante || 'DOC'}</span>
                          <span className="text-sm font-bold text-slate-900">{op.serie}-{op.numero}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 max-w-[200px] truncate" title={op.cliente || 'No registrado'}>
                          {op.cliente || 'No registrado'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {op.pagos && op.pagos.length > 0 ? op.pagos.map((pago, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-700">{pago.medio_pago || pago.nombre_medio || 'Efectivo'}:</span>
                            <span className="text-xs font-bold text-slate-900">S/ {parseFloat(pago.monto).toFixed(2)}</span>
                          </div>
                        )) : <span className="text-xs text-slate-400">-</span>}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {tieneEvidencia ? (
                          <a 
                            href={pagoPrincipal.evidencia_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-hover hover:underline transition cursor-pointer" 
                            title="Ver imagen en OCI"
                          >
                            <LinkIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{pagoPrincipal.referencia || 'Ver Evidencia'}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm pl-1">{pagoPrincipal?.referencia || '-'}</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <span className="text-lg font-bold text-brand-orange">{formatCurrency(op.monto)}</span>
                    </td>

                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setSelectedOp(op); setDrawerAbierto(true); }} 
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {operacionesFiltradas.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <div className="text-right">
              <span className="text-sm font-bold text-slate-600 mr-2 uppercase">Total Conciliado:</span>
              <span className="text-xl font-black text-slate-900">{formatCurrency(operacionesFiltradas.reduce((sum, op) => sum + Number(op.monto), 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* PANEL LATERAL DE DETALLE */}
      {drawerAbierto && selectedOp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-md h-full bg-slate-50 shadow-2xl animate-slide-in-right overflow-y-auto p-4">
            <OperacionDetailDrawer selectedOp={selectedOp} onClose={() => setDrawerAbierto(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Operaciones;