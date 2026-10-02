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
- Cabeceras: `EncabezadoFunca` (paneles de los tres roles) y `BarraTrabajo` (pantallas de
  trabajo: consultorio, dictado, dispensación, catálogo), en `src/components/nucleo/`.
- Regla de los tres clics: lo frecuente se alcanza desde el Inicio (`/admin`) o el panel del
  estudiante en ≤ 3 clics. Navegación del docente por tareas: Inicio · Jornadas ·
  Calificaciones · Estudiantes ▾ · Contenido ▾ · Configuración ▾ (solo coordinación).
