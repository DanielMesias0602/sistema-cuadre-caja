import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import api from '../../lib/api';
import { useDatosActualizados } from '../../hooks/useSocket';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Download,
  RefreshCw,
  Lock,
  CalendarDays,
  History,
  CalendarRange,
  Calendar,
} from 'lucide-react';
import { notifyToast } from '../../components/ui/toastEvents';

export function Reportes() {
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState('custom');

  const cargarDatos = useCallback(async () => {
    try {
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar datos para reportes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const recargarDatos = () => {
    setLoading(true);
    return cargarDatos();
  };

  useEffect(() => {
    void Promise.resolve().then(cargarDatos);
  }, [cargarDatos]);

  useDatosActualizados(() => {
    void cargarDatos();
  });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFechaISO = (fecha) => {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  };

  const aplicarFiltroRapido = (filtro) => {
    setFiltroRapidoActivo(filtro);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let desde = new Date(hoy);
    let hasta = new Date(hoy);

    if (filtro === 'yesterday') {
      desde.setDate(desde.getDate() - 1);
      hasta = new Date(desde);
    } else if (filtro === 'week') {
      desde.setDate(desde.getDate() - ((desde.getDay() + 6) % 7));
      hasta = new Date(desde);
      hasta.setDate(hasta.getDate() + 6);
    } else if (filtro === 'month') {
      desde.setDate(1);
      hasta = new Date(desde.getFullYear(), desde.getMonth() + 1, 0);
    } else if (filtro === 'custom') {
      setFechaDesde('');
      setFechaHasta('');
      return;
    }

    setFechaDesde(formatearFechaISO(desde));
    setFechaHasta(formatearFechaISO(hasta));
  };

  const normalizarFechaISO = (valor) => {
    const texto = String(valor || '').trim();
    const coincidenciaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const coincidenciaLocal = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const fecha = coincidenciaISO
      ? `${coincidenciaISO[1]}-${coincidenciaISO[2]}-${coincidenciaISO[3]}`
      : coincidenciaLocal
        ? `${coincidenciaLocal[3]}-${coincidenciaLocal[2]}-${coincidenciaLocal[1]}`
        : '';

    if (!fecha) return '';
    const fechaUTC = new Date(`${fecha}T00:00:00.000Z`);
    return Number.isNaN(fechaUTC.getTime()) || fechaUTC.toISOString().slice(0, 10) !== fecha
      ? ''
      : fecha;
  };

  const formatearFecha = (fecha) => {
    const fechaISO = normalizarFechaISO(fecha);
    if (!fechaISO) return '';
    return new Date(`${fechaISO}T00:00:00.000Z`).toLocaleDateString('es-PE', {
      timeZone: 'UTC'
    });
  };

  const obtenerRangoFechasTexto = () => {
    const desde = formatearFecha(fechaDesde);
    const hasta = formatearFecha(fechaHasta);
    if (desde && hasta) return `${desde} al ${hasta}`;
    if (desde) return `Desde ${desde}`;
    if (hasta) return `Hasta ${hasta}`;
    return 'Todas las fechas';
  };

  const obtenerEtiquetaReporte = () =>
    `Filtro: ${obtenerRangoFechasTexto()}`;

  const obtenerDatosProcesados = () => {
    const desdeISO = fechaDesde ? normalizarFechaISO(fechaDesde) : '';
    const hastaISO = fechaHasta ? normalizarFechaISO(fechaHasta) : '';
    const operacionesFiltradas = operaciones.filter((op) => {
      const fecha = normalizarFechaISO(op.fecha);
      if (!fecha || (fechaDesde && !desdeISO) || (fechaHasta && !hastaISO)) return false;
      if (desdeISO && fecha < desdeISO) return false;
      if (hastaISO && fecha > hastaISO) return false;
      if (String(op.estado_operacion || op.estado || '').trim().toUpperCase() === 'ANULADA') return false;
      return true;
    }).sort((a, b) => {
      const fechaA = normalizarFechaISO(a.fecha);
      const fechaB = normalizarFechaISO(b.fecha);
      const ordenFecha = fechaA.localeCompare(fechaB);
      if (ordenFecha !== 0) return ordenFecha;
      return String(a.id_operacion || '').localeCompare(
        String(b.id_operacion || ''),
        'es',
        { numeric: true }
      );
    });

    const obtenerGrupo = (op) => {
      const fecha = normalizarFechaISO(op.fecha);
      return {
        clave: fecha,
        fecha,
        titulo: `Día ${formatearFecha(fecha)}`,
      };
    };

    const gruposPorClave = operacionesFiltradas.reduce((grupos, op) => {
      const grupo = obtenerGrupo(op);
      if (!grupos[grupo.clave]) {
        grupos[grupo.clave] = { ...grupo, operaciones: [] };
      }
      grupos[grupo.clave].operaciones.push(op);
      return grupos;
    }, {});

    const grupos = Object.values(gruposPorClave)
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .map((grupo) => ({
        ...grupo,
        total: grupo.operaciones.reduce(
          (total, op) => total + Number(op.monto ?? op.monto_operacion ?? 0),
          0
        ),
      }));

    return { operacionesFiltradas, grupos };
  };

  const obtenerMontoOperacion = (op) => Number(op.monto ?? op.monto_operacion ?? 0);

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

  // --- EXPORTACIÓN TABULAR A PDF ---
  const exportarPDF = async () => {
    const { operacionesFiltradas, grupos } = obtenerDatosProcesados();

    if (operacionesFiltradas.length === 0) {
      notifyToast('No hay operaciones para exportar con los filtros seleccionados.', 'warning');
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
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} | ${obtenerEtiquetaReporte()}`, pageWidth / 2, 33, { align: 'center' });

      y = 42;

      const totalGeneral = grupos.reduce((total, grupo) => total + grupo.total, 0);
      const itemsToRender = grupos.flatMap((grupo) => [
        { type: 'header', title: grupo.titulo },
        ...grupo.operaciones.map((op) => ({ type: 'operation', data: op })),
      ]);

      itemsToRender.forEach((item) => {
        if (item.type === 'header') {
          if (y + 10 > 190) {
            doc.addPage();
            y = 20;
          }
          doc.setFillColor(30, 58, 138);
          doc.rect(14, y, pageWidth - 28, 7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(item.title, pageWidth / 2, y + 4.8, { align: 'center' });
          y += 10;
          return;
        }

        const op = item.data;
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
        doc.text(`S/ ${obtenerMontoOperacion(op).toFixed(2)}`, X_MONTO, y + 9.5, { align: 'right' });

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
      notifyToast(`Hubo un error al generar el PDF: ${err.message}`, 'error');
    }
  };

  // --- EXPORTACIÓN A EXCEL (CON GRÁFICO Y EXCELJS) ---
  const exportarExcel = async () => {
    const { operacionesFiltradas, grupos } = obtenerDatosProcesados();

    if (operacionesFiltradas.length === 0) {
      notifyToast('No hay operaciones para exportar con los filtros seleccionados.', 'warning');
      return;
    }

    try {
      // 1. Preparar datos para el gráfico (Ventas por periodo)
      const chartData = grupos.map((grupo) => ({
        periodo: grupo.titulo || grupo.fecha,
        monto: grupo.total,
      }));

      // 2. Crear un contenedor invisible para renderizar el gráfico
      const chartContainer = document.createElement('div');
      chartContainer.style.position = 'fixed';
      chartContainer.style.left = '-9999px';
      chartContainer.style.width = '800px';
      chartContainer.style.height = '400px';
      chartContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(chartContainer);

      // 3. Renderizar Recharts en el contenedor
      const root = ReactDOM.createRoot(chartContainer);
      root.render(
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" />
            <YAxis />
            <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
            <Bar dataKey="monto" fill="#1E3A8A" name="Ventas (S/)" />
          </BarChart>
        </ResponsiveContainer>
      );

      // 4. Esperar a que Recharts se renderice
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. Convertir el gráfico a imagen
      const canvas = await html2canvas(chartContainer, { scale: 2, backgroundColor: '#ffffff' });
      const imagenBase64 = canvas.toDataURL('image/png');

      // 6. Limpiar el contenedor
      root.unmount();
      document.body.removeChild(chartContainer);

      // 7. Crear el archivo Excel con ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte de Ventas', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });
      worksheet.headerFooter.oddHeader = `&C${obtenerEtiquetaReporte()}`;

      worksheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 16 },
        { header: 'Tipo', key: 'tipo', width: 20 },
        { header: 'Serie-Número', key: 'comprobante', width: 24 },
        { header: 'Cliente', key: 'cliente', width: 36 },
        { header: 'Medio de Pago', key: 'medios', width: 30 },
        { header: 'Referencia', key: 'referencia', width: 28 },
        { header: 'Monto (S/)', key: 'monto', width: 18 },
      ];

      // Estilo de la cabecera
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;
      worksheet.autoFilter = { from: 'A1', to: 'G1' };

      operacionesFiltradas.forEach((op, index) => {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        const medios = [...new Set(pagos
          .map((pago) => pago.medio_pago || pago.nombre_medio || 'Efectivo')
          .filter(Boolean))];
        const referencias = pagos
          .map((pago) => pago.referencia_bancaria || pago.referencia)
          .filter((referencia) => referencia != null && String(referencia).trim() !== '');
        const fechaISO = normalizarFechaISO(op.fecha);
        const row = worksheet.addRow({
          fecha: fechaISO ? new Date(`${fechaISO}T00:00:00.000Z`) : '',
          tipo: op.tipo_comprobante || 'COMPROBANTE',
          comprobante: `${op.serie || ''}-${op.numero || ''}`.replace(/^-|-$/g, '') || '-',
          cliente: op.cliente || '-',
          medios: medios.join(' | ') || '-',
          referencia: referencias.join(' | ') || '-',
          monto: obtenerMontoOperacion(op),
        });
        row.getCell('fecha').numFmt = 'dd/mm/yyyy';
        row.getCell('monto').numFmt = '"S/" #,##0.00';
        row.alignment = { vertical: 'middle' };
        row.getCell('monto').alignment = { horizontal: 'right', vertical: 'middle' };

        if (index % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          });
        }
      });

      // Insertar la imagen del gráfico en el Excel (Columna H, Fila 2)
      const imageId = workbook.addImage({
        base64: imagenBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 7, row: 1 }, // Columna H, Fila 2
        ext: { width: 600, height: 300 }
      });

      // 8. Descargar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `REPORTE_OPERACIONES_${new Date().toLocaleDateString('en-CA')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error al generar Excel:', err);
      notifyToast(`Hubo un error al generar el Excel: ${err.message}`, 'error');
    }
  };

  // --- EXPORTACIÓN PDF VISUAL ---
  const exportarPDFVisual = async () => {
    try {
      const { grupos: gruposProcesados } = obtenerDatosProcesados();
      const esOperacionRelevante = (op) => {
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
      };
      const gruposRelevantes = gruposProcesados
        .map((grupo) => ({
          ...grupo,
          operaciones: grupo.operaciones.filter(esOperacionRelevante),
        }))
        .filter((grupo) => grupo.operaciones.length > 0);

      if (gruposRelevantes.length === 0) {
        notifyToast('No hay operaciones con pago no efectivo ni evidencias de empresa para exportar.', 'warning');
        return;
      }

      const itemsToRender = [];
      gruposRelevantes.forEach((grupo) => {
        itemsToRender.push({ type: 'header', title: grupo.titulo });
        grupo.operaciones.forEach((op) => itemsToRender.push({ type: 'op', data: op }));
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
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} | ${obtenerEtiquetaReporte()}`, pageWidth / 2, 23, { align: 'center' });
      };

      const COLS = 3;
      const FILAS = 3;
      const MARGIN_X = 10;
      const GAP = 3;
      const MARGIN_TOP_BLOCKS = 32;
      const MARGIN_BOTTOM = 12;

      const usableWidth = pageWidth - 2 * MARGIN_X - (COLS - 1) * GAP;
      const blockWidth = usableWidth / COLS;

      const usableHeight = pageHeight - MARGIN_TOP_BLOCKS - MARGIN_BOTTOM - (FILAS - 1) * GAP;
      const blockHeight = usableHeight / FILAS;

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
            } catch (error) {
              console.warn('No se pudo resolver la URL de la evidencia.', error);
            }
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
        } catch {
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
          if (y + 15 + blockHeight > pageHeight - MARGIN_BOTTOM) {
            doc.addPage();
            dibujarCabecera();
            y = MARGIN_TOP_BLOCKS;
          }

          doc.setFillColor(30, 58, 138);
          doc.rect(MARGIN_X, y, pageWidth - 2 * MARGIN_X, 6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);

          doc.text(item.title, pageWidth / 2, y + 4, { align: 'center' });

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
          doc.text(`FECHA: ${fechaOp}`, centerX, y + 3, { align: 'center' });

          doc.setFontSize(6);
          doc.setTextColor(15, 23, 42);
          doc.text(comprobanteOp, centerX, y + 6.5, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Cliente: ${clienteOp}`, centerX, y + 10, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(30, 58, 138);
          doc.text(`Monto: S/ ${montoOp}`, centerX, y + 13.5, { align: 'center' });

          const evidencias = Array.isArray(op.evidencias) ? op.evidencias : [];
          const verificaciones = Array.isArray(op.verificaciones) ? op.verificaciones : [];
          const evidenciasEmpresa = [
            ...new Map(
              verificaciones
                .map((verificacion) => evidencias.find(
                  (evidencia) => String(evidencia.id_evidencia) === String(verificacion.id_evidencia_empresa)
                ))
                .filter(Boolean)
                .map((evidencia) => [String(evidencia.id_evidencia), evidencia])
            ).values(),
          ];
          const pagos = Array.isArray(op.pagos) ? op.pagos : [];
          const pagoEvidencia = pagos.find((p) => !String(p.medio_pago || p.nombre_medio || '').toLowerCase().includes('efectivo'));
          const medioEvidencia = pagoEvidencia?.medio_pago || pagoEvidencia?.nombre_medio || 'Transferencia';
          const montoEvidencia = pagoEvidencia ? `S/ ${Number(pagoEvidencia.monto).toFixed(2)}` : '';

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Evidencia: ${medioEvidencia} ${montoEvidencia}`, centerX, y + 16.5, { align: 'center' });

          const imgY = y + 17;
          const imgMaxWidth = blockWidth - 2;
          const imgMaxHeight = blockHeight - 17.5;

          if (evidenciasEmpresa.length > 0) {
            const evidenceGap = 1.5;
            const evidenceHeight = (imgMaxHeight - evidenceGap * (evidenciasEmpresa.length - 1)) / evidenciasEmpresa.length;

            for (const [evidenceIndex, evidenciaEmpresa] of evidenciasEmpresa.entries()) {
              const evidenceY = imgY + evidenceIndex * (evidenceHeight + evidenceGap);
              const storageKey = evidenciaEmpresa.storage_key;
              const isDuplicate = Boolean(
                storageKey && renderedCompanyEvidenceKeys.has(storageKey)
              );

              if (isDuplicate) {
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(245, 245, 245);
                doc.roundedRect(xPos + 3, evidenceY, blockWidth - 6, evidenceHeight, 1, 1, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5);
                doc.setTextColor(150, 150, 150);
                doc.text('Voucher BCP', centerX, evidenceY + evidenceHeight / 2 - 2, { align: 'center' });
                doc.text('Consolidado', centerX, evidenceY + evidenceHeight / 2 + 2, { align: 'center' });
                continue;
              }

              const base64 = await obtenerImagenBase64(evidenciaEmpresa);
              if (base64) {
                const img = new Image();
                img.src = base64;
                await new Promise((resolve) => { img.onload = resolve; });
                const ratio = Math.min(imgMaxWidth / img.width, evidenceHeight / img.height);
                const finalWidth = img.width * ratio;
                const finalHeight = img.height * ratio;
                const xImg = xPos + blockWidth / 2 - finalWidth / 2;
                const yImg = evidenceY + (evidenceHeight - finalHeight) / 2;
                doc.addImage(base64, 'JPEG', xImg, yImg, finalWidth, finalHeight);
                if (storageKey) renderedCompanyEvidenceKeys.add(storageKey);
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5);
                doc.setTextColor(180, 83, 9);
                doc.text('Imagen no disponible', centerX, evidenceY + evidenceHeight / 2, { align: 'center' });
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
      notifyToast(`Hubo un error al generar el PDF visual: ${err.message}`, 'error');
    }
  };

  const datosProcesados = obtenerDatosProcesados();

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up dark:bg-slate-900">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Centro de Reportes
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400">
            Genera y descarga el reporte unificado de conciliación de caja.
          </p>
        </div>

        <button
          type="button"
          onClick={recargarDatos}
          disabled={loading}
          className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 self-start sm:self-auto dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:text-slate-100 dark:shadow-none"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none">
        <div className="flex w-full flex-col items-stretch gap-3 sm:gap-4">
          <div>
            <p className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Acceso rápido
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Filtros rápidos de fecha">
              {[
                ['today', 'Hoy', CalendarDays],
                ['yesterday', 'Ayer', History],
                ['week', 'Esta Semana', CalendarRange],
                ['month', 'Este Mes', Calendar],
                ['custom', 'Personalizado', null],
              ].map(([filtro, etiqueta, Icono]) => (
                <button
                  key={filtro}
                  type="button"
                  onClick={() => aplicarFiltroRapido(filtro)}
                  aria-pressed={filtroRapidoActivo === filtro}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    filtroRapidoActivo === filtro
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {typeof Icono === 'function' && <Icono className="h-4 w-4" aria-hidden="true" />}
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
                Rango de fechas
              </label>
              <div className="w-full">
                <DateRangePicker
                  fechaDesde={fechaDesde}
                  fechaHasta={fechaHasta}
                  onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                    setFechaDesde(newDesde);
                    setFechaHasta(newHasta);
                    setFiltroRapidoActivo('custom');
                  }}
                />
              </div>
            </div>
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
          className="group relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl dark:shadow-none sm:min-h-64 sm:p-6"
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
          className="group relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl dark:shadow-none sm:min-h-64 sm:p-6"
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
          className="group relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 p-4 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl dark:shadow-none sm:min-h-64 sm:p-6"
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-lg dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange flex-shrink-0">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Resumen del Periodo</p>
              <p className="break-words text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {fechaDesde && fechaHasta
                  ? `Mostrando operaciones del ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}`
                  : fechaDesde
                    ? `Mostrando operaciones desde ${formatearFecha(fechaDesde)}`
                    : fechaHasta
                      ? `Mostrando operaciones hasta ${formatearFecha(fechaHasta)}`
                      : 'Mostrando operaciones de todas las fechas'}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Total Conciliado</p>
            <p className="text-2xl sm:text-4xl font-black text-brand-orange tabular-nums break-words">
              {formatCurrency(
                datosProcesados.grupos.reduce((total, grupo) => total + grupo.total, 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reportes;