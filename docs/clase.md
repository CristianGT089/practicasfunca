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
