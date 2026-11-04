import { useState, useEffect, useRef } from 'react';
import { usuariosService, extractData } from '../../services/usuarios.service';
import { Plus, UserX, UserCheck, Key, X, Trash2, AlertTriangle, Shield, User, Search, Settings, Pencil, Eye, EyeOff, Lock } from 'lucide-react';
import { notifyToast } from '../../components/ui/toastEvents';

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // Control del menú desplegable de la tuerca
  const [menuAbierto, setMenuAbierto] = useState(null);
  const menuRef = useRef(null);

  // Estados para el modal de CREAR usuario
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    usuario: '',
    password: '',
    id_rol: 4,
    condicion_personal: 'PRAC.'
  });

  // Estados para el modal de EDITAR usuario
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nombres: '',
    apellidos: '',
    id_rol: 4,
    condicion_personal: 'PRAC.'
  });

  // Estados para el modal de CAMBIAR CONTRASEÑA
  const [modalPasswordOpen, setModalPasswordOpen] = useState(false);
  const [usuarioPassword, setUsuarioPassword] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function cargarUsuarios() {
    try {
      const response = await usuariosService.listar();
      setUsuarios(extractData(response));
      setError(null);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  }

  const recargarUsuarios = () => {
    setLoading(true);
    setError(null);
    return cargarUsuarios();
  };

  useEffect(() => {
    void Promise.resolve().then(cargarUsuarios);

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      await usuariosService.crear(formData);
      setModalCrearOpen(false);
      setShowPassword(false);
      setFormData({
        nombres: '',
        apellidos: '',
        usuario: '',
        password: '',
        id_rol: 4,
        condicion_personal: 'PRAC.'
      });
      recargarUsuarios();
    } catch (error) {
      console.error('Error al crear usuario:', error);
    }
  };

  const abrirModalEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setEditFormData({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      id_rol: usuario.id_rol,
      condicion_personal: usuario.condicion_personal
    });
    setModalEditarOpen(true);
    setMenuAbierto(null);
  };

  const handleEditarUsuario = async (e) => {
    e.preventDefault();
    try {
      await usuariosService.actualizar(usuarioEditando.id_usuario, editFormData);
      setModalEditarOpen(false);
      recargarUsuarios();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const abrirModalPassword = (usuario) => {
    setUsuarioPassword(usuario);
    setNuevaPassword('');
    setShowNuevaPassword(false);
    setModalPasswordOpen(true);
    setMenuAbierto(null);
  };

  const handleGuardarPassword = async (e) => {
    e.preventDefault();
    if (nuevaPassword.length < 8) {
      notifyToast('La contraseña debe tener al menos 8 caracteres.', 'warning');
      return;
    }

    try {
      await usuariosService.resetPassword(usuarioPassword.id_usuario, nuevaPassword);
      notifyToast('Contraseña actualizada correctamente.', 'success');
      setModalPasswordOpen(false);
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
    }
  };

  const handleToggleEstado = async (id, estadoActual) => {
    setMenuAbierto(null);
    try {
      await usuariosService.cambiarEstado(id, !estadoActual);
      recargarUsuarios();
    } catch (error) {
      console.error('Error al cambiar el estado del usuario:', error);
    }
  };

  const handleEliminarUsuario = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await usuariosService.eliminar(userToDelete.id_usuario);
      setUserToDelete(null);
      recargarUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    `${u.nombres} ${u.apellidos} ${u.usuario}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getInitials = (nombres, apellidos) => {
    return `${nombres?.charAt(0) || ''}${apellidos?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="w-full space-y-6 animate-fade-in-up dark:bg-slate-900">
      {/* CABECERA PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 dark:text-slate-100">
            <UsersIcon className="w-8 h-8 text-brand-orange" />
            Gestión de Usuarios
          </h1>
          <p className="text-base text-slate-500 mt-2 font-medium dark:text-slate-400">Administra el personal, credenciales y niveles de acceso.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={() => setModalCrearOpen(true)}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 dark:shadow-none"
          >
            <Plus className="w-5 h-5" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-base dark:bg-rose-950/40 dark:text-rose-400">{error}</div>}

      {/* TABLA PREMIUM — solo desktop (md+) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
        <div className="overflow-x-auto overflow-y-visible rounded-3xl [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-600">
              <tr>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs">Usuario / Personal</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs">Rol Funcional</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs">Condición</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs text-center">Estado</th>
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
              {loading ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-500 text-lg dark:text-slate-400">Cargando directorio...</td></tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-500 text-lg dark:text-slate-400">No se encontraron usuarios.</td></tr>
              ) : usuariosFiltrados.map(u => (
                <tr key={u.id_usuario} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700/40">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.estado ? 'bg-orange-100 text-brand-orange dark:bg-orange-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {getInitials(u.nombres, u.apellidos)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base dark:text-slate-100">{u.nombres} {u.apellidos}</div>
                        <div className="text-slate-500 font-medium flex items-center gap-1 mt-0.5 dark:text-slate-400">
                          <span className="text-brand-orange">@{u.usuario}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${u.rol_nombre === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60' :
                      u.rol_nombre === 'RESPONSABLE DE CAJA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' :
                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                      }`}>
                      {u.rol_nombre === 'ADMINISTRADOR' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      {u.rol_nombre}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-medium dark:text-slate-300">{u.condicion_personal}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.estado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.estado ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {u.estado ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right relative">
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === u.id_usuario ? null : u.id_usuario)}
                      className={`p-2 rounded-xl transition ${menuAbierto === u.id_usuario ? 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    {menuAbierto === u.id_usuario && (
                      <div ref={menuRef} className="absolute right-8 top-12 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-fade-in-down dark:bg-slate-800 dark:border-slate-600 dark:shadow-none">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Pencil className="w-4 h-4 text-blue-500" /> Editar Datos
                        </button>
                        <button
                          onClick={() => abrirModalPassword(u)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Key className="w-4 h-4 text-orange-500" /> Cambiar Contraseña
                        </button>
                        <button
                          onClick={() => handleToggleEstado(u.id_usuario, u.estado)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {u.estado ? <><UserX className="w-4 h-4 text-red-500" /> Desactivar</> : <><UserCheck className="w-4 h-4 text-emerald-500" /> Activar</>}
                        </button>

                        {!u.estado && (
                          <>
                            <div className="h-px bg-slate-100 my-1 dark:bg-slate-600"></div>
                            <button
                              onClick={() => { setUserToDelete(u); setMenuAbierto(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar Cuenta
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS — solo móvil (<md) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-500 text-base dark:bg-slate-800/60 dark:border-slate-600 dark:text-slate-400 dark:shadow-none">
            Cargando directorio...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-500 text-base dark:bg-slate-800/60 dark:border-slate-600 dark:text-slate-400 dark:shadow-none">
            No se encontraron usuarios.
          </div>
        ) : usuariosFiltrados.map(u => (
          <div key={u.id_usuario} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 dark:bg-slate-800/60 dark:border-slate-600 dark:shadow-none">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${u.estado ? 'bg-orange-100 text-brand-orange dark:bg-orange-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'}`}>
                {getInitials(u.nombres, u.apellidos)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-base leading-tight break-words dark:text-slate-100">
                  {u.nombres} {u.apellidos}
                </div>
                <div className="text-brand-orange font-medium text-sm mt-0.5">
                  @{u.usuario}
                </div>
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuAbierto(menuAbierto === u.id_usuario ? null : u.id_usuario)}
                  className={`p-2 rounded-xl transition ${menuAbierto === u.id_usuario ? 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                >
                  <Settings className="w-5 h-5" />
                </button>

                {menuAbierto === u.id_usuario && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuAbierto(null)}
                    />
                    <div
                      className="absolute right-0 top-12 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-fade-in-down dark:bg-slate-800 dark:border-slate-600 dark:shadow-none"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => abrirModalEditar(u)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Pencil className="w-4 h-4 text-blue-500" /> Editar Datos
                      </button>
                      <button
                        onClick={() => abrirModalPassword(u)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Key className="w-4 h-4 text-orange-500" /> Cambiar Contraseña
                      </button>
                      <button
                        onClick={() => handleToggleEstado(u.id_usuario, u.estado)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {u.estado ? <><UserX className="w-4 h-4 text-red-500" /> Desactivar</> : <><UserCheck className="w-4 h-4 text-emerald-500" /> Activar</>}
                      </button>

                      {!u.estado && (
                        <>
                          <div className="h-px bg-slate-100 my-1 dark:bg-slate-600"></div>
                          <button
                            onClick={() => { setUserToDelete(u); setMenuAbierto(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar Cuenta
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${u.rol_nombre === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60' :
                u.rol_nombre === 'RESPONSABLE DE CAJA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' :
              'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                }`}>
                {u.rol_nombre === 'ADMINISTRADOR' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {u.rol_nombre}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {u.condicion_personal}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${u.estado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.estado ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {u.estado ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR USUARIO */}
      {modalCrearOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
          <div className="my-auto flex max-h-[90vh] max-h-[90dvh] w-[95%] max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in-up dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-slate-900 p-6 sm:p-8 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><Shield className="w-40 h-40 text-white" /></div>
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Crear Nuevo Usuario</h2>
                <p className="text-slate-300 text-sm mt-1">Asigna credenciales y permisos al nuevo personal.</p>
              </div>
              <button type="button" onClick={() => setModalCrearOpen(false)} aria-label="Cerrar modal" className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto dark:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
              <form id="createUserForm" onSubmit={handleCrearUsuario} className="space-y-5" autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Nombres</label>
                    <input type="text" required autoComplete="off" value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Apellidos</label>
                    <input type="text" required autoComplete="off" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Nombre de Usuario (Login)</label>
                  <input type="text" required autoComplete="off" value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength="8"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Rol Funcional</label>
                    <select value={formData.id_rol} onChange={e => setFormData({ ...formData, id_rol: Number(e.target.value) })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition cursor-pointer dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900">
                      <option value={1}>ADMINISTRADOR</option>
                      <option value={3}>RESPONSABLE DE CAJA</option>
                      <option value={4}>USUARIO DE REGISTRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Condición Personal</label>
                    <select value={formData.condicion_personal} onChange={e => setFormData({ ...formData, condicion_personal: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white outline-none transition cursor-pointer dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900">
                      <option value="PRAC.">PRAC.</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 dark:border-slate-600 dark:bg-slate-800">
              <button onClick={() => setModalCrearOpen(false)} className="min-h-11 px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition text-sm dark:text-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button type="submit" form="createUserForm" className="min-h-11 bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition text-sm active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 dark:shadow-none">Guardar Usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO */}
      {modalEditarOpen && usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
          <div className="my-auto flex max-h-[90vh] max-h-[90dvh] w-[95%] max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in-up dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-blue-600 p-6 sm:p-8 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><Pencil className="w-40 h-40 text-white" /></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-extrabold text-white">Editar Datos</h2>
                <p className="text-blue-100 text-sm mt-1">Actualizando a @{usuarioEditando.usuario}</p>
              </div>
              <button type="button" onClick={() => setModalEditarOpen(false)} aria-label="Cerrar modal" className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto dark:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
              <form id="editUserForm" onSubmit={handleEditarUsuario} className="space-y-5" autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Nombres</label>
                    <input type="text" required autoComplete="off" value={editFormData.nombres} onChange={e => setEditFormData({ ...editFormData, nombres: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Apellidos</label>
                    <input type="text" required autoComplete="off" value={editFormData.apellidos} onChange={e => setEditFormData({ ...editFormData, apellidos: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Rol Funcional</label>
                    <select value={editFormData.id_rol} onChange={e => setEditFormData({ ...editFormData, id_rol: Number(e.target.value) })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition cursor-pointer dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900">
                      <option value={1}>ADMINISTRADOR</option>
                      <option value={3}>RESPONSABLE DE CAJA</option>
                      <option value={4}>USUARIO DE REGISTRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Condición Personal</label>
                    <select value={editFormData.condicion_personal} onChange={e => setEditFormData({ ...editFormData, condicion_personal: e.target.value })} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition cursor-pointer dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:bg-slate-900">
                      <option value="PRAC.">PRAC.</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 dark:border-slate-600 dark:bg-slate-800">
              <button onClick={() => setModalEditarOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition text-sm dark:text-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button type="submit" form="editUserForm" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition text-sm active:scale-95 dark:shadow-none">Actualizar Datos</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {modalPasswordOpen && usuarioPassword && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
          <div className="my-auto flex max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in-up dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="bg-orange-500 p-6 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><Lock className="w-40 h-40 text-white" /></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-extrabold text-white">Cambiar Contraseña</h2>
                <p className="text-orange-100 text-sm mt-1">Asignando nueva contraseña a @{usuarioPassword.usuario}</p>
              </div>
              <button type="button" onClick={() => setModalPasswordOpen(false)} aria-label="Cerrar modal" className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 sm:p-8 dark:bg-slate-800">
              <form id="passwordForm" onSubmit={handleGuardarPassword} className="space-y-5" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNuevaPassword ? "text" : "password"}
                      required
                      minLength="8"
                      autoComplete="new-password"
                      value={nuevaPassword}
                      onChange={e => setNuevaPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white outline-none transition dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNuevaPassword(!showNuevaPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {showNuevaPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
              <button onClick={() => setModalPasswordOpen(false)} className="min-h-11 px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition text-sm dark:text-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button type="submit" form="passwordForm" className="min-h-11 bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition text-sm active:scale-95 dark:shadow-none">Actualizar Contraseña</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
          <div className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md overflow-y-auto rounded-3xl bg-white p-5 text-center shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-8">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 dark:text-slate-100">¿Eliminar Usuario?</h3>
            <p className="text-base text-slate-500 mb-8 leading-relaxed dark:text-slate-400">
              Estás a punto de eliminar a <strong className="text-slate-800 dark:text-slate-200">{userToDelete.nombres} {userToDelete.apellidos}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button onClick={() => setUserToDelete(null)} className="min-h-11 flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-sm dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200">Cancelar</button>
              <button onClick={handleEliminarUsuario} disabled={isDeleting} className="min-h-11 flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition disabled:opacity-50 text-sm shadow-md shadow-red-500/30 dark:shadow-none">
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export default Usuarios;