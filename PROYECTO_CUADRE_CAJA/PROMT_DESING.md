PROMPT MAESTRO OFICIAL COMPLETO — 08/10/2026
FASE 21 — FRONTEND: ESTRUCTURA Y DESIGN
VERSIÓN ACTUALIZADA CON: logo oficial, estado real del frontend, prototipos Stitch, entorno de ejecución y reglas de mejora
Fecha: 2026-10-08
⚠️ INSTRUCCIÓN PREVIA OBLIGATORIA PARA CUALQUIER IA
ANTES de escribir código, la IA debe:

Leer PROMPT_MAESTRO_OFICIAL_CONSOLIDADO.md completo (contexto oficial del proyecto).

Leer este documento completo (instrucciones específicas de la Fase 21).

Inspeccionar la carpeta frontend/ tal como está hoy en el repositorio (ya tiene estructura parcial).

Inspeccionar los 4 prototipos HTML en frontend/design/ (Stitch).

Reconocer que Login y Dashboard YA FUNCIONAN en el bastión OCI (146.181.43.18/cuadrecaja/login) — no deben romperse.

Regla absoluta: este prompt NO reemplaza al consolidado. Lo complementa con información específica de la Fase 21 verificada al 08/10/2026.

SECCIÓN 0 — ESTADO REAL VERIFICADO (08/10/2026)
0.1 Backend
Estado: COMPLETO Y VALIDADO (BE-001 a BE-024).

Ejecución local: http://localhost:3000.

Ejecución desplegada: http://146.181.43.18/cuadrecaja/api/ (vía nginx → 127.0.0.1:3000 en el bastión OCI).

NO modificar. Consumir sus endpoints existentes.

0.2 Frontend
Ejecución local esperada: http://localhost:5173 (Vite). Confirmar en .env y vite.config.js antes de asumir.

Ejecución desplegada: http://146.181.43.18/cuadrecaja/login (servido por nginx desde /var/www/cuadrecaja).

Router base: /cuadrecaja/ (definido en vite.config.js como base).

Variable de entorno: VITE_API_URL=/cuadrecaja/api (en despliegue) y http://localhost:3000 (en local). Verificar .env.

0.3 Login y Dashboard
Login: FUNCIONA. FALTA QUE SE RELACIONE CON EL BACKEND Y ESOS DATOS SE DEBAN DE VALIDAR Y LLEGUEN A LA BD, Dashboard: FUNCIONA. FALTA QUE SE LIMPIEN DATOS QUE NO EXISTEM (ESTAMOS EN ETAPA DE IMPLEMENTAR PANTLLAS) HAY BOTONES DE LA PARTE IZQUIERDA QUE NO FUNCIONAN Y DEBEN HACERLO 

Regla: mejorar sí, romper NO. Cualquier cambio debe validarse antes de reemplazar.

0.4 Prototipos HTML (Stitch)
Los 4 prototipos existentes en frontend/design/:

Archivo	Estado	Uso
LOGIN.txt	Referencia visual	Ya implementado en src/pages/Login.jsx
DASHBOARD_RESUMEN.txt	Referencia visual	Ya implementado en src/pages/Dashboard.jsx
OPERACIONES.txt	Referencia visual	Por implementar/refactorizar
PAGOS.txt	Referencia visual	Por implementar/refactorizar
Regla: los .txt son referencia visual. NO se modifican. NO se eliminan. Se mantienen como fuente de diseño.

0.5 Estructura actual del frontend (verificada por captura)
text
frontend/
├── design/                       ← Prototipos HTML Stitch (NO TOCAR)
│   ├── DASHBOARD_RESUMEN.txt
│   ├── LOGIN.txt
│   ├── OPERACIONES.txt
│   └── PAGOS.txt
├── dist/                         ← Build de Vite (ignorado por git)
├── node_modules/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── auth/                 ← componentes del login
│   │   ├── dashboard/            ← componentes del dashboard
│   │   ├── features/             ← componentes por dominio (operaciones, pagos…)
│   │   ├── layout/               ← Sidebar, Header, etc.
│   │   └── ui/                   ← biblioteca UI genérica
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   └── Login.jsx
│   ├── routes/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md
└── vite.config.js
Regla: respetar esta estructura. Si hay que crear carpetas nuevas, justificarlo. Si hay que mover algo, explicar por qué.

SECCIÓN 1 — OBJETIVO DE LA FASE 21 (ACTUALIZADO)
Implementar, refactorizar y completar el frontend React + Vite del Sistema de Cuadre de Caja:

Convertir los 4 prototipos HTML Stitch en componentes React descompuestos por capas.

Mantener Login y Dashboard funcionando (ya lo están).

Hacer funcionales todos los detalles de los prototipos (filtros, drawers, estados de tabla, paginación, botones, badges, formularios).

Respetar fielmente: logo, colores, tipografía, estructura, textos, iconografía y estilo visual del diseño.

Reemplazar datos hardcodeados referenciales por datos reales del backend, manteniendo el diseño visual.

Preparar el terreno para las páginas pendientes (Evidencias, Verificación, Cierres, Salidas, Anulaciones, Notas, Conciliación, Diferencias, Reportes, Indicadores, Usuarios, Roles).

SECCIÓN 2 — LOGO OFICIAL FINITO (INVIOLABLE)
El logo oficial es el que aparece en public/ y en el Login/Dashboard en producción.

2.1 Composición del logo
text
[Icono: casa naranja con letra F dentro]
FINITO®
ACABADOS PARA TODOS
2.2 Especificaciones
Elemento	Detalle
Icono	Casa estilizada con trazo grueso naranja, letra F dentro
Color del icono	Naranja FINITO (#F97316 / #ea580c según contexto)
Texto "FINITO"	Gris oscuro (#3F3F46 o equivalente), fuente sans-serif gruesa, tracking amplio
Símbolo ®	Superíndice pequeño junto a "FINITO"
Subtítulo	"ACABADOS PARA TODOS" en mayúsculas, tracking amplio, gris más claro
Fondo	Transparente
Formato	SVG o PNG según exista en public/
2.3 Reglas de uso
NO recrear el logo con CSS. Usar el archivo de public/.

NO recolorear el logo.

NO deformar (mantener proporción).

NO agregar sombra ni efectos al logo salvo que el prototipo original lo tenga.

En el Login: logo aparece en el panel izquierdo (formulario) y en el panel derecho (branding).

En el Dashboard/Sidebar: logo aparece arriba del menú lateral.

En el Header móvil: logo aparece cuando el sidebar está oculto.

2.4 Identidad de la empresa
Textos fijos que acompañan al logo:

"Distribuidora de Cerámica y Acabados S.A.C."

"Chincha, Ica • Perú"

"RUC 20601248963"

"Diseñado y desarrollado por: Ing. Daniel Mesias De La Cruz" (solo en Login, en el pie del panel derecho)

SECCIÓN 3 — IDENTIDAD VISUAL OFICIAL (TOKENS)
Extraída de los prototipos Stitch. NO inventar colores nuevos.

3.1 Paleta oficial (Login + Dashboard)
Token	Valor	Uso
brand.orange	#ea580c	Botón primario, CTA, acentos
brand.orange-hover	#c2410c	Hover del primario
brand.navy	#121729	Fondo del panel derecho del login
brand.dark	#0f172a	Textos oscuros, header
primary (dashboard)	#a33900	Estados activos del sidebar
primary-container	#cc4900	Fondo del ítem activo del sidebar
background	#f8f9ff	Fondo general del dashboard
surface	#f8f9ff	Superficies
surface-container-lowest	#ffffff	Tarjetas y cards blancas
surface-container-low	#eff4ff	Sidebar, filtros
surface-container	#e5eeff	Badges neutrales
surface-container-high	#dce9ff	Hover de tabs
feedback-balanced	#16A34A	Éxito, "Verificada", "PAGADA"
feedback-warning	#D97706	Advertencia, "PENDIENTE"
feedback-danger	#DC2626	Error, "ANULADA", "OBSERVADA"
feedback-info	#2563EB	Info neutral
tertiary	#0051d5	Azul secundario
on-surface	#0b1c30	Texto principal
on-surface-variant	#5a4138	Texto secundario
secondary	#565e74	Texto de apoyo
border-slate	#E2E8F0	Bordes
3.2 Tipografías oficiales
Rol	Familia	Pesos	Uso
Headlines	Plus Jakarta Sans	600, 700, 800	Títulos, KPI numbers, sidebar activo
Body	Inter	400, 500, 600, 700	Textos, labels, tablas, badges
Iconografía	Material Symbols Outlined	—	Todos los íconos de la app
Regla: cargar las 3 fuentes desde index.html (Google Fonts) o localmente. NO mezclar otras fuentes.

3.3 Sistema de spacing
Definido en tailwind.config:

text
space-xs: 0.25rem   (4px)
space-sm: 0.5rem    (8px)
space-md: 1rem      (16px)
space-lg: 1.5rem    (24px)
space-xl: 2.5rem    (40px)
margin: 2rem
gutter: 1.25rem
gutter-mobile: 0.75rem
3.4 Border radius
text
DEFAULT: 0.25rem
lg: 0.5rem
xl: 0.75rem
full: 9999px
3.5 Sombras
Tarjetas: shadow-sm

Hover de tarjetas: shadow-md

Login card: sombra propia login-card-shadow

Sidebar: shadow-[0_1px_8px_rgba(0,0,0,0.04)]

SECCIÓN 4 — PROTOTIPOS HTML: QUÉ CONVERTIR Y CÓMO
4.1 Regla general de conversión
Cada prototipo HTML se descompone en múltiples archivos por responsabilidad.

Prohibido:

Copiar el HTML completo dentro de un solo .jsx.

Poner lógica de negocio dentro de componentes visuales.

Hacer fetch fuera de services/.

Mezclar varias pantallas en un solo archivo.

Ignorar el diseño visual del prototipo.

Obligatorio:

Un archivo por componente.

Un componente por responsabilidad.

Los textos del prototipo se conservan literalmente (salvo ajustes de datos dinámicos).

Las clases Tailwind del prototipo se conservan (mapeadas a tokens si aplica).

Los íconos se conservan exactamente (mismos Material Symbols).

Los estados visuales (activo, hover, pendiente, verificado, etc.) se conservan.

4.2 LOGIN — design/LOGIN.txt → src/pages/Login/
Estructura obligatoria:

text
src/pages/Login/
└── Login.jsx                       → página (ya existe; refactorizar)

src/layouts/
└── AuthLayout.jsx                  → split: form izquierda / branding derecha

src/components/auth/
├── LoginForm.jsx                   → formulario con 3 campos (usuario, contraseña, rol)
├── LoginBrandingPanel.jsx          → panel azul marino con título + logo card
├── LoginBrandingCard.jsx           → tarjeta blanca con logo FINITO + RUC
├── LoginCorporateFooter.jsx        → textos de la empresa + diseñador
└── LoginInputField.jsx             → input reutilizable con ícono
Comportamiento obligatorio:

Elemento	Comportamiento
Campo "Usuario"	Input tipo text, requerido, placeholder "Ej. usuario.caja"
Campo "Contraseña"	Input tipo password, requerido, botón de ojo para mostrar/ocultar
Campo "Rol Operativo"	Select requerido, solo visual — NO se envía al backend (el rol real lo define el backend)
Botón "Ingresar al Sistema"	Envía POST /api/auth/login con { usuario, password }
Error de credenciales	Mostrar mensaje del backend
Éxito	Guardar token + redirigir a /dashboard
Logo	Cargar desde public/
Panel derecho	Oculto en móvil (ya está en el prototipo)
Reglas:

NO enviar el rol al backend.

NO guardar la contraseña en localStorage.

NO romper el login existente. Refactorizar sin cambiar la lógica validada.

4.3 DASHBOARD — design/DASHBOARD_RESUMEN.txt → src/pages/Dashboard/
Advertencia: este archivo ya podría estar implementado como src/pages/Dashboard.jsx según la captura. Antes de tocar nada, verificar el código real.

Estructura obligatoria (si hay que refactorizar):

text
src/pages/Dashboard/
└── Dashboard.jsx

src/components/layout/
├── Sidebar.jsx
├── Header.jsx
├── SidebarNavItem.jsx
├── SidebarSection.jsx
└── SedeActivaCard.jsx

src/components/dashboard/
├── DashboardHeader.jsx             → "Operaciones y Dashboard" + turno activo
├── DashboardKpiGrid.jsx            → 4 tarjetas KPI
├── DashboardKpiCard.jsx            → tarjeta KPI reutilizable
├── DashboardFiltros.jsx            → búsqueda + fecha + turno + estado
├── DashboardTablaOperaciones.jsx   → tabla de operaciones
├── DashboardFilaOperacion.jsx      → fila reutilizable
├── DashboardDesgloseMedios.jsx     → "Desglose por Medio de Pago"
├── DashboardDesgloseBarra.jsx      → barra horizontal por medio
└── DashboardDetalleDrawer.jsx      → panel lateral de detalle de operación
Endpoints que consume:

GET /api/reportes/dashboard (KPI resumen)

GET /api/operaciones (tabla)

GET /api/reportes/pagos-por-medio (desglose)

Reglas:

NO romper el Dashboard existente.

NO cambiar los textos de los KPIs ("Operaciones registradas", "Operaciones con pago", "Monto total ingresos", "Requieren verificación").

NO cambiar la estructura visual de las tarjetas KPI.

Reemplazar los valores hardcodeados por datos reales del backend.

Si el backend aún no devuelve algún dato (p. ej. "Requieren verificación"), mostrar 0 o el valor disponible con un badge "pendiente de datos".

4.4 OPERACIONES — design/OPERACIONES.txt → src/pages/Operaciones/
Advertencia: la captura del Dashboard incluye una tabla de operaciones similar. Verificar si OPERACIONES.txt debe fusionarse con el Dashboard o crear una página independiente /operaciones.

Decisión recomendada: crear página independiente /operaciones (según el sidebar tiene ítem "Operaciones" separado).

Estructura obligatoria:

text
src/pages/Operaciones/
└── Operaciones.jsx

src/components/features/operaciones/
├── OperacionesHeader.jsx
├── OperacionesKpiGrid.jsx
├── OperacionesFiltros.jsx
├── OperacionesTabla.jsx
├── OperacionesFila.jsx
├── OperacionesEmptyState.jsx
├── OperacionesSkeleton.jsx
├── OperacionesPaginacion.jsx
├── OperacionesDetalleDrawer.jsx
├── OperacionesDetalleBloqueA.jsx   → info general
├── OperacionesDetalleBloqueB.jsx   → comprobante
├── OperacionesDetalleBloqueC.jsx   → pagos
├── OperacionesDetalleBloqueD.jsx   → evidencia
├── OperacionesDetalleBloqueE.jsx   → verificación
├── OperacionesDetalleBloqueF.jsx   → trazabilidad
└── OperacionesDetalleBloqueG.jsx   → acciones
Endpoints:

GET /api/operaciones

GET /api/operaciones/:id

POST /api/operaciones

Estados obligatorios: cargando, con datos, sin resultados, error.

4.5 PAGOS — design/PAGOS.txt → src/pages/Pagos/
Estructura obligatoria:

text
src/pages/Pagos/
└── Pagos.jsx

src/components/features/pagos/
├── PagosHeader.jsx
├── PagosKpiGrid.jsx
├── PagosFiltros.jsx
├── PagosDistribucionMedios.jsx     → 7 tarjetas por medio
├── PagosDistribucionItem.jsx
├── PagosTabla.jsx
├── PagosFila.jsx
├── PagosEmptyState.jsx
├── PagosSkeleton.jsx
├── PagosPaginacion.jsx
└── PagosDetalleDrawer.jsx
    ├── PagosDetallePago.jsx
    ├── PagosDetalleOperacion.jsx
    ├── PagosDetalleCanal.jsx
    ├── PagosDetalleEvidencia.jsx
    ├── PagosDetalleVerificacion.jsx
    ├── PagosDetalleTrazabilidad.jsx
    └── PagosDetalleAcciones.jsx
Endpoints:

GET /api/pagos/:id

GET /api/pagos/operacion/:idOperacion

GET /api/pagos/operacion/:idOperacion/resumen

GET /api/medios-pago

GET /api/medios-pago/:id

POST /api/pagos

PUT /api/pagos/:id

SECCIÓN 5 — COMPONENTES COMPARTIDOS (src/components/ui/)
Biblioteca mínima obligatoria:

text
src/components/ui/
├── Button.jsx              → variants: primary | secondary | ghost | danger
├── Badge.jsx               → variants: success | warning | danger | neutral | info
├── Card.jsx
├── KpiCard.jsx
├── Drawer.jsx
├── Modal.jsx
├── Table.jsx
├── TableRow.jsx
├── Pagination.jsx
├── Input.jsx
├── Select.jsx
├── DateInput.jsx
├── SearchInput.jsx
├── ToggleGroup.jsx         → para "Vista Tabla / Sin resultados / Cargando"
├── Toast.jsx
├── Skeleton.jsx
├── EmptyState.jsx
├── LoadingSpinner.jsx
├── Icon.jsx                → wrapper de <span class="material-symbols-outlined">
├── SectionTitle.jsx
└── Divider.jsx
Reglas:

Todos aceptan className para personalización.

Todos usan tokens de Tailwind (no colores hardcodeados).

Todos los íconos pasan por Icon.jsx para mantener consistencia.

SECCIÓN 6 — SERVICIOS (src/services/)
Regla absoluta: el frontend NUNCA hace fetch/axios fuera de services/.

6.1 Cliente base (src/lib/api.js)
js
// Cliente HTTP base con interceptores
// - baseURL: import.meta.env.VITE_API_URL
// - Interceptor request: agrega Authorization: Bearer <token>
// - Interceptor response: si 401 → limpia sesión y redirige a /login
6.2 Servicios a crear/verificar
Servicio	Endpoints backend
auth.service.js	POST /api/auth/login, GET /api/auth/me
operaciones.service.js	GET /api/operaciones, GET /api/operaciones/:id, POST /api/operaciones
pagos.service.js	POST /api/pagos, GET /api/pagos/:id, GET /api/pagos/operacion/:id/resumen, PUT /api/pagos/:id
mediosPago.service.js	GET /api/medios-pago, GET /api/medios-pago/:id
comprobantes.service.js	POST /api/comprobantes, GET /api/comprobantes
evidencias.service.js	POST /api/evidencias, GET /api/evidencias/:id
verificaciones.service.js	POST /api/verificaciones
cierres.service.js	POST /api/cierres-caja, GET /api/cierres-caja
salidas.service.js	POST /api/salidas-caja, GET /api/salidas-caja
anulaciones.service.js	POST /api/anulaciones
notasCredito.service.js	POST /api/notas-credito
conciliaciones.service.js	POST /api/conciliaciones
detallesConciliacion.service.js	POST /api/detalles-conciliaciones
reportes.service.js	8 endpoints /api/reportes/*
ocr.service.js	POST /api/ocr/procesar
usuarios.service.js	GET /api/usuarios
Cada servicio expone funciones puras que devuelven promesas con datos parseados.

SECCIÓN 7 — CONTEXTOS (src/context/)
text
src/context/
├── AuthContext.jsx         → usuario, token, login(), logout(), isAuthenticated
├── TurnoContext.jsx        → turno activo, fecha activa (opcional fase 22)
└── ToastContext.jsx        → notificaciones globales
Regla: los contextos NO hacen fetch. Delegan a services/ a través de hooks.

SECCIÓN 8 — HOOKS (src/hooks/)
text
src/hooks/
├── useAuth.js
├── useToast.js
├── useOperaciones.js
├── useOperacionDetalle.js
├── usePagos.js
├── usePagoDetalle.js
├── useMediosPago.js
├── useDebounce.js
└── usePagination.js
Regla: cada hook expone { data, loading, error, refetch } como mínimo.

SECCIÓN 9 — ROUTER (src/routes/)
text
src/routes/
├── AppRouter.jsx
├── ProtectedRoute.jsx
└── RoleRoute.jsx (opcional, según PB-02)
Rutas a definir en Fase 21:

Ruta	Componente	Protección
/login	Login.jsx	Pública
/dashboard	Dashboard.jsx	Protegida
/operaciones	Operaciones.jsx	Protegida
/pagos	Pagos.jsx	Protegida
/	Redirige a /dashboard	—
*	NotFound.jsx	—
Rutas preparadas (placeholder):

/evidencias, /verificacion-de-pagos, /cierres-de-caja, /salidas-de-caja, /anulaciones, /notas-de-credito, /conciliacion, /diferencias, /reportes, /indicadores, /usuarios, /roles-y-permisos.

Base del router: /cuadrecaja/ (según vite.config.js).

SECCIÓN 10 — DATOS ILUSTRATIVOS vs DATOS REALES
Los prototipos Stitch tienen datos de ejemplo (números de operaciones, montos, usuarios). Estos datos son referenciales y NO representan la lógica real del proyecto.

10.1 Regla
Respetar los textos fijos (labels, títulos, headers, textos de botones).

Respetar la estructura visual (cuántas columnas, qué orden).

Reemplazar los datos dinámicos por datos reales del backend.

NO inventar reglas de negocio para llenar los datos.

10.2 Ejemplo
En DASHBOARD_RESUMEN.txt:

"128" (Operaciones registradas) → reemplazar por el dato real de GET /api/reportes/dashboard.

"42" (Operaciones del turno) → reemplazar por dato real.

"S/ 48,250.00" (Monto total) → reemplazar por dato real.

"5" (Requieren verificación) → reemplazar por dato real o 0 si no está disponible.

En OPERACIONES.txt:

"BE02-00024034" → reemplazar por el comprobante real.

"Gretel (Cajera)" → reemplazar por el usuario real.

"S/ 30.00" → reemplazar por el monto real.

10.3 Estados de la interfaz
Cada listado debe manejar:

Cargando → skeleton del prototipo (OPERACIONES.txt ya tiene uno).

Con datos → tabla del prototipo.

Sin resultados → empty state del prototipo.

Error → mensaje controlado (reutilizar patrones del diseño).

SECCIÓN 11 — MEJORAS PERMITIDAS (COMO IA, CON CRITERIO)
El usuario pidió mejorar detalles sin romper lo que funciona. Las mejoras deben estar alineadas con el proyecto.

11.1 Mejoras permitidas
Manejo de errores visible al usuario (toast, banner).

Estados de carga correctos en cada listado.

Estados vacíos correctos (ya definidos en los prototipos).

Accesibilidad: aria-label en botones de ícono, focus visible.

Responsive: el diseño ya es responsive; mantenerlo y verificar en móvil.

Validaciones de formulario en Login (campos requeridos).

Manejo de sesión: redirigir a /login si el token expira (401).

Persistencia de filtros en la URL (query params) para compartir enlaces.

Debounce en la búsqueda rápida.

Formateo de moneda y fecha con Intl.NumberFormat y helper centralizado.

Skeleton screens en todos los listados.

Toast de éxito/error en acciones (registrar pago, anular, etc.).

11.2 Mejoras NO permitidas sin autorización
Cambiar colores, tipografías o estructura visual.

Agregar bibliotecas de UI (Material UI, Ant, Chakra).

Agregar state managers (Redux, Zustand).

Cambiar textos, labels, nombres de secciones.

Reemplazar el logo.

Modificar la arquitectura de capas.

Tocar el backend.

Tocar PostgreSQL.

Tocar el MER.

Hacer git commit o git push sin autorización.

SECCIÓN 12 — ENTORNO DE EJECUCIÓN
12.1 Backend local
URL: http://localhost:3000

Ejecutable desde: backend/ con npm run dev o npm start

Requiere PostgreSQL local en :5432 (según .env)

CORS habilitado (verificar backend/src/app.js)

12.2 Frontend local
URL esperada: http://localhost:5173

Ejecutable desde: frontend/ con npm run dev

Router base: /cuadrecaja/ (verificar en vite.config.js)

Variable VITE_API_URL:

Local: http://localhost:3000

Desplegado: /cuadrecaja/api

El .env de frontend/ controla esta variable.

12.3 Despliegue (bastión OCI)
URL: http://146.181.43.18/cuadrecaja/login

Backend detrás de nginx: /cuadrecaja/api/ → 127.0.0.1:3000

Frontend servido desde /var/www/cuadrecaja

Build con npm run build → copiar dist/ al bastión

Regla: antes de asumir puertos, verificar en vite.config.js y .env.

SECCIÓN 13 — ORDEN DE IMPLEMENTACIÓN
Ejecutar en este orden, validando cada bloque antes del siguiente:

Inspeccionar frontend/ real y confirmar estructura.

Inspeccionar Login.jsx y Dashboard.jsx reales.

Confirmar con el usuario qué ya está implementado.

Refactorizar Login (sin romperlo): extraer componentes.

Refactorizar Dashboard (sin romperlo): extraer componentes.

Implementar /operaciones completo.

Implementar /pagos completo.

Configurar Tailwind real (verificar que no use CDN en producción).

Cargar fuentes en index.html.

Implementar lib/api.js + servicios base.

Implementar contextos y hooks globales.

Implementar componente Icon.jsx para Material Symbols.

Implementar biblioteca components/ui/.

Implementar router con rutas protegidas.

Crear placeholders de páginas pendientes.

Validar todo en local.

Build de producción y prueba en bastión.

Antes de cada paso: mostrar el árbol de archivos actual y lo que se va a modificar.
Después de cada paso: mostrar el árbol de archivos resultante y cómo probar.

SECCIÓN 14 — VALIDACIÓN DE LA FASE 21
La Fase 21 se cierra cuando:

□ Login funciona end-to-end contra el backend real.
□ Dashboard funciona end-to-end contra el backend real.
□ /operaciones funciona y muestra datos reales.
□ /pagos funciona y muestra datos reales.
□ Sidebar navega entre las 4 páginas sin recargar.
□ Rutas protegidas redirigen a /login sin token.
□ Cerrar sesión limpia token y redirige a /login.
□ Logo FINITO respetado al 100%.
□ Fuentes, colores y spacing respetan los tokens oficiales.
□ No hay HTML gigante en un solo archivo.
□ No hay fetch fuera de services/.
□ Estados loading/empty/error en cada listado.
□ Los datos referenciales del prototipo están reemplazados por datos reales.
□ Build de producción sin warnings graves.
□ Despliegue en bastión funciona.
SECCIÓN 15 — REGLAS INVIOLABLES DE LA FASE 21
NO romper Login ni Dashboard.

NO tocar el backend.

NO tocar PostgreSQL.

NO tocar el MER.

NO modificar ni eliminar los prototipos .txt en design/.

NO recrear el logo con CSS.

NO agregar librerías de UI o state managers sin autorización.

NO inventar endpoints. Si falta uno, reportar y esperar.

NO inventar reglas de negocio. Usar RN-01 a RN-28.

NO commit ni push sin autorización explícita.

NO cambiar de rama.

NO mostrar ni pedir contraseñas, .env ni claves privadas.

NO tocar el sistema Ticketmaster en el servidor privado 10.0.1.3.

SECCIÓN 16 — FORMA DE TRABAJO
Un paso a la vez cuando haya interacción.

Mostrar el árbol de archivos al terminar cada bloque.

Confirmar con el usuario antes de crear carpetas nuevas.

Reportar endpoints faltantes antes de inventarlos.

No avanzar sin validar el bloque anterior.

Si un prototipo tiene algo que no existe en el backend, reportarlo y esperar instrucción.

Ser muy específico con nombres de archivos, rutas y responsabilidades.

SECCIÓN 17 — INSTRUCCIÓN FINAL
Al recibir este prompt:

Leer PROMPT_MAESTRO_OFICIAL_CONSOLIDADO.md completo.

Leer este documento completo.

Inspeccionar frontend/ tal como está hoy.

Inspeccionar los 4 prototipos en design/.

Confirmar con el usuario qué está implementado y qué no.

Refactorizar sin romper.

Implementar lo que falta, respetando el diseño.

Mejorar detalles con criterio.

Validar cada bloque.

Al cerrar la Fase 21, listar lo completado y lo pendiente para la Fase 22.

Regla de oro: el diseño se respeta al 100%. La lógica se integra al 100%. La estructura por capas no se negocia.

FIN DEL PROMPT MAESTRO OFICIAL COMPLETO — 08/10/2026
Fase 21 — Frontend: estructura y design
Sistema de Gestión y Control de Cuadre de Caja
Distribuidora de Cerámica y Acabados S.A.C. — FINITO®

