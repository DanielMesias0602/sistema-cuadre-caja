import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PasswordField } from './PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || 'Error al conectar con el servidor de autenticación'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[94%] sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-2xl p-7 sm:p-10 md:p-10 lg:p-12 login-card-shadow border border-gray-100 relative z-10 my-auto shadow-2xl">
      {/* Header Logo */}
      <div className="mb-6 sm:mb-7 flex items-center justify-between pb-4 border-b border-gray-100" data-purpose="form-header-logo">
        <img
          alt="FINITO Acabados para Todos"
          className="h-14 sm:h-16 md:h-16 lg:h-18 w-auto object-contain inline-block"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7YEApeyTvnvYR-yJLAHZZQhQicXBZy3NBxmKjZ48RSYKdnKyLi0cXDEcwRKWSUsV1-N0BJ9eHjEXEoTbnjK2IU1uF-9WC11cLLmJERMq-ZFpzKqaEvIt2XwrxKyetG9MnoYx71PcM5gmOLip60Iy-olXpZKp2wNjE_Te4bJa82PjtAm1yzmpHFVY4Y9gUygi3-zBpeASTAyA2it_MOqfdMZmxCkIiPuKLXeLMYt71CMCyOUIT4glo5g"
        />
      </div>

      {/* Title */}
      <div className="mb-5 sm:mb-6 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0d1b2a] tracking-tight">
          Bienvenido
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5 font-normal">
          Ingrese sus credenciales de acceso operativo
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* Formulario con autoComplete desactivado */}
      <form className="space-y-4 sm:space-y-5" data-purpose="login-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        {/* Username */}
        <div data-purpose="input-group-user">
          <label className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide mb-2" htmlFor="username">
            Usuario <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="relative flex items-center rounded-xl border border-gray-300 bg-white px-4 py-3 sm:py-3.5 transition custom-input">
            <span className="text-gray-400 mr-3 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              id="username"
              type="text"
              placeholder="Ej. usuario.caja"
              disabled={isSubmitting}
              autoComplete="off"
              className="w-full border-none p-0 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
              {...register('username', { required: 'El usuario es obligatorio' })}
            />
          </div>
          {errors.username && <p className="text-red-500 text-xs mt-1 font-medium">{errors.username.message}</p>}
        </div>

        {/* Password */}
        <PasswordField register={register} error={errors.password} disabled={isSubmitting} />

        {/* Submit Button */}
        <div className="pt-3" data-purpose="submit-container">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 sm:py-4 bg-brand-orange hover:bg-brand-orange-hover text-white text-base sm:text-lg font-bold rounded-xl transition duration-150 shadow-md shadow-orange-500/25 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}