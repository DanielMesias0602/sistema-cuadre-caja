import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
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

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // NUEVO ESTADO: Para el selector de agrupación (por defecto 'day')
  const [agruparPor, setAgruparPor] = useState('day'); 

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

  // --- EXPORTACIÓN TABULAR A PDF (INTACTO) ---
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

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 35, 15);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('DISTRIBUIDORA DE CERÁMICA Y ACABADOS S.A.C.', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(232, 93, 44);
      doc.text('REPORTE DE OPERACIONES Y PAGOS', pageWidth / 2, 27, { align: 'center' });

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

        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, pageWidth - 28, alturaFila, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('FECHA', X_FECHA, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(op.fecha || '-', X_FECHA, y + 9.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text((op.tipo_comprobante || 'COMPROBANTE').toUpperCase(), X_COMPROBANTE, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${op.serie || ''}-${op.numero || ''}`, X_COMPROBANTE, y + 9.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('CLIENTE', X_CLIENTE, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const clienteLineas = doc.splitTextToSize(op.cliente || 'No registrado', 55);
        doc.text(clienteLineas, X_CLIENTE, y + 9.5);

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

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('REFERENCIA', X_REFERENCIA, y + 5);
        const refGeneral = pagos.find(p => p.referencia && p.referencia !== 'None')?.referencia;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(refGeneral || '-', X_REFERENCIA, y + 9.5);

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

      if (y + 15 > 190) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`TOTAL CONCILIADO: S/ ${totalGeneral.toFixed(2)}`, X_MONTO, y, { align: 'right' });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${pageCount} | Sistema de Cuadre de Caja - FINITO`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`REPORTE_CONCILIACION_CAJA_${new Date().toLocaleDateString('en-CA')}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert(`Hubo un error al generar el PDF: ${err.message}`);
    }
  };

  // --- EXPORTACIÓN A EXCEL (INTACTO) ---
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operaciones");
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 35 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 25 }
    ];
    XLSX.writeFile(workbook, `REPORTE_OPERACIONES_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  // --- EXPORTACIÓN PDF VISUAL (CON AGRUPACIÓN Y ANTI-DUPLICADOS) ---
  const exportarPDFVisual = async () => {
    try {
      const operacionesFiltradas = operaciones.filter((op) => {
        if (fechaDesde && op.fecha < fechaDesde) return false;
        if (fechaHasta && op.fecha > fechaHasta) return false;
        return true;
      });

      const opsRelevantes = operacionesFiltradas.filter((op) => {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const tienePagoNoEfectivo = pagos.some((p) => {
          const medio = String(p.medio_pago || p.nombre_medio || '').toLowerCase();
          return medio !== '' && !medio.includes('efectivo');
        });
        const evidencias = Array.isArray(op.evidencias) ? op.evidencias : [];
        const tieneEvidenciaEmpresa = evidencias.some(
          (e) => e.tipo_evidencia === 'EMPRESA'
        );
        return tienePagoNoEfectivo || tieneEvidenciaEmpresa;
      });

      if (opsRelevantes.length === 0) {
        alert('No hay operaciones con pago no efectivo ni evidencias de empresa para exportar.');
        return;
      }

      const todasLasOps = [...opsRelevantes].sort((a, b) =>
        String(a.fecha || '').localeCompare(String(b.fecha || ''))
      );

      // LÓGICA DE AGRUPACIÓN
      const groups = {};
      todasLasOps.forEach((op) => {
        let key = op.fecha;
        if (agruparPor === 'month') {
          key = op.fecha.substring(0, 7); // YYYY-MM
        } else if (agruparPor === 'week') {
          const d = new Date(op.fecha + 'T00:00:00');
          const day = d.getDay() || 7;
          if (day !== 1) d.setHours(-24 * (day - 1));
          key = d.toISOString().split('T')[0];
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(op);
      });

      const formatGroupTitle = (key, type) => {
        if (type === 'month') {
          const [y, m] = key.split('-');
          const date = new Date(y, parseInt(m) - 1, 1);
          return `MES: ${date.toLocaleString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()}`;
        }
        if (type === 'week') {
          const start = new Date(key + 'T00:00:00');
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          return `SEMANA DEL ${format(start)} AL ${format(end)}`;
        }
        const [y, m, d] = key.split('-');
        return `FECHA: ${d}/${m}/${y}`;
      };

      const itemsToRender = [];
      Object.entries(groups).forEach(([key, ops]) => {
        if (agruparPor !== 'none') {
          itemsToRender.push({ type: 'header', title: formatGroupTitle(key, agruparPor) });
        }
        ops.forEach(op => itemsToRender.push({ type: 'op', data: op }));
      });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let logoBase64 = null;
      try {
        const logoUrl = `${import.meta.env.BASE_URL}logo-finito.png`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = logoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        logoBase64 = canvas.toDataURL('image/jpeg', 0.9);
      } catch (e) {
        console.warn('No se pudo cargar el logo:', e);
      }

      const dibujarCabecera = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', 10, 8, 16, 6.5);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('DISTRIBUIDORA DE CERÁMICA Y ACABADOS S.A.C.', pageWidth / 2, 12, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text('REPORTE DE CONCILIACIÓN VISUAL', pageWidth / 2, 18, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} | Filtro: ${fechaDesde || 'Inicio'} al ${fechaHasta || 'Fin'}`, pageWidth / 2, 23, { align: 'center' });
      };

      const COLS = 3;
      const MARGIN_X = 10;
      const GAP = 3;
      const MARGIN_TOP_BLOCKS = 26;
      const MARGIN_BOTTOM = 12;

      const usableWidth = pageWidth - 2 * MARGIN_X - (COLS - 1) * GAP;
      const blockWidth = usableWidth / COLS;
      const blockHeight = 55; 
      
      const obtenerImagenBase64 = async (evidencia) => {
        try {
          let url = null;
          if (evidencia.storage_key && /^https?:\/\//i.test(evidencia.storage_key)) {
            url = evidencia.storage_key;
          } else if (evidencia.url_firmada) {
            url = evidencia.url_firmada;
          } else if (evidencia.url) {
            url = evidencia.url;
          } else if (evidencia.id_evidencia) {
            try {
              const detalle = await api.get(`/evidencias/${evidencia.id_evidencia}`);
              const data = detalle.data?.data || detalle.data;
              if (data?.storage_key && /^https?:\/\//i.test(data.storage_key)) {
                url = data.storage_key;
              } else {
                url = data?.url_firmada || data?.url || null;
              }
            } catch (e) { }
          }
          if (!url) return null;
          const respuesta = await fetch(url);
          if (!respuesta.ok) return null;
          const blob = await respuesta.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          const img = new Image();
          img.src = base64;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.85);
        } catch (e) {
          return null;
        }
      };

      dibujarCabecera();
      let y = MARGIN_TOP_BLOCKS;
      let col = 0;
      let renderedCompanyEvidenceKeys = new Set(); 

      for (let i = 0; i < itemsToRender.length; i++) {
        const item = itemsToRender[i];

        if (item.type === 'header') {
          if (col !== 0) {
            y += blockHeight + GAP;
            col = 0;
          }
          if (y + 10 > pageHeight - MARGIN_BOTTOM) {
            doc.addPage();
            dibujarCabecera();
            y = MARGIN_TOP_BLOCKS;
          }
          doc.setFillColor(30, 58, 138);
          doc.rect(MARGIN_X, y, pageWidth - 2 * MARGIN_X, 6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(item.title, MARGIN_X + 3, y + 4);
          
          y += 8;
          renderedCompanyEvidenceKeys.clear(); 
        } else {
          const op = item.data;
          
          if (y + blockHeight > pageHeight - MARGIN_BOTTOM) {
            doc.addPage();
            dibujarCabecera();
            y = MARGIN_TOP_BLOCKS;
            col = 0;
          }

          const xPos = MARGIN_X + col * (blockWidth + GAP);
          const centerX = xPos + blockWidth / 2;

          doc.setDrawColor(30, 58, 138);
          doc.setLineWidth(0.25);
          doc.roundedRect(xPos, y, blockWidth, blockHeight, 1.5, 1.5, 'D');

          const fechaOp = op.fecha || '-';
          const comprobanteOp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.trim();
          const clienteOp = String(op.cliente || '-').substring(0, 30);
          const montoOp = Number(op.monto || 0).toFixed(2);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(30, 58, 138);
          doc.text(`FECHA: ${fechaOp}`, centerX, y + 4, { align: 'center' });
          
          doc.setFontSize(6);
          doc.setTextColor(15, 23, 42);
          doc.text(comprobanteOp, centerX, y + 7.5, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Cliente: ${clienteOp}`, centerX, y + 11, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(30, 58, 138);
          doc.text(`Monto: S/ ${montoOp}`, centerX, y + 14.5, { align: 'center' });

          const evidencias = Array.isArray(op.evidencias) ? op.evidencias : [];
          const evidenciaEmpresa = evidencias.find((e) => e.tipo_evidencia === 'EMPRESA');
          const pagos = Array.isArray(op.pagos) ? op.pagos : [];
          const pagoEvidencia = pagos.find((p) => !String(p.medio_pago || p.nombre_medio || '').toLowerCase().includes('efectivo'));
          const medioEvidencia = pagoEvidencia?.medio_pago || pagoEvidencia?.nombre_medio || 'Transferencia';
          const montoEvidencia = pagoEvidencia ? `S/ ${Number(pagoEvidencia.monto).toFixed(2)}` : '';

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Evidencia: ${medioEvidencia} ${montoEvidencia}`, centerX, y + 17.5, { align: 'center' });

          const imgY = y + 18.5;
          const imgMaxWidth = blockWidth - 4;
          const imgMaxHeight = blockHeight - 19;

          if (evidenciaEmpresa) {
            const isDuplicate = renderedCompanyEvidenceKeys.has(evidenciaEmpresa.storage_key);
            
            if (isDuplicate) {
              doc.setDrawColor(200, 200, 200);
              doc.setFillColor(245, 245, 245);
              doc.roundedRect(xPos + 3, imgY, blockWidth - 6, imgMaxHeight, 1, 1, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5);
              doc.setTextColor(150, 150, 150);
              doc.text('Voucher BCP', centerX, imgY + imgMaxHeight / 2 - 2, { align: 'center' });
              doc.text('Consolidado', centerX, imgY + imgMaxHeight / 2 + 2, { align: 'center' });
            } else {
              const base64 = await obtenerImagenBase64(evidenciaEmpresa);
              if (base64) {
                const img = new Image();
                img.src = base64;
                await new Promise((resolve) => { img.onload = resolve; });
                const ratio = Math.min(imgMaxWidth / img.width, imgMaxHeight / img.height);
                const finalWidth = img.width * ratio;
                const finalHeight = img.height * ratio;
                const xImg = xPos + blockWidth / 2 - finalWidth / 2;
                doc.addImage(base64, 'JPEG', xImg, imgY, finalWidth, finalHeight);
                renderedCompanyEvidenceKeys.add(evidenciaEmpresa.storage_key);
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5);
                doc.setTextColor(180, 83, 9);
                doc.text('Imagen no disponible', centerX, imgY + imgMaxHeight / 2, { align: 'center' });
              }
            }
          } else {
            doc.setDrawColor(217, 119, 6);
            doc.setLineWidth(0.2);
            doc.roundedRect(xPos + 3, imgY, blockWidth - 6, imgMaxHeight, 1, 1, 'D');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(180, 83, 9);
            doc.text('Evidencia empresa', centerX, imgY + imgMaxHeight / 2 - 3, { align: 'center' });
            doc.text('PENDIENTE', centerX, imgY + imgMaxHeight / 2 + 1, { align: 'center' });
          }

          col++;
          if (col === 3) {
            col = 0;
            y += blockHeight + GAP;
          }
        }
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${p} de ${pageCount} | Sistema de Cuadre de Caja - FINITO`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      doc.save(`REPORTE_CONCILIACION_VISUAL_${new Date().toLocaleDateString('en-CA')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF visual:', err);
      alert(`Hubo un error al generar el PDF visual: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Centro de Reportes
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500">
            Genera y descarga el reporte unificado de conciliación de caja.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Filtros de fecha y agrupación */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3 sm:gap-4 w-full">
          
          {/* Rango de fechas */}
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Rango de fechas
            </label>
            <div className="w-full">
              <DateRangePicker
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
                onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                  setFechaDesde(newDesde);
                  setFechaHasta(newHasta);
                }}
              />
            </div>
          </div>

          {/* Agrupar por */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <label className="block text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Agrupar por
            </label>
            <select
              value={agruparPor}
              onChange={(e) => setAgruparPor(e.target.value)}
              className="w-full h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 cursor-pointer transition-all"
            >
              <option value="day">Día (Fecha)</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="none">Sin agrupar (Continuo)</option>
            </select>
          </div>

          {/* Botón Limpiar */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => { setFechaDesde(''); setFechaHasta(''); setAgruparPor('day'); }}
              className="h-[42px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors w-full lg:w-auto"
            >
              Limpiar
            </button>
          </div>

        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Tarjeta PDF */}
        <button
          type="button"
          onClick={exportarPDF}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 sm:p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-56 sm:h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}pdf-icon.png`}
            alt="PDF background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-base sm:text-xl font-black text-white mb-1">Reporte de Operaciones y Pagos</h3>
              <p className="text-xs sm:text-sm text-blue-100 line-clamp-2">Exporta el reporte unificado de conciliación.</p>
            </div>
            <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/20">
              <span className="text-[10px] sm:text-xs font-medium text-blue-100">Incluye desglose y totales</span>
              <Download className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>

        {/* Tarjeta Excel */}
        <button
          type="button"
          onClick={exportarExcel}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 sm:p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-56 sm:h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}excel-icon.png`}
            alt="Excel background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-base sm:text-xl font-black text-white mb-1">Reporte de Operaciones y Pagos</h3>
              <p className="text-xs sm:text-sm text-emerald-100 line-clamp-2">Ideal para análisis y filtros personalizados.</p>
            </div>
            <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/20">
              <span className="text-[10px] sm:text-xs font-medium text-emerald-100">Datos tabulares por pago</span>
              <Download className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>

        {/* Tarjeta PDF Visual */}
        <button
          type="button"
          onClick={exportarPDFVisual}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 p-4 sm:p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-56 sm:h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}aura-icon.png`}
            alt="Aura background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-base sm:text-xl font-black text-white mb-1">Reporte Visual</h3>
              <p className="text-xs sm:text-sm text-violet-100 line-clamp-2">Incluye capturas de evidencias de la empresa.</p>
            </div>
            <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/20">
              <span className="text-[10px] sm:text-xs font-medium text-violet-100">Muestra las fotos de transferencias</span>
              <Download className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange flex-shrink-0">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-900">Resumen del Periodo</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                {fechaDesde || 'Inicio'} al {fechaHasta || 'Fin'}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-xs text-slate-500">Total Conciliado</p>
            <p className="text-2xl sm:text-4xl font-black text-brand-orange tabular-nums break-words">
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