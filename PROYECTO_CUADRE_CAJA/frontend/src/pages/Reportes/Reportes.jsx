import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Calendar,
  Lock
} from 'lucide-react';

export function Reportes() {
  const navigate = useNavigate();
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar datos para reportes:', err);
      setError('No se pudo cargar los datos para generar reportes.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  // --- EXPORTACIÓN UNIFICADA A PDF ---
  const exportarPDF = async () => {
    const operacionesFiltradas = operaciones.filter((op) => {
      if (fechaDesde && op.fecha < fechaDesde) return false;
      if (fechaHasta && op.fecha > fechaHasta) return false;
      return true;
    });

    if (operacionesFiltradas.length === 0) {
      alert('No hay operaciones para exportar con los filtros seleccionados.');
      return;
    }

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

      const X_FECHA = 18;
      const X_COMPROBANTE = 48;
      const X_CLIENTE = 95;
      const X_MEDIOS = 155;
      const X_REFERENCIA = 210;
      const X_MONTO = 279;

      // Cabecera
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 35, 15);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('DISTRIBUIDORA DE CERÁMICA Y ACABADOS S.A.C.', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(232, 93, 44);
      doc.text('REPORTE DE CONCILIACIÓN DE CAJA', pageWidth / 2, 27, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} | Filtro: ${fechaDesde || 'Inicio'} al ${fechaHasta || 'Fin'}`, pageWidth / 2, 33, { align: 'center' });

      y = 42;

      const totalGeneral = operacionesFiltradas.reduce((acc, op) => acc + Number(op.monto || 0), 0);

      operacionesFiltradas.forEach(op => {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const alturaFila = 15 + (pagos.length > 1 ? (pagos.length - 1) * 6.5 : 0);

        if (y + alturaFila > 190) {
          doc.addPage();
          y = 20;
        }

        // Tarjeta de la operación
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, pageWidth - 28, alturaFila, 2, 2, 'FD');

        // Fecha
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('FECHA', X_FECHA, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(op.fecha || '-', X_FECHA, y + 9.5);

        // Comprobante
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text((op.tipo_comprobante || 'COMPROBANTE').toUpperCase(), X_COMPROBANTE, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${op.serie || ''}-${op.numero || ''}`, X_COMPROBANTE, y + 9.5);

        // Cliente
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('CLIENTE', X_CLIENTE, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const clienteLineas = doc.splitTextToSize(op.cliente || 'No registrado', 55);
        doc.text(clienteLineas, X_CLIENTE, y + 9.5);

        // Medios de Pago
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('MEDIOS DE PAGO', X_MEDIOS, y + 5);

        let pagoY = y + 9.5;
        if (pagos.length > 0) {
          pagos.forEach(p => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            const medio = p.medio_pago || p.nombre_medio || 'Efectivo';
            doc.text(`${medio}:`, X_MEDIOS, pagoY);
            doc.setFont('helvetica', 'normal');
            doc.text(`S/ ${Number(p.monto || 0).toFixed(2)}`, X_MEDIOS + 35, pagoY);
            pagoY += 6;
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('No detallado', X_MEDIOS, pagoY);
        }

        // Referencia
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('REFERENCIA', X_REFERENCIA, y + 5);
        const refGeneral = pagos.find(p => p.referencia && p.referencia !== 'None')?.referencia;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(refGeneral || '-', X_REFERENCIA, y + 9.5);

        // Monto
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('MONTO', X_MONTO, y + 5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(232, 93, 44);
        doc.text(`S/ ${Number(op.monto || 0).toFixed(2)}`, X_MONTO, y + 9.5, { align: 'right' });

        y += alturaFila + 3;
      });

      // Total
      if (y + 15 > 190) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`TOTAL CONCILIADO: S/ ${totalGeneral.toFixed(2)}`, X_MONTO, y, { align: 'right' });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${pageCount} | Sistema de Cuadre de Caja - FINITO`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`REPORTE_CONCILIACION_CAJA_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert(`Hubo un error al generar el PDF: ${err.message}`);
    }
  };

  // --- EXPORTACIÓN UNIFICADA A EXCEL ---
  const exportarExcel = () => {
    const operacionesFiltradas = operaciones.filter((op) => {
      if (fechaDesde && op.fecha < fechaDesde) return false;
      if (fechaHasta && op.fecha > fechaHasta) return false;
      return true;
    });

    if (operacionesFiltradas.length === 0) {
      alert('No hay operaciones para exportar con los filtros seleccionados.');
      return;
    }

    const datos = [];
    operacionesFiltradas.forEach(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      pagos.forEach(p => {
        datos.push({
          'Fecha': op.fecha,
          'Comprobante': `${op.tipo_comprobante} ${op.serie}-${op.numero}`,
          'Cliente': op.cliente || '-',
          'Medio de Pago': p.medio_pago || p.nombre_medio || 'Efectivo',
          'Referencia': p.referencia || '-',
          'Monto': Number(p.monto || 0),
          'Estado': p.estado || op.estado || 'PENDIENTE',
          'Registrado por': `${op.nombres} ${op.apellidos}`.trim() || 'Sistema'
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conciliación");
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 35 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 }
    ];
    XLSX.writeFile(workbook, `REPORTE_CONCILIACION_CAJA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Centro de Reportes
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Genera y descarga el reporte unificado de conciliación de caja.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="sm:col-span-2 flex items-end gap-3">
            <button
              type="button"
              onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
              className="h-12 px-4 rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={exportarPDF}
          disabled={loading}
          className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FileText className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">Exportar PDF</p>
            <p className="text-xs text-slate-500">Reporte de Conciliación de Caja</p>
          </div>
          <Download className="ml-auto h-5 w-5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={exportarExcel}
          disabled={loading}
          className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">Exportar Excel</p>
            <p className="text-xs text-slate-500">Reporte de Conciliación de Caja</p>
          </div>
          <Download className="ml-auto h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Resumen del Periodo</p>
              <p className="text-xs text-slate-500">
                {fechaDesde || 'Inicio'} al {fechaHasta || 'Fin'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Conciliado</p>
            <p className="text-2xl font-black text-brand-orange tabular-nums">
              {formatCurrency(
                operaciones.filter(op => {
                  if (fechaDesde && op.fecha < fechaDesde) return false;
                  if (fechaHasta && op.fecha > fechaHasta) return false;
                  return true;
                }).reduce((sum, op) => sum + Number(op.monto || 0), 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reportes;
