import { useState, useEffect } from 'react';
import { usuariosService, extractData } from '../../services/usuarios.service';
import { ShieldCheck, UserCheck, Users, Check, Crown } from 'lucide-react';

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

  const rolesInfo = [
    {
      nombre: 'ADMINISTRADOR',
      desc: 'Nivel de acceso máximo. Responsable de la supervisión, verificación de pagos, conciliaciones y gestión del personal del sistema.',
      gradient: 'from-purple-600 to-indigo-700',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
      icon: Crown,
      permisos: ['Registrar todo', 'Verificar pagos', 'Conciliación', 'Gestionar usuarios', 'Cierres de caja']
    },
    {
      nombre: 'USUARIO DE REGISTRO',
      desc: 'Nivel operativo. Personal de caja encargado de registrar ventas, gestionar medios de pago, adjuntar evidencias y registrar salidas.',
      gradient: 'from-blue-600 to-cyan-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: UserCheck,
      permisos: ['Registrar operaciones', 'Registrar pagos', 'Adjuntar evidencia', 'Registrar salidas']
    }
  ];

  if (loading) return <div className="p-12 text-center text-slate-500 text-lg font-medium animate-pulse">Cargando configuración de roles...</div>;

  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* CABECERA PREMIUM */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Control de Accesos</h1>
        <p className="text-base text-slate-500 mt-2 font-medium">Revisa los privilegios asignados a cada rol funcional y el personal que los conforma.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {rolesInfo.map((rol) => {
          const Icono = rol.icon;
          const usuariosRol = usuarios.filter(u => u.rol_nombre === rol.nombre);
          const activos = usuariosRol.filter(u => u.estado).length;
          
          return (
            <div key={rol.nombre} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
              {/* Header con Gradiente */}
              <div className={`bg-gradient-to-br ${rol.gradient} p-8 relative overflow-hidden`}>
                <div className="absolute -right-8 -top-8 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                  <Icono className="w-48 h-48 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                      <Icono className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-wide">{rol.nombre}</h2>
                      <p className="text-white/80 text-sm font-semibold">{usuariosRol.length} personas asignadas</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed max-w-md">{rol.desc}</p>
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col gap-8 bg-white">
                {/* Permisos */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Privilegios del Rol</h3>
                  <div className="flex flex-wrap gap-2">
                    {rol.permisos.map(p => (
                      <span key={p} className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${rol.bgLight} border ${rol.borderColor} ${rol.textColor} rounded-xl text-xs font-bold`}>
                        <Check className="w-3.5 h-3.5" /> {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Personal Asignado */}
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4" /> Personal Asignado
                    </h3>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{activos} Activos</span>
                  </div>
                  
                  <div className="space-y-3">
                    {usuariosRol.map(u => (
                      <div key={u.id_usuario} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.estado ? 'bg-white text-slate-700 shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
                            {u.nombres?.charAt(0)}{u.apellidos?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{u.nombres} {u.apellidos}</p>
                            <p className="text-xs font-medium text-slate-500">@{u.usuario} • {u.condicion_personal}</p>
                          </div>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${u.estado ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></span>
                      </div>
                    ))}
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