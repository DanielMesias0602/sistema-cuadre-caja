export function AuthLayout({ children }) {
  return (
    <main
      className="min-h-[100dvh] md:h-[100dvh] w-full flex flex-col-reverse md:flex-row overflow-x-hidden md:overflow-hidden bg-[#f3f4f6]"
      data-purpose="login-layout"
    >
      {/* Columna izquierda: fondo claro con tarjeta de autenticación flotante */}
      <section
        className="flex-1 w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 bg-gradient-to-b from-gray-100 via-gray-100 to-gray-200 overflow-y-auto relative"
        data-purpose="auth-section"
      >
        {children}

        {/* Pie de página únicamente para móvil */}
        <div className="mt-3 sm:mt-4 text-center md:hidden text-[11px] text-gray-500 leading-tight space-y-1 relative z-10">
          <p className="font-medium text-gray-700">
            Distribuidora de Cerámica y Acabados S.A.C. • RUC 20601248963
          </p>
          <p className="text-gray-500 text-[10px]">
            Chincha, Ica • Diseñado por:{' '}
            <span className="font-medium text-gray-700">
              Ing. Daniel Mesias De La Cruz
            </span>
          </p>
        </div>
      </section>

      {/* Columna derecha: fondo azul marino oscuro con títulos institucionales y tarjeta central */}
      <section
        className="hidden md:flex flex-1 w-full bg-gradient-to-br from-[#0a2342] via-[#0d3163] to-[#114084] flex-col justify-center items-center p-6 md:p-8 lg:p-12 xl:p-14 text-white text-center relative overflow-hidden space-y-6"
        data-purpose="corporate-display-section"
      >
        {/* Fondo decorativo SVG */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg
            className="w-full h-full"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 800 800"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="200" cy="200" r="260" stroke="white" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="380" stroke="white" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="520" stroke="white" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="680" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Cabecera de título principal */}
        <div className="max-w-2xl w-full mx-auto pt-4 md:pt-6 lg:pt-14 px-2 md:px-4">
          <h2 className="leading-tight tracking-tight font-extrabold mb-2 md:mb-3 text-white relative z-10 text-2xl md:text-3xl lg:text-5xl">
            Sistema de Gestión y <br />
            <span className="text-[#ea580c]">Cuadre de Caja</span>
          </h2>
        </div>

        {/* Tarjeta blanca institucional central con logo FINITO y RUC */}
        <div className="max-w-md lg:max-w-lg w-full mx-auto my-3 md:my-4 lg:my-6 relative" data-purpose="corporate-card">
          <div className="bg-white rounded-2xl p-5 md:p-6 lg:p-10 shadow-2xl flex flex-col items-center justify-center border border-slate-700/20">
            <div className="w-full flex items-center justify-center px-2 py-2 md:py-3 lg:py-4">
              <img
                alt="FINITO - Distribuidora de Cerámica y Acabados"
                className="h-24 sm:h-32 md:h-36 lg:h-52 w-auto max-w-full object-contain transition-transform duration-200 py-1"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdzHY-YFlLpBa99NAppwubQSCKXxu-5_BGIVRWmJat5GdT_YdFoiF1FJVJVh8QYW-azzVgEmwhLLpqBw_4p-t472Zr07qU08w-Fd-yPXS12vfAo_9V5wOZEPHLtEnax9WWylM68Ye9JHTWLHXaKu__ljOqOKugsExN2mT-nwNrzAkYmlzcjZP57P7tsvk1Y--QUrtmFCHDGwVqS6C-6kUg-KG_ZjJJOOV89wDH4eN7y3WnpRO9IGYS6A"
              />
            </div>
            <div className="w-full pt-4 mt-2 lg:pt-6 lg:mt-4 border-t border-gray-100 flex items-center justify-between text-left">
              <div className="flex flex-col">
                <span className="text-xs text-gray-800 font-semibold leading-tight">
                  Distribuidora de Cerámica y Acabados S.A.C.
                </span>
                <span className="text-[11px] text-gray-500">Chincha, Ica • Perú</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] lg:text-[11px] font-bold text-brand-orange block uppercase tracking-wider">
                  RUC
                </span>
                <span className="text-xs lg:text-sm font-extrabold text-brand-orange tracking-tight">
                  20601248963
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página institucional */}
        <footer className="pt-3 md:pt-4 pb-2 text-xs text-gray-300 flex flex-col items-end justify-center gap-2 tracking-wide relative w-full max-w-md lg:max-w-lg px-2" data-purpose="corporate-footer">
          <p className="w-full text-center text-xs text-gray-300 font-medium mb-1">
            Distribuidora de Cerámica y Acabados S.A.C. • Chincha, Ica, Perú
          </p>
          <div className="flex flex-col items-end justify-center gap-1.5 w-full">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-md text-[11px] text-slate-200 ml-auto">
              <span className="font-normal">
                Diseñado y desarrollado por:{' '}
                <span className="font-semibold text-white">
                  Ing. Daniel Mesias De La Cruz
                </span>
              </span>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
