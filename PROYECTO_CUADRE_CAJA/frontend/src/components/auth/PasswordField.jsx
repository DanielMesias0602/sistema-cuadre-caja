import { useState } from 'react';

export function PasswordField({ register, error, disabled }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div data-purpose="input-group-password">
      <label
        className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide mb-2"
        htmlFor="password"
      >
        Contraseña <span className="text-red-500 font-bold">*</span>
      </label>
      <div className="relative flex items-center rounded-xl border border-gray-300 bg-white px-4 py-3 sm:py-3.5 transition custom-input">
        <span className="text-gray-400 mr-3 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="•••••••••••"
          disabled={disabled}
          className="w-full border-none p-0 text-base text-gray-800 placeholder-gray-400 tracking-wider focus:outline-none focus:ring-0"
          {...register('password', { required: 'La contraseña es obligatoria' })}
        />
        <button
          type="button"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          disabled={disabled}
          onClick={() => setShowPassword(!showPassword)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none ml-2 cursor-pointer"
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L17.772 17.772M9.88 9.88a3 3 0 104.24 4.24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error.message}</p>}
    </div>
  );
}
