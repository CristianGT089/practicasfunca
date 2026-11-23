# Clase en vivo (curso de TICs)

El docente proyecta una lección y cada estudiante la sigue en su computador, con su propia cuenta.
Reemplaza las presentaciones Beamer de `tics-funca/general/claseN_*.tex`.

## Flujo

1. Docente: **Clase en vivo** (`/admin/clase`) › elige grupo › «Iniciar en vivo». Abre el
   presentador `/admin/clase/<id>` a pantalla completa (sin la barra de admin).
2. Estudiante: en su panel aparece «Clase en vivo · Entrar a la clase» (`/panel/clase`).
   Sigue la diapositiva del docente. Si se mueve con las flechas deja de seguirlo y ve
   «Ir con el profe». En una actividad no se le cambia la pantalla sola: se le avisa.
   No puede pasar de la diapositiva más lejana a la que ha llegado el docente
   (`SesionClase.maxima`): si el docente retrocede a repasar, quien ya iba adelante no pierde su lugar.
3. «📣 Traer a todos» (sube `SesionClase.llamado`) devuelve a todos a la diapositiva actual.
4. «👥 Progreso»: quién está conectado, en qué diapositiva y qué actividades completó.
   Orden alfabético, nunca por resultados (el curso no es una competencia).
5. Sin clase en vivo, `/panel/clase` queda en «modo repaso».

Sincronización por consulta cada 3 s (`POST /api/clase/estado`, que también registra la
asistencia). Se da por desconectado a quien lleva 20 s sin consultar.

## Contenido

- Lecciones como datos: `src/lib/clase/lecciones/*.ts`, registradas en `lecciones/index.ts`.
  Tipos de diapositiva en `src/lib/clase/tipos.ts`; se pintan en `src/components/clase/Diapositiva.tsx`.
- Actividades (`tipo: "actividad"`): `clasificar`, `checklist` (pasos fuera de la plataforma,
  con enlace y árbol de carpetas), `atajos` y `mecanografia` (textos en `src/lib/clase/mecanografia.ts`).
- Simulaciones de ofimática (clase 2): `interfaz` (una ventana de Docs o Sheets dibujada; se toca
  la parte pedida y, si se equivoca, se le dice qué tocó; zonas en `actividades/Interfaz.tsx`),
  `celdas` (cuadrícula: tocar, escribir y seleccionar rangos) y `formulas` (mini hoja que calcula de
  verdad con `src/lib/clase/formulas.ts`: referencias, rangos, + − * /, SUMA/SUM, PROMEDIO/AVERAGE,
  MAX, MIN, CONTAR/COUNT, CONTARA; separador «;» o «,»; exige usar referencias y la función pedida).
- `ordenar` (filtro de Sheets: «Crear filtro», ▾ por encabezado con Ordenar A → Z / Z → A y Filtrar
  por valores; al ordenar se renumeran las filas y al filtrar se saltan) y `condicional` (panel de
  reglas: intervalo, condición, valor y color, o escala de colores; gana la primera regla, como en Sheets).
- En las simulaciones el reto y el mensaje quedan fijos arriba (sticky) para que se vean al bajar.
- Pantallas (`Visor.tsx`): la barra de arriba y la de abajo quedan fijas y solo el área de la
  diapositiva hace scroll. Las diapositivas de presentación **se ajustan a la pantalla** (zoom que
  las encoge hasta caber, mínimo 0,6) y se centran; las actividades (juegos, checklists) solo
  escalan con el ancho y se recorren con scroll, con el reto fijo arriba (`sticky top-0`). En
  monitores anchos crece (ancho/1390, máx. 2) y el zoom del presentador (A−/A+) se multiplica.
  Revisado a 1366×768 (Chromebook): ninguna presentación de las clases 1–3 necesita scroll.
  En pantallas de menos de 640 px (celular) las presentaciones **no se encogen**: zoom 1 y scroll;
  `pregunta` y `terminar` nunca se encogen. En celular se pasa de diapositiva deslizando de lado
  (solo en presentaciones) y el pie se oculta mientras se escribe en una caja de texto.
- Los quices van en Q10: en la lección solo se anuncian con una diapositiva `externo` (y en la
  clase a tu ritmo, un checklist «¿Hiciste el quiz?»).
- Mecanografía progresiva: cada nivel tiene sus textos en orden («Texto 2 de 5»); el siguiente nivel
  se abre al terminar todos los del anterior y al volver se retoma el primer texto pendiente. Al
  terminar, el resultado tapa el texto. El signo de una tecla muerta (´ antes de la vocal) queda
  «en espera» sin marcarse como error hasta que se forma la letra (á).
- Preguntas rápidas (`tipo: "pregunta"`): no tienen nota. El estudiante vota (y puede cambiar) y
  el presentador ve el compilado anónimo de esa clase (`GET /api/admin/clase/<id>/respuestas`),
  con la opción más votada más grande. «Mostrar respuesta a todos» guarda la pregunta en
  `SesionClase.reveladas`: cada estudiante ve en su pantalla la correcta, si acertó y la explicación
  (también si vuelve atrás) y ya no puede cambiar su voto. En modo repaso se revela al responder.
- `notas` de una diapositiva: solo se ven en el presentador (botón «Notas»).
- Ilustraciones (`tipo: "visual"`): dibujos en `components/clase/Visuales.tsx` en vez de tarjetas
  (caja negra, $ al copiar, SI, BUSCARV, partes y tipos de gráfico, zonas de la tabla dinámica,
  cuadrícula de Sheets, ordenar vs. filtrar). Para uno nuevo: agregarlo a `Visual` en `tipos.ts`.
- Simulaciones de la clase 3: `formulas` (ahora con texto, comparaciones, SI, CONTAR.SI, SUMAR.SI,
  .CONJUNTO, BUSCARV/X, SI.ERROR, REDONDEAR, HOY; `copiar` revisa cada copia y enseña el $),
  `grafico` (editor de gráficos) y `dinamica` (editor de tabla dinámica). Hojas .xlsx en
  `public/clase/tics-3/` (se generan con `scripts/clase/hojas_tics3.py`).
- **Clase 3 recortada (23 nov 2026):** ese domingo solo alcanzaron las funciones. Gráficos, tablas
  dinámicas y el Entregable 3 salieron de `tics3.ts` y quedaron en
  `lecciones/pendientes/graficosDinamicas.ts` (`GRAFICOS_Y_DINAMICAS`, sin registrar) para abrir la
  clase 4. Sus pruebas siguen en `tests/clase-tics3.test.ts`.

## Datos

- `SesionClase`: lección, diapositiva actual, `maxima` (tope para los estudiantes), `llamado`, grupo (null = todos, solo admin).
- `AsistenciaClase`: última consulta y diapositiva de cada estudiante en la sesión.
- `ProgresoClase`: por usuario + lección + **contexto** + actividad (o pregunta). Contexto `""` =
  clase en vivo y repaso; `ritmo:<recorridoId>` = una clase a tu ritmo. Así cada clase a tu ritmo
  tiene sus propios resultados: no se mezcla con la clase en vivo ni con otra asignación de la
  misma lección. No depende de la sesión: si se desconecta o practica en casa lo retoma.

## Cualquier equipo: celular, Chromebook, Windows, Mac

Muchos estudiantes no tienen computador y siguen la clase desde el celular. La plataforma detecta
el equipo (`src/lib/clase/dispositivo.ts`: `useDispositivo()`, por el navegador; el estudiante lo
corrige con el chip de la cabecera y queda en `localStorage`) y adapta:

- **Atajos:** en Mac las diapositivas cambian Ctrl → ⌘ y Alt → ⌥ Option (`adaptarAtajos`, salvo
  textos de un sistema concreto). Las tablas que comparan sistemas resaltan la columna «tu equipo».
- **Checklists:** cada paso puede traer `variantes` por equipo (`celular`, `mac`, `windows`,
  `chromebook`) con su texto y su ayuda (p. ej. la app de Sheets en vez de los menús de escritorio).
- **Actividades:** la práctica de atajos tiene versión para cada sistema y, en el celular, un quiz
  de qué hace cada atajo + tareas con pulsación larga + gestos del celular. La mecanografía avisa
  que necesita teclado físico y deja seguir (`omitidaEnCelular`, no bloquea la clase a tu ritmo;
  el reporte lo muestra). La interfaz simula la **app** de Docs/Sheets del celular (`retosCelular`).
- **Pantallas pequeñas:** las presentaciones no se encogen (zoom 1 y scroll), las simulaciones usan
  pestañas (editor | resultado) por debajo de `lg`, blancos ≥ 40 px con `pointer-coarse:`, campos
  de 16 px (iOS no hace zoom) y nada depende solo de hover.
- **El docente ve el equipo** de cada estudiante (📱/💻/🪟/🍎) en «Progreso» y en el reporte de la
  clase a tu ritmo (`AsistenciaClase.dispositivo`, `RecorridoClase.dispositivo`; la lista de
  equipos sin React está en `src/lib/clase/equipos.ts` para las rutas de la API).

## Asistente de fórmulas (como el de Sheets)

`actividades/Formulas.tsx` + `actividades/formulas/BarraFormulas.tsx`:

- **Autocompletar** al escribir `=SU` (funciones en español o inglés y nombres de tablas; Tab,
  Enter o toque para elegir) y, dentro de `Tabla[`, las columnas.
- **Tarjeta de ayuda** de la función donde está el cursor: sintaxis con el argumento actual
  resaltado, ejemplo, ejemplo de salud, resumen y cada argumento. Catálogo en
  `src/lib/clase/catalogoFunciones.ts`; la lógica del cursor en `src/lib/clase/editorFormula.ts`.
- **Referencias de colores** en la barra y en la hoja; **vista previa** del resultado; botón **Σ**
  para insertar funciones; en el celular, **fila de símbolos** (= ( ) ; : " $ …).
- Clic/toque en una celda agrega su nombre (y reemplaza la recién agregada, como Sheets); arrastrar
  con el mouse arma el rango; en el celular: celda, «:» y la otra celda. Tocar la letra de una
  columna agrega la columna de la tabla o sus datos (B2:B9).
- **Pistas por niveles:** qué función → sintaxis con huecos → respuesta.
- **Tablas con nombre:** la actividad declara `tablas: [{ nombre: "Turnos", rango: "A1:F9" }]` y el
  motor entiende `Turnos[Estado]`, la tabla entera (`Profesionales`) y `Turnos[@Estado]` (Excel;
  al acertar se avisa que Google Sheets no lo tiene). No se corren al copiar. `exigeTabla` en un
  reto obliga a usarlas.

## Pensado para Chromebooks

Los atajos del sistema y la app Archivos de ChromeOS son distintos a Windows: la lección los
compara y la parte 3 de la práctica de atajos es de Chromebook. La mecanografía permite «ignorar
tildes y ñ» por si el teclado está en inglés. Los emojis usan Noto Color Emoji (Google Fonts) para
verse también en equipos sin fuente de emojis.

## Clase a tu ritmo (para quienes faltaron)

La misma lección, pero cada estudiante la hace solo, en orden y con la explicación del profe en
cada diapositiva (campo `guia`). Al terminar envía su reporte al docente.

- **Contenido:** cada diapositiva puede tener `guia` (recuadro «El profe te explica») y `modo`
  (`"vivo"` o `"ritmo"`; sin `modo` va en las dos). `leccionPorSlug(slug, "ritmo")` da la versión
  a tu ritmo. El progreso de cada recorrido va aparte (contexto `ritmo:<id>`): el panel y el
  reporte solo cuentan lo que hizo en esa clase a tu ritmo. Un estudiante puede tener varias (de
  distintas lecciones o la misma dos veces); si se repite una lección, el panel muestra la fecha.
- **Quién la hace:** en *Clase en vivo › Clase a tu ritmo › Habilitar a estudiantes* se elige
  lección, grupo y estudiantes (vienen marcados los que no entraron a la clase en vivo). Se pueden
  agregar o quitar después desde el reporte. Modelos `AsignacionClase` y `RecorridoClase`.
- **Reglas:** no se salta diapositivas (máximo una más que la más lejana); las preguntas se
  responden para seguir; pasar una actividad sin terminar pide confirmación y queda pendiente.
- **Reporte:** `/admin/clase/ritmo/<id>`; los reportes nuevos aparecen en el Inicio del docente.
- Vista previa sin reporte: `/panel/clase?leccion=tics-1&modo=ritmo`.
- The Knick salió de la clase 1 y está en la clase 2 (`lecciones/tics2.ts`).
