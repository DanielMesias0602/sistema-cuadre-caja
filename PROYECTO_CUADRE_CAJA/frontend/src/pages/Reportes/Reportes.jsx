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

      doc.save(`REPORTE_CONCILIACION_CAJA_${new Date().toLocaleDateString('en-CA')}.pdf`);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operaciones");
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
    XLSX.writeFile(workbook, `REPORTE_OPERACIONES_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  // --- EXPORTACIÓN PDF VISUAL CON EVIDENCIAS (GRID 3x3) ---
  const exportarPDFVisual = async () => {
    try {
      const operacionesFiltradas = operaciones.filter((op) => {
        if (fechaDesde && op.fecha < fechaDesde) return false;
        if (fechaHasta && op.fecha > fechaHasta) return false;
        return true;
      });

      // Incluir operaciones con pago no efectivo aunque no tengan evidencia
      // (para que salgan con placeholder "pendiente").
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
        alert(
          'No hay operaciones con pago no efectivo ni evidencias de empresa para exportar.'
        );
        return;
      }

      // Orden ascendente por fecha. Sin agrupar por fecha → flujo continuo.
      const todasLasOps = [...opsRelevantes].sort((a, b) =>
        String(a.fecha || '').localeCompare(String(b.fecha || ''))
      );

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Cargar logo
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

      // 2. Cabecera (se redibuja en cada página)
      const dibujarCabecera = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', 10, 8, 16, 6.5);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(
          'DISTRIBUIDORA DE CERÁMICA Y ACABADOS S.A.C.',
          pageWidth / 2,
          12,
          { align: 'center' }
        );

        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text('REPORTE DE CONCILIACIÓN VISUAL', pageWidth / 2, 18, {
          align: 'center',
        });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generado el: ${new Date().toLocaleDateString('es-PE')} | Filtro: ${fechaDesde || 'Inicio'
          } al ${fechaHasta || 'Fin'}`,
          pageWidth / 2,
          23,
          { align: 'center' }
        );
      };

      // 3. Grid 3×3 = 9 bloques por página
      const COLS = 3;
      const FILAS = 3;
      const POR_PAGINA = COLS * FILAS;
      const MARGIN_X = 10;
      const GAP = 3;
      // Márgenes ajustados (antes 30 y 15) → más altura por bloque
      const MARGIN_TOP_BLOCKS = 26;
      const MARGIN_BOTTOM = 12;

      const usableWidth = pageWidth - 2 * MARGIN_X - (COLS - 1) * GAP;
      const blockWidth = usableWidth / COLS;

      const usableHeight =
        pageHeight - MARGIN_TOP_BLOCKS - MARGIN_BOTTOM - (FILAS - 1) * GAP;
      const blockHeight = usableHeight / FILAS;

      // 4. Helper para obtener imagen respetando bucket privado
      const obtenerImagenBase64 = async (evidencia) => {
        try {
          let url = null;

          // Prioridad 1: storage_key ya es URL firmada (backend la sobrescribe)
          if (
            evidencia.storage_key &&
            /^https?:\/\//i.test(evidencia.storage_key)
          ) {
            url = evidencia.storage_key;
          }
          // Prioridad 2: url_firmada explícita
          else if (evidencia.url_firmada) {
            url = evidencia.url_firmada;
          }
          // Prioridad 3: url genérica
          else if (evidencia.url) {
            url = evidencia.url;
          }
          // Prioridad 4: pedir al backend
          else if (evidencia.id_evidencia) {
            try {
              const detalle = await api.get(
                `/evidencias/${evidencia.id_evidencia}`
              );
              const data = detalle.data?.data || detalle.data;

              if (
                data?.storage_key &&
                /^https?:\/\//i.test(data.storage_key)
              ) {
                url = data.storage_key;
              } else {
                url = data?.url_firmada || data?.url || null;
              }
            } catch (e) {
              console.warn(
                `No se pudo obtener URL firmada para evidencia ${evidencia.id_evidencia}:`,
                e.message
              );
            }
          }

          if (!url) {
            console.warn(
              'Sin URL para evidencia:',
              evidencia.id_evidencia,
              evidencia.storage_key
            );
            return null;
          }

          const respuesta = await fetch(url);
          if (!respuesta.ok) {
            console.warn('Fetch de imagen falló con status:', respuesta.status);
            return null;
          }

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
          console.warn('Error cargando imagen:', e);
          return null;
        }
      };

      dibujarCabecera();
      let currentPage = 0;

      // 5. Loop principal: flujo continuo en grid 3×3
      for (let i = 0; i < todasLasOps.length; i++) {
        const op = todasLasOps[i];
        const page = Math.floor(i / POR_PAGINA);
        const posInPage = i % POR_PAGINA;
        const col = posInPage % COLS;
        const fila = Math.floor(posInPage / COLS);

        if (page > currentPage) {
          doc.addPage();
          dibujarCabecera();
          currentPage = page;
        }

        const xPos = MARGIN_X + col * (blockWidth + GAP);
        const yPos = MARGIN_TOP_BLOCKS + fila * (blockHeight + GAP);
        const centerX = xPos + blockWidth / 2;

        // Marco
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.25);
        doc.roundedRect(xPos, yPos, blockWidth, blockHeight, 1.5, 1.5, 'D');

        // Datos
        const fechaOp = op.fecha || '-';
        const comprobanteOp = `${op.tipo_comprobante || ''} ${op.serie || ''
          }-${op.numero || ''}`.trim();
        const clienteOp = String(op.cliente || '-').substring(0, 30);
        const montoOp = Number(op.monto || 0).toFixed(2);

        // FECHA
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(30, 58, 138);
        doc.text(`FECHA: ${fechaOp}`, centerX, yPos + 4, { align: 'center' });

        // COMPROBANTE
        doc.setFontSize(6);
        doc.setTextColor(15, 23, 42);
        doc.text(comprobanteOp, centerX, yPos + 7.5, { align: 'center' });

        // CLIENTE
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cliente: ${clienteOp}`, centerX, yPos + 11, {
          align: 'center',
        });

        // MONTO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(30, 58, 138);
        doc.text(`Monto: S/ ${montoOp}`, centerX, yPos + 14.5, {
          align: 'center',
        });

        // Etiqueta evidencia
        const evidencias = Array.isArray(op.evidencias) ? op.evidencias : [];
        const evidenciaEmpresa = evidencias.find(
          (e) => e.tipo_evidencia === 'EMPRESA'
        );

        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const pagoEvidencia = pagos.find(
          (p) =>
            !String(p.medio_pago || p.nombre_medio || '')
              .toLowerCase()
              .includes('efectivo')
        );
        const medioEvidencia =
          pagoEvidencia?.medio_pago ||
          pagoEvidencia?.nombre_medio ||
          'Transferencia';
        const montoEvidencia = pagoEvidencia
          ? `S/ ${Number(pagoEvidencia.monto).toFixed(2)}`
          : '';

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Evidencia: ${medioEvidencia} ${montoEvidencia}`,
          centerX,
          yPos + 17.5,
          { align: 'center' }
        );

        // Área de imagen (más grande que antes: empieza más arriba y ocupa más alto)
        const imgY = yPos + 18.5;
        const imgMaxWidth = blockWidth - 4;
        const imgMaxHeight = blockHeight - 19;

        if (evidenciaEmpresa) {
          const base64 = await obtenerImagenBase64(evidenciaEmpresa);

          if (base64) {
            const img = new Image();
            img.src = base64;
            await new Promise((resolve) => {
              img.onload = resolve;
            });

            const ratio = Math.min(
              imgMaxWidth / img.width,
              imgMaxHeight / img.height
            );
            const finalWidth = img.width * ratio;
            const finalHeight = img.height * ratio;
            const xImg = xPos + blockWidth / 2 - finalWidth / 2;

            doc.addImage(base64, 'JPEG', xImg, imgY, finalWidth, finalHeight);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(180, 83, 9);
            doc.text(
              'Imagen no disponible',
              centerX,
              imgY + imgMaxHeight / 2,
              { align: 'center' }
            );
          }
        } else {
          // Placeholder "pendiente"
          doc.setDrawColor(217, 119, 6);
          doc.setLineWidth(0.2);
          doc.roundedRect(
            xPos + 3,
            imgY,
            blockWidth - 6,
            imgMaxHeight,
            1,
            1,
            'D'
          );

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(180, 83, 9);
          doc.text(
            'Evidencia empresa',
            centerX,
            imgY + imgMaxHeight / 2 - 3,
            { align: 'center' }
          );
          doc.text(
            'PENDIENTE',
            centerX,
            imgY + imgMaxHeight / 2 + 1,
            { align: 'center' }
          );

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4);
          doc.text(
            'Se puede subir después',
            centerX,
            imgY + imgMaxHeight / 2 + 5,
            { align: 'center' }
          );
        }
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${p} de ${pageCount} | Sistema de Cuadre de Caja - FINITO`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      doc.save(
        `REPORTE_CONCILIACION_VISUAL_${new Date().toLocaleDateString(
          'en-CA'
        )}.pdf`
      );
    } catch (err) {
      console.error('Error al generar PDF visual:', err);
      alert(`Hubo un error al generar el PDF visual: ${err.message}`);
    }
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Rango de fechas</label>
            <DateRangePicker
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                setFechaDesde(newDesde);
                setFechaHasta(newHasta);
              }}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta PDF */}
        <button
          type="button"
          onClick={exportarPDF}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}pdf-icon.png`}
            alt="PDF background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-black text-white mb-1">Reporte de Operaciones y Pagos</h3>
              <p className="text-sm text-blue-100 line-clamp-2">Exporta el reporte unificado de conciliación.</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <span className="text-xs font-medium text-blue-100">Incluye desglose de productos y totales</span>
              <Download className="h-6 w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>

        {/* Tarjeta Excel */}
        <button
          type="button"
          onClick={exportarExcel}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}excel-icon.png`}
            alt="Excel background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-black text-white mb-1">Reporte de Operaciones y Pagos</h3>
              <p className="text-sm text-emerald-100 line-clamp-2">Ideal para análisis y filtros personalizados.</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <span className="text-xs font-medium text-emerald-100">Incluye datos tabulares por pago</span>
              <Download className="h-6 w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>

        {/* Tarjeta PDF Visual */}
        <button
          type="button"
          onClick={exportarPDFVisual}
          disabled={loading}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl h-64"
        >
          <img
            src={`${import.meta.env.BASE_URL}aura-icon.png`}
            alt="Aura background"
            className="absolute -right-12 -bottom-12 w-72 h-72 object-contain opacity-30 rotate-12 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-black text-white mb-1">Reporte Visual</h3>
              <p className="text-sm text-violet-100 line-clamp-2">Incluye capturas de evidencias de la empresa.</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <span className="text-xs font-medium text-violet-100">Muestra las fotos de las transferencias</span>
              <Download className="h-6 w-6 text-white group-hover:animate-bounce" />
            </div>
          </div>
        </button>
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <Lock className="h-8 w-8" />
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
            <p className="text-4xl font-black text-brand-orange tabular-nums">
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