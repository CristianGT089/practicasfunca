# Módulo Odontología — historia clínica y odontograma

Módulo de tipo **CASOS** (usa el motor de escenarios: vidas, modo fácil/difícil, turnos).
Digitaliza el formato en papel *Historia Salud Oral* de FUNCA; el foco es el **odontograma**.

## Qué hace el estudiante

1. **Consultorio** (columna izquierda): cada botón registra una acción y revela información
   del caso. Nada del caso viaja al navegador antes de pedirlo
   (`GET /api/modulos/odontologia/intentos/[id]/consultorio`).
   - Interrogar → motivo de consulta y relato (enfermedad actual, antecedentes, hábitos).
   - Examen clínico → relato del examen + hallazgos dentales **generados del odontograma
     esperado** (fácil: con número FDI; difícil: solo el nombre anatómico).
   - Revelador de placa → superficies teñidas (índice de O'Leary).
   - Radiografía → hallazgos que solo se ven en rayos X (endodoncia realizada, núcleos,
     dientes sin erupcionar). En modo difícil, una radiografía que el caso no necesita
     cuesta un corazón.
2. **Historia** (pestañas): todas las secciones del formato (I a XVI). Se guarda como una
   foto completa en cada `GUARDAR_HISTORIA`; al volver al caso se recupera la última.
3. **Cerrar historia**: elige la conducta (atender en consulta / remitir a especialista /
   interconsulta médica) = resultado del escenario.

## Odontograma

- Numeración FDI, 5 caras por diente (V, L/P, M, D, O/I). La mesial siempre mira a la línea
  media; en superiores la vestibular va arriba, en inferiores abajo (igual que el papel).
- 22 convenciones (`HALLAZGOS` en `src/lib/modulos/odontologia/odontograma.ts`). Las de cara
  se marcan en la superficie: caries (relleno rojo), **resina** (relleno azul) y **amalgama**
  (guion horizontal negro). Las de diente completo se dibujan encima o en la franja de la raíz;
  entre ellas **prótesis removible** (guion azul en la franja: en dientes seguidos forma una
  barra) e **implante** (I azul).
- Cambio de octubre de 2026: se quitaron "obturado buen estado" y "obturado mal estado". Lo
  guardado antes con esos códigos se lee como resina y amalgama, respectivamente (también en
  los casos de ejemplo).
- Exclusiones: una cara = un hallazgo; sano/ausente/sin erupcionar excluyen lo demás, salvo
  que ausente convive con prótesis removible e implante (lo que reemplaza al diente perdido);
  buen vs. mal estado del mismo elemento se reemplazan; resto radicular borra las caras.
- **Exodoncia quirúrgica**: el formato usa la misma X roja que la simple; para distinguirlas
  se agrega una **Q** roja en la franja. Ajustar si el programa usa otra convención.

### Uso del odontograma

- **Pantalla táctil o angosta** (celular, tablet): tocar un diente abre su **ficha** en grande,
  donde se elige la cara (tocándola o con los botones V/L/M/D/O) y el hallazgo. Las flechas ← →
  pasan al diente vecino sin cerrar, para dictar rápido. En computador se mantienen la paleta y
  el clic derecho.
- **Teclado**: con el odontograma enfocado, las flechas recorren los dientes, Enter abre la
  ficha, Supr borra el diente y Ctrl+Z deshace.
- **Acciones**: Deshacer (hasta 50 pasos), *Marcar el resto como sano* (no se califica; en la
  mixta solo marca un diente si su par ya consta como ausente o sin erupcionar) y *Borrar todo*,
  con confirmación.
- **Dentición mixta**: si un temporal y su permanente (55 y 15) tienen marcas de presentes,
  aparece un aviso con arreglo de un clic (permanente sin erupcionar o temporal ausente). No se
  corrige solo porque eso alteraría lo que se califica.

## Calificación (`calificacion.ts`)

| Componente | Peso |
|---|---|
| Proceso (checklist: interrogar, examinar, revelador, radiografía, cerrar) | 10 |
| Odontograma | 45 |
| Alerta médica | 10 |
| Antecedentes (IV y V) | 10 |
| Exámenes (VI y VII) | 5 |
| Índice de placa (mitad pintar, mitad calcular el % ±1) | 10 |
| Remisión | 10 |

Odontograma: `(aciertos + ½·cara equivocada) / (esperadas + marcas de más)`. "Sano" no se
califica. Los componentes que el caso no evalúa (ej. sin placa) se excluyen del promedio.
Diagnóstico, pronóstico, plan y evolución son texto libre: el docente los lee en
**Admin → Odontología → Historias diligenciadas**.

Peligro clínico (cuesta un corazón al cerrar): indicar una extracción en un paciente
anticoagulado o con discrasia sin registrarlo en la alerta médica; cerrar sin examinar.

## Casos

- Admin → Odontología → **Casos (odontograma)**: el docente dibuja la respuesta con el mismo
  odontograma y la misma cuadrícula de O'Leary; ve la vista previa de lo que leerá el
  estudiante. El checklist de proceso se genera solo (`pasos.ts`).
- Seed: 4 casos (`prisma/seed-odontologia.ts`): tutorial adulto, adulto mayor anticoagulado
  (interconsulta), niña con dentición temporal, joven con pulpitis y cordales sin erupcionar.

## Motor

Se agregó al contrato de módulos un gancho opcional `calificar()`: si un módulo lo
implementa, `finalizar` lo usa en vez del checklist genérico, y el GET del intento lo
reutiliza para mostrar la revisión de un intento ya completado. Los demás módulos no cambian.

## Jornada presencial de Odontología (historia clínica en vivo)

Además de la práctica virtual, hay una **jornada presencial** (`Simulacion.tipo = ODONTOLOGIA`):

- **Preparar:** el docente crea la jornada con su grupo, elige qué casos se atienden ese día (los
  mismos de Odontología → Casos) y cuántas unidades (sillas) se usan. Descarga las **tarjetas de
  pacientes** (PDF, `lib/modulos/odontologia/tarjetasPdf.ts`): una por caso, con lo que cuenta el
  paciente y, en bloques aparte, lo que "se ve" al examinarlo, al aplicar revelador y en la
  radiografía. Cada bloque se muestra solo cuando el estudiante hace lo que corresponde.
- **En vivo:** cada computador de unidad entra al **consultorio** (`/panel/odontologia`; las cuentas
  de los computadores se crean desde la jornada y entran directo ahí). El estudiante busca al
  paciente por su documento, abre la historia y la redacta en una sola página con el odontograma
  incluido; se guarda sola. Al terminar la cierra y firma eligiendo la conducta. No ve nota ni pistas.
- **El docente** indica quién está en cada unidad (al rotar) y ve qué historias están en curso.
- **Al finalizar:** confirma quién atendió a quién, califica (misma revisión que la práctica
  virtual, sin el componente de proceso) y proyecta el reporte: por caso, la historia del
  estudiante y su odontograma al lado del correcto.

Código: `lib/modulos/odontologia/jornada.ts` (consultorio), `api/modulos/odontologia/jornada/*`,
`lib/simulacion/jornada.ts#calificarAtencionOdontologia`, `components/admin/jornada/ControlOdontologia.tsx`.

### Ideas pendientes para la jornada de Odontología

- **Modo "boca real":** atender a un compañero sin tarjeta; no hay respuesta previa, así que la
  historia la revisa el docente con una rúbrica (se conecta con la rúbrica en vivo del plan).
- **Rúbrica en vivo del docente** desde el celular: presentación, bioseguridad (guantes,
  tapabocas), orden del interrogatorio, trato al paciente.
- **Firma del paciente** en la evolución (el compañero firma en la pantalla) y sello del docente.
- **Radiografía como imagen** en vez de texto, cuando haya radiografías de práctica.
- **Tiempo por historia** en el reporte (desde que abrió hasta que cerró).

## Casos de ejemplo y clic derecho

- **Casos de ejemplo:** `lib/modulos/odontologia/casosEjemplo.ts` tiene 5 casos de práctica virtual
  y 5 solo para jornadas presenciales (`soloTurno`: no salen en la práctica virtual, para que no
  se conozcan antes). Para crearlos en una base sin seed (producción):
  `npm run casos:odontologia` (en Docker: `docker compose exec app npm run casos:odontologia`).
  Crea el módulo si falta, omite los casos que ya existen y no toca usuarios.
- **Clic derecho en el odontograma:** abre un menú con lo que puede tener esa cara (caries,
  obturaciones) y el diente completo, marcando con ✓ lo que ya tiene. En celulares Android se
  abre manteniendo presionado.

## Pacientes reales (boca real)

Al crear la jornada de Odontología se elige **"Pacientes reales"** en vez de casos con tarjeta:

- Los estudiantes se examinan en parejas. En el consultorio **registran al compañero**
  (datos mínimos: nombre, documento, fecha de nacimiento, sexo, EPS, ocupación; sin dirección
  ni teléfono) y marcan su **consentimiento**; sin él no se abre la historia.
- Redactan la historia y el odontograma con lo que ven en boca. No hay nota automática.
- Al finalizar, el docente abre cada historia (solo lectura) y la califica con la **rúbrica**
  (`lib/modulos/odontologia/rubrica.ts`): historia completa, odontograma coherente, alerta y
  antecedentes, bioseguridad y trato; cada uno Cumple / Parcial / No cumple, más un comentario.
- Al **calificar y cerrar** se borran la historia, los datos del compañero y su documento; queda
  el nombre abreviado ("Laura M."), la nota y el comentario.

## Cuentas de los computadores

Al **iniciar** cualquier jornada se crea una cuenta por espacio ("Ventanilla 1", "Unidad 2"...)
con su contraseña, que se muestra en ese momento. Cada cuenta entra directo a su pantalla y ya
sabe qué espacio es (`Usuario.espacioNumero`).

- **Ver contraseñas:** el docente las vuelve a ver cuando quiera, confirmando **su propia
  contraseña**. Se guardan cifradas (AES-256-GCM con una clave derivada de `AUTH_SECRET`,
  `lib/nucleo/cifrado.ts`), solo para estas cuentas de computador, y se borran con ellas al
  cerrar la jornada. Si cambia `AUTH_SECRET`, ya no se pueden descifrar: hay que generar nuevas.
- **Generar contraseñas nuevas:** crea otras sin sacar a los computadores que ya entraron.

## Dictado

Tercera forma de jornada presencial de Odontología (además de casos con tarjeta y pacientes
reales). El docente lee un caso en voz alta y **todo el grupo lo registra a la vez, cada uno con
su propia cuenta**; cada estudiante recibe su nota.

- **Crear** (Jornadas presenciales → Nueva jornada → *Dictado*): qué se dicta (*solo el
  odontograma* o *la historia completa*: alerta, antecedentes, exámenes y odontograma) y de dónde
  sale el caso: *al azar* (vista previa, "Otro al azar", se puede retocar), *lo marco yo*
  (odontograma y grillas en el mismo asistente) o *un caso creado*. El paciente (nombre,
  documento) se inventa. Los casos creados para un dictado quedan inactivos con el título
  `Dictado: …` y no aparecen en Odontología → Casos.
- **Iniciar**: no se crean cuentas de computadores ni turnero. Los estudiantes del grupo ven
  "Tienes un dictado en curso" en `/panel` y entran a `/panel/dictado` (paciente ya cargado,
  solo las secciones dictadas, guardado automático).
- **Mientras dicta**: el docente tiene el guion en orden de dictado (por cuadrantes, con las
  caras por nombre), marca cada línea al leerla y ve cuántas marcas de lo ya dictado tiene bien
  cada estudiante. *Pausar* bloquea la escritura de todos; *Terminar dictado* entrega las
  historias como estén, califica y cierra (no hay paso de confirmación).
- **Nota**: solo lo dictado. Odontograma (igual que en la práctica virtual: marcas de más
  bajan la nota); con historia completa también alerta, antecedentes y exámenes. No hay placa
  ni conducta.
- **Reporte**: además de las notas y los errores comunes, un **mapa por diente**: el
  odontograma del caso con cada diente en verde/ámbar/rojo según qué porcentaje del grupo lo
  registró exacto.

Código: `dictado.ts` (puro: caso al azar, guion, avance, mapa), `dictadoJornada.ts` (base de
datos), `/api/modulos/odontologia/dictado` (estudiante), `/api/simulaciones/[id]/dictado`
(docente: estado, pausar, terminar). Por ahora solo Odontología (ver CLAUDE.md).

## Tarifario oficial y plan de tratamiento

- `src/lib/modulos/odontologia/tarifario.ts`: el capítulo completo de **Servicios
  Ambulatorios de Salud Oral** del Manual Tarifario SOAT (Decreto 780 de 2016, Anexo
  Técnico 1; antes Decreto 2423 de 1996): 83 procedimientos, códigos 36100–36908, con las
  tarifas en UVB de la **Circular Externa 047 de 2025** de MinSalud (vigencia 2026).
  Verificado código por código contra el texto de la circular.
- Valor en pesos = UVB × valor de la UVB del año, redondeado a la centena. UVB 2026 = $12.110
  (Resolución 3488 de 2025, MinHacienda). **Cada enero**: actualizar `UVB_VIGENTE` y, si
  MinSalud publica una circular nueva, las tarifas.
- En la historia (sección XV, Plan de tratamiento): *Sugerir desde el odontograma* arma el
  plan con los códigos oficiales (caries → resina de fotocurado por superficies; endodoncia
  según raíces + 2 periapicales; exodoncias simple/vía abierta/temporal; sellantes; coronas y
  núcleos en mal estado; siempre el examen de primera vez). *+ Del tarifario* busca por código
  o palabra. Es una sugerencia editable: no se califica.
- Consulta para docentes: Contenido → Odontología → Tarifario oficial.
