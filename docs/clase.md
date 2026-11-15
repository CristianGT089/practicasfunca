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
- Pantallas: el contenido (`.lienzo-clase`, en globals.css) escala solo desde 1600 px de ancho
  (1,15 / 1,3 / 1,55 / 2); el zoom del presentador llega como `--zoom-manual` y se multiplica. En
  pantallas bajas (≤ 720 px de alto) se reducen los márgenes. Revisado sin desbordes a 1024, 1280,
  1366 y 1920 px.
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

## Datos

- `SesionClase`: lección, diapositiva actual, `maxima` (tope para los estudiantes), `llamado`, grupo (null = todos, solo admin).
- `AsistenciaClase`: última consulta y diapositiva de cada estudiante en la sesión.
- `ProgresoClase`: por usuario + lección + actividad (o pregunta). No depende de la sesión, así
  que si se desconecta o practica en casa lo retoma.

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
  a tu ritmo. El progreso (`ProgresoClase`) es el mismo en los dos modos.
- **Quién la hace:** en *Clase en vivo › Clase a tu ritmo › Habilitar a estudiantes* se elige
  lección, grupo y estudiantes (vienen marcados los que no entraron a la clase en vivo). Se pueden
  agregar o quitar después desde el reporte. Modelos `AsignacionClase` y `RecorridoClase`.
- **Reglas:** no se salta diapositivas (máximo una más que la más lejana); las preguntas se
  responden para seguir; pasar una actividad sin terminar pide confirmación y queda pendiente.
- **Reporte:** `/admin/clase/ritmo/<id>`; los reportes nuevos aparecen en el Inicio del docente.
- Vista previa sin reporte: `/panel/clase?leccion=tics-1&modo=ritmo`.
- The Knick salió de la clase 1 y está en la clase 2 (`lecciones/tics2.ts`).
