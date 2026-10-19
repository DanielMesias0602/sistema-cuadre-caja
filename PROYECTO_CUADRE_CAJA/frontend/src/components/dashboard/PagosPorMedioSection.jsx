import { CreditCard, Banknote, Smartphone, Landmark } from 'lucide-react';
import { useMemo } from 'react';

export function PagosPorMedioSection({ filteredOps }) {
  const pagosPorMedio = useMemo(() => {
    const medios = {};
    
    filteredOps.forEach(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      pagos.forEach(p => {
        const medio = p.medio_pago || p.nombre_medio || 'Efectivo';
        // El monto puede venir directamente del pago o de op.comprobante.monto
        const monto = Number(p.monto || p.importe || 0);
        const esEfectivo = (medio || '').toLowerCase().includes('efectivo');
        
        if (!medios[medio]) {
          medios[medio] = {
            medio_pago: medio,
            total_monto: 0,
            es_efectivo: esEfectivo,
            count: 0
          };
        }
        medios[medio].total_monto += monto;
        medios[medio].count += 1;
      });
    });
    
    return Object.values(medios);
  }, [filteredOps]);

  const totalMontoGeneral = filteredOps.reduce((acc, op) => {
    const pagos = Array.isArray(op.pagos) ? op.pagos : [];
    const sumaPagos = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    return acc + sumaPagos;
  }, 0);

  const getMedioIcon = (nombre, esEfectivo) => {
    if (esEfectivo) return Banknote;
    const lower = (nombre || '').toLowerCase();
    if (lower.includes('yape') || lower.includes('plin') || lower.includes('qr')) return Smartphone;
    if (lower.includes('tarjeta') || lower.includes('pos')) return CreditCard;
    return Landmark;
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Desglose por Medio de Pago</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Distribución de ingresos según medio de recepción registrado
          </p>
        </div>
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
          Total: {formatCurrency(totalMontoGeneral)}
        </span>
      </div>

      {pagosPorMedio.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm font-medium">
          No hay registros de pagos para el período seleccionado
        </div>
      ) : (
        <div className="space-y-4">
          {pagosPorMedio.map((item) => {
            const Icon = getMedioIcon(item.medio_pago, item.es_efectivo);
            const monto = Number(item.total_monto || 0);
            const porcentaje = totalMontoGeneral > 0 ? ((monto / totalMontoGeneral) * 100).toFixed(1) : 0;

            return (
              <div key={item.id_medio_pago || item.medio_pago} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Icon className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold">{item.medio_pago}</span>
                    {item.es_efectivo && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        EFECTIVO
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{formatCurrency(monto)}</span>
                    <span className="text-xs text-gray-400 ml-2">({porcentaje}%)</span>
                  </div>
                </div>

                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-orange h-full rounded-full transition-all duration-300"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
