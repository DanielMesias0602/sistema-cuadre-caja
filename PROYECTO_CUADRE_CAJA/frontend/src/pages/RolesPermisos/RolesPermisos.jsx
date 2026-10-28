import { useState, useEffect } from 'react';
import { usuariosService, extractData } from '../../services/usuarios.service';
import { UserCheck, Users, Check, Crown } from 'lucide-react';

export function RolesPermisos() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await usuariosService.listar();
        setUsuarios(extractData(res));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const permisosOperativos = [
    'Registrar operaciones',
    'Registrar pagos',
    'Adjuntar evidencia',
    'Registrar salidas',
    'Cierres de caja',
    'Anulaciones',
    'Notas de crédito'
  ];

  const rolesInfo = [
    {
      nombre: 'ADMINISTRADOR',
      desc: 'Nivel de acceso máximo. Supervisa la operación, verifica pagos, realiza conciliaciones y gestiona el personal y los roles del sistema.',
      gradient: 'from-purple-600 to-indigo-700',
      bgLight: 'bg-purple-50 dark:bg-purple-950/40',
      textColor: 'text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800/60',
      icon: Crown,
      permisosOperativos: permisosOperativos,
      permisosAdmin: ['Verificar pagos', 'Conciliación', 'Gestionar usuarios', 'Gestionar roles']
    },
    {
      nombre: 'PERSONAL DE CAJA',
      desc: 'Nivel operativo. Personal encargado de registrar ventas, gestionar medios de pago, adjuntar evidencias, registrar salidas y realizar cierres de caja.',
      gradient: 'from-blue-600 to-cyan-600',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
      icon: UserCheck,
      permisosOperativos: permisosOperativos,
      permisosAdmin: []
    }
  ];

  if (loading) return (
    <div className="p-8 sm:p-12 text-center text-slate-500 text-sm sm:text-lg font-medium animate-pulse dark:text-slate-400">
      Cargando configuración de roles...
    </div>
  );

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-8 animate-fade-in-up dark:bg-slate-900">
      {/* CABECERA */}
      <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight dark:text-slate-100">
          Control de Accesos
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-500 mt-1 sm:mt-2 font-medium dark:text-slate-400">
          Revisa los privilegios asignados a cada rol funcional y el personal que los conforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {rolesInfo.map((rol) => {
          const Icono = rol.icon;
          const usuariosRol = usuarios.filter(u => {
            if (rol.nombre === 'ADMINISTRADOR') return u.rol_nombre === 'ADMINISTRADOR';
            return u.rol_nombre === 'RESPONSABLE DE CAJA' || u.rol_nombre === 'USUARIO DE REGISTRO';
          });
          const activos = usuariosRol.filter(u => u.estado).length;

          return (
            <div key={rol.nombre} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none dark:hover:shadow-none">
              {/* Header con Gradiente */}
              <div className={`bg-gradient-to-br ${rol.gradient} p-4 sm:p-6 lg:p-8 relative overflow-hidden`}>
                <div className="absolute -right-8 -top-8 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                  <Icono className="w-32 h-32 sm:w-48 sm:h-48 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner flex-shrink-0">
                      <Icono className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-wide leading-tight truncate">{rol.nombre}</h2>
                      <p className="text-white/80 text-[11px] sm:text-xs lg:text-sm font-semibold mt-0.5 sm:mt-1">{usuariosRol.length} personas asignadas</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-[11px] sm:text-xs lg:text-sm leading-relaxed max-w-md">{rol.desc}</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-4 sm:gap-6 bg-white dark:bg-slate-800/60">
                {/* Privilegios Operativos */}
                <div>
                  <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 dark:text-slate-400">Privilegios Operativos</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {rol.permisosOperativos.map(p => (
                      <span key={p} className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 ${rol.bgLight} border ${rol.borderColor} ${rol.textColor} rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold`}>
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" /> {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Privilegios Administrativos */}
                {rol.permisosAdmin.length > 0 && (
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2 dark:text-slate-400">
                      <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400" /> Privilegios Administrativos
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {rol.permisosAdmin.map(p => (
                        <span key={p} className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal Asignado */}
                <div className="flex-1 mt-1 sm:mt-2">
                  <div className="flex justify-between items-end mb-3 sm:mb-4">
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Personal Asignado
                    </h3>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md dark:bg-emerald-950/40 dark:text-emerald-400">
                      {activos} Activos
                    </span>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {usuariosRol.length > 0 ? usuariosRol.map(u => (
                      <div key={u.id_usuario} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors gap-2 dark:border-slate-600 dark:bg-slate-900/70 dark:hover:bg-slate-700 dark:hover:border-slate-500">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${u.estado ? 'bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:shadow-none' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate dark:text-slate-100">{u.nombres} {u.apellidos}</p>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate dark:text-slate-400">@{u.usuario} · {u.condicion_personal}</p>
                          </div>
                        </div>
                        <span className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full flex-shrink-0 ${u.estado ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></span>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-xs sm:text-sm text-slate-400 italic dark:text-slate-500">Sin personal asignado</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RolesPermisos;