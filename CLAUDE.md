@AGENTS.md

## Pendientes de diseño

- **Dictado en otras áreas.** La modalidad "Dictado" de las jornadas presenciales (el docente lee
  un caso y todo el grupo lo registra a la vez, cada uno con su cuenta y su nota) existe por ahora
  solo para Odontología (`src/lib/modulos/odontologia/dictado.ts` y `dictadoJornada.ts`,
  `Simulacion.dictado`). Debe extenderse a las demás áreas (enfermería, farmacia/dispensario,
  primera infancia…): cada módulo aporta su generador de caso al azar, su guion y su
  calificación por secciones; el flujo (asistente de creación, panel del docente con
  pausar/terminar, aviso al estudiante, reporte con mapa de errores) es común.

## Sistema visual (estilo de nueva.funca.edu.co, versión institucional)

- Colores en `src/app/globals.css` (`@theme`): `blue-*` es el navy FUNCA (`blue-800` #263E80,
  `blue-900` #1E2E55), `gold-500` #FBBA00 es el amarillo de acción, fondo `#EEF2FB`. Títulos en
  Poppins, texto en Inter.
- Utilidades propias: `btn-cta` (una sola acción principal por pantalla, amarilla),
  `btn-primario`, `btn-secundario`, `btn-suave`, `tarjeta`, `tarjeta-sm`, `tarjeta-accion`,
  `eyebrow` (etiqueta con línea amarilla), `titulo-pagina`, `pildora`.
- Cabeceras en azul navy (`blue-900`) para diferenciar la plataforma del sitio público, que la
  tiene blanca: `EncabezadoFunca` (paneles de los tres roles) y `BarraTrabajo` (pantallas de
  trabajo: consultorio, dictado, dispensación, catálogo), en `src/components/nucleo/`.
- Regla de los tres clics: lo frecuente se alcanza desde el Inicio (`/admin`) o el panel del
  estudiante en ≤ 3 clics. Navegación del docente por tareas: Inicio · Jornadas ·
  Calificaciones · Estudiantes ▾ · Contenido ▾ · Configuración ▾ (solo coordinación).

## Guía de inicio de docentes

- `src/app/admin/guia/page.tsx`: los pasos de una práctica (grupo → jornada → dejarla lista →
  acompañarla → calificar → contenido → cuenta), con consejos filtrados por los módulos del
  docente (`/api/auth/me`). El Inicio la ofrece mientras `Usuario.guiaVistaEn` sea null;
  terminarla u omitirla llama `POST /api/auth/guia`. Queda en el menú de la cuenta.
- Describe flujos y nombres de botones reales: si cambias uno (asistente, «Iniciar jornada»,
  «Finalizar», «Calificar», PDF, cuentas de computadores, tablero), actualiza la guía.
