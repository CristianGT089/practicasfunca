# Plan de mejoras — roles, simulación evaluada y práctica lúdica

Borrador del 2026-09-27, actualizado con las respuestas del usuario el mismo día. Nada de
esto está construido todavía.

## Nombres (aprobados)

- **Práctica virtual**: el estudiante solo, en el computador (casos con personas animadas).
- **Jornada presencial**: la práctica en vivo con turnero, ventanillas y compañeros
  haciendo de pacientes.

En el código, el modelo `Simulacion` corresponde a la **jornada presencial**, y los módulos
tipo CASOS (`Escenario`/`Intento`) a la **práctica virtual**. Primero se cambian los nombres
en la interfaz; renombrar el código es opcional.

## Dos formas de practicar (y por qué son distintas)

| | **Práctica virtual** | **Jornada presencial** |
|---|---|---|
| Qué es | El estudiante resuelve casos solo, frente a la pantalla | Una jornada real: turnero, ventanillas, compañeros haciendo de pacientes, docente presente |
| Hoy | Módulos tipo CASOS: Farmacia, Enfermería, Primera Infancia, Odontología | Simulación (turnero + Farmacia/Dispensario), Dispensación libre |
| Ve su nota | Sí, al terminar cada caso | **No durante la jornada.** Después, el reporte se revisa en clase con todos |
| Quién cierra | El estudiante | **El docente** finaliza la simulación |
| Cómo se califica | Automático: checklist + resultado (+ contenido en Odontología) | Por **caso atendido**: lo que el sistema puede verificar + lo que observa el docente |
| Rumbo | Hacerla lúdica: personas animadas, emociones, documentos (prototipo de la ventanilla) | Hacerla evaluable sin que el estudiante lo note |

## Decisiones tomadas

1. **Quién atiende en la jornada presencial:** la cuenta es del puesto y el docente indica
   desde el Control quién está sentado en cada puesto (opción B).
2. **Confirmación al finalizar:** como el docente puede olvidar cambiar al estudiante al
   rotar, al finalizar aparece una vista *"A este paciente lo atendió…"*, con el estudiante
   de cada atención ya precargado y editable. La calificación se calcula después de
   confirmar.
3. **Pacientes:** los interpretan otros estudiantes, con las recetas impresas que ya genera
   la jornada. No hace falta modelarlos como usuarios.
4. **El docente maneja todo desde el celular o el computador:** Control, asignación de
   puestos, confirmación y reporte deben ser responsive.
5. **Reporte para la clase:** además de la nota individual, un reporte de todos los casos
   atendidos para repasarlo en grupo: qué se hizo bien, qué se hizo mal y por qué.
6. **Participantes extra en la jornada:** se puede agregar gente que no está en el grupo
   (estudiantes que llegan de otro grupo, invitados).
7. **El docente elige el enfoque del día:** marca qué situaciones quiere practicar (fórmula
   vencida, se niega a dar la cédula, suplantación…) y el sistema arma los casos con eso.
8. **Un docente puede tener varios grupos**, y cada docente tiene acceso a las dos
   modalidades (virtual y presencial) de sus áreas.
9. **Reporte anónimo por defecto:** muestra los casos y cómo se resolvieron, sin nombres;
   el docente puede activar "mostrar quién atendió".
10. **Nota de 0 a 100**, leída como porcentaje de acierto, igual que en la práctica virtual.
11. **Invitados sin registro:** basta con el nombre. Se pueden agregar en cualquier momento
    de la jornada, incluso después de que ya hayan pasado varios estudiantes.
12. **Quién crea a quién:** coordinación (admin) crea a los docentes; el docente crea a sus
    estudiantes y grupos.
13. **Casos normales:** el sistema propone una mezcla por defecto (por ejemplo, un tercio de
    casos normales) y el docente la puede cambiar.
14. **Áreas a futuro:** además de Farmacia, Dispensación, Enfermería, Primera Infancia y
   Odontología, vendrán jornadas de toma de historia clínica (odontológica, de enfermería),
   Administrativo en Salud y Seguridad y Salud en el Trabajo. Todavía se está hablando con
   los docentes. El diseño debe permitir sumar áreas sin rehacer el núcleo.

## Fase 1 — Roles y segmentación (la base de todo lo demás)

Hoy solo existen `ESTUDIANTE` y `ADMIN`, y cualquier admin ve todos los módulos.

1. **Tres roles:** `ESTUDIANTE`, `DOCENTE`, `ADMIN`.
   - **Admin:** coordinación. Crea usuarios, módulos, grupos y docentes; ve todo.
   - **Docente:** ve y administra solo sus módulos o grupos: casos, simulaciones,
     calificaciones y estudiantes. Un docente de Farmacia no ve Odontología.
   - **Estudiante:** su panel, sus casos y, si el docente lo permite, sus resultados.
2. **Grupos (cohortes):** por ejemplo "Técnico en Farmacia, sábado 2026-2", con sus
   módulos, docentes y estudiantes. Un docente puede tener varios grupos. El admin crea
   docentes; el docente crea sus estudiantes y grupos. Reemplaza o complementa la matrícula suelta por módulo,
   y permite ver las calificaciones por grupo.
3. **Permisos en el servidor, no solo en la interfaz:** cada endpoint de admin pasa a
   verificar "¿este docente tiene acceso a este módulo o grupo?". Hoy `requireAdmin` es
   todo o nada.
4. **Interfaz por rol:**
   - Inicio del docente: *Mis grupos · Mis simulaciones · Calificaciones · Casos*.
   - El menú de admin se arma según lo que el usuario puede ver (ya se arma desde
     `registro.ts`; falta filtrarlo por permisos).
   - El estudiante no ve módulos en los que no está.
5. **Migración:** los admins actuales quedan como admin; se crean los docentes y se
   asignan a sus módulos.

## Fase 2 — Jornada presencial evaluada

### 2.1 Saber quién atendió cada caso

Hoy cada entrega queda a nombre de la **cuenta del puesto** ("Dispensación 1"), no del
estudiante. Decidido: la cuenta sigue siendo del puesto, y en el **Control** el docente
indica quién está sentado en cada puesto ("Puesto 2 → Laura M."). Cada atención queda a
nombre del estudiante asignado en ese momento; rotar es cambiar el nombre en el Control,
sin cerrar sesión.

- **Participantes de la jornada:** los estudiantes del grupo, más los que el docente
  agregue en el momento. Pueden ser estudiantes registrados de otro grupo o invitados solo
  con nombre.
- **Confirmación al finalizar:** lista de atenciones (turno, paciente, puesto, hora) con el
  estudiante precargado y un selector para corregirlo.

### 2.2 Registrar la atención completa, sin mostrar nada

- Una **Atención** = turno + paciente + estudiante + todo lo que hizo (búsquedas,
  verificación de identidad, renglones entregados o rechazados, cuota cobrada, tiempos).
- En modo evaluado **se ocultan las pistas y correcciones en pantalla**. Hoy, por ejemplo,
  el dispensario revela si el estudiante acertó con el alto costo después de cobrar. Eso
  sirve en práctica libre, pero delata la respuesta en una evaluación.

### 2.3 El docente elige las situaciones del día

Hoy el generador sortea pacientes (con suplantación, alto costo, etc. por probabilidad).
Se reemplaza por un **catálogo de situaciones por área** que el docente marca al crear la
jornada. Por ejemplo, en Farmacia/Dispensación:

fórmula vencida · se niega a dar la cédula · suplantación · tercero autorizado ·
alergia · alto costo (exento de cuota) · sin existencias · cantidad tachada ·
fórmula de médico particular · excede lo autorizado

El docente marca las que quiere y cuántos pacientes en total. El sistema garantiza que
cada situación marcada aparezca y completa con algunos **casos normales**, para que el
estudiante no asuma que todo paciente trae un problema. Cada paciente generado guarda qué
situación tiene: es la "respuesta" con la que se califica y se explica en el reporte.

**El mismo catálogo sirve para la práctica virtual:** cada caso virtual se etiqueta con
sus situaciones, y el docente puede asignar a su grupo "los casos de fórmulas vencidas".

### 2.4 Rúbrica por caso atendido

- **Lo que verifica el sistema:** identidad, qué entregó y cuánto, bloqueos respetados,
  cuota correcta, alergias, tiempo de atención. Se puede reusar `reglas.ts` de
  Dispensación, que ya conoce la respuesta correcta de cada renglón.
- La nota del caso sale de lo que verifica el sistema.
- *A futuro, según lo que opinen los docentes:* una lista corta en el celular para calificar
  en vivo lo que el sistema no ve (trato, comunicación, explicación al paciente) por cada
  atención, y que se sume a la nota.

### 2.5 El docente finaliza y califica

1. Botón **Finalizar jornada** (del docente): cierra el turnero y congela las atenciones.
2. **Confirmar quién atendió a quién** (ver 2.1).
3. Se calcula la calificación de cada atención.
4. **Reporte:**
   - **Para la clase:** caso por caso, qué situación traía el paciente, qué se hizo, si
     estuvo bien o mal y por qué. Pensado para proyectarlo y repasarlo en grupo.
   - **Por estudiante:** casos que atendió y su nota.
   - **Resumen:** errores más comunes de la jornada.
   - Exportable a PDF o Excel para el registro del docente.

## Fase 3 — Práctica virtual lúdica (la ventanilla)

Base: el prototipo `ventanilla-farmacia` (capas, frames, burbujas, respuestas en escena,
documentos clicables, ánimo).

1. **Motor de escena reutilizable:** un componente con fondo, persona, primer plano,
   burbuja, panel de respuestas y documentos sobre el mostrador. Cada módulo aporta su
   escenario: mostrador de farmacia, cama de hospital, silla odontológica, sala de
   valoración.
2. **Personajes como datos:** un `Personaje` con sus frames (base, hablando, parpadeo,
   entregando documento, se niega, emociones). Se asigna a cada paciente de los casos, y un
   banco genérico por edad y género sirve a los pacientes generados.
3. **Guion de diálogo por caso:** frases del paciente y respuestas del estudiante (empática,
   neutra, brusca) con su efecto en el ánimo y en la información que entrega. Editable desde
   el admin del caso.
4. **Ánimo y trato en la nota:** un componente "Trato al paciente" de 10 a 15 %, separado de
   la decisión clínica. La decisión correcta puede molestar al paciente; lo que se evalúa es
   cómo se maneja.
5. **Integrar con los casos que ya existen:** primero Farmacia (cédula, receta física y
   `actitudCedula` ya existen en la base), luego Enfermería, Primera Infancia y Odontología.
6. **Flujo de imágenes:** convención de nombres, carga desde el admin, recorte de fondo y
   conversión a WebP automáticos. La lista de frames por personaje sale del prototipo.
7. **Accesibilidad:** todo el texto dentro de la escena (ya resuelto en el prototipo),
   "reducir movimiento" y voz opcional.

## Fase 4 — Cierre de lo que ya existe

- **Odontología:** revisión con el docente del área (convención de exodoncia quirúrgica,
  pesos de la nota, casos reales del programa). Commit de la rama `feat-odontologia`.
- **Pruebas automáticas** para la lógica de calificación (checklist, odontograma, cuota
  moderadora, reglas de Dispensación). Hoy no hay pruebas.
- **Datos personales:** las notas de estudiantes son datos personales (Ley 1581): definir
  quién ve qué y por cuánto tiempo se guardan.
- **Limpieza pendiente:** renombrar usuario, base de datos y volumen de Docker
  (`farmacia` → `practicas-funca`) con migración del volumen.

## Orden sugerido

1. **Fase 1 (roles).** Sin ella, la simulación evaluada no sabe qué docente califica a qué
   grupo.
2. **Fase 2 (jornada presencial evaluada)**, empezando por 2.1 y 2.2: sin saber quién atendió,
   nada de lo demás sirve.
3. **Fase 3 (lúdica)** en paralelo con la diseñadora: mientras ella produce personajes, se
   construye el motor de escena con Farmacia.
4. **Fase 4** a medida que avanza lo demás.

## Pendientes a futuro (no entran en las fases de arriba)

- **Rúbrica en vivo del docente** desde el celular (trato, comunicación), si los docentes la
  consideran útil.
- **Integración con la plataforma educativa** de FUNCA (usuarios, grupos y notas).

## Estado de avance

Se actualiza a medida que se construye cada parte.

- **Fase 1 — hecha.** Rol `DOCENTE`, modelo `Grupo`, permisos en el servidor
  (`lib/nucleo/permisos.ts`, `lib/simulacion/permisos.ts`), páginas Docentes (solo
  coordinación) y Grupos, Estudiantes con grupos, menú de administración por rol. Un docente
  gestiona los módulos en los que está matriculado. Usuarios de demostración en el seed:
  `docente_farmacia` y `docente_odonto` (contraseña `docente123`).
- **Fase 2 — hecha.** Situaciones del día, participantes e invitados, ventanillas,
  finalizar, confirmar quién atendió, calificar y reporte (repaso en clase anónimo por
  defecto, notas por estudiante, CSV). Dispensario y Farmacia (mostrador: la venta queda a
  nombre del paciente del turno; no vender cuenta como rechazar). Ver `docs/simulacion.md`.
- **Jornada presencial de Odontología — primera versión.** Casos elegidos por el docente,
  tarjetas para quien interpreta al paciente, consultorio con historia y odontograma en una sola
  página (se guarda sola), unidades, confirmación, calificación y reporte con el odontograma
  comparado. Ver `docs/odontologia.md`. Ideas pendientes al final de ese documento.
- **Fase 3 — base hecha.** Componente de escena genérico, personas y escenas en código,
  `Escenario.personaje` y `Escenario.guion`, trato al paciente (15 % de la nota), editor
  "Persona y diálogo" para docentes, integración en Farmacia, Gloria en dos casos de
  Diazepam. Ver `docs/escena.md`. Falta: más personas (imágenes de la diseñadora), frames
  de emociones de Gloria, y llevar la escena a Enfermería, Primera Infancia y Odontología.
- **Fase 4 — en parte.** 29 pruebas automáticas (`npm test`): situaciones, evaluación de
  jornada (dispensario y farmacia), odontograma, guion y trato. Pendiente de personas:
  revisión de Odontología con su docente, política de datos personales (ver abajo),
  renombrar la base y el volumen de Docker.
## Datos personales (borrador para revisar con coordinación)

Las notas y el desempeño de los estudiantes son datos personales (Ley 1581 de 2012). Lo que
hace hoy el sistema, para tenerlo en cuenta:

- Un docente solo ve a los estudiantes de sus grupos y a los que él creó; coordinación ve
  a todos.
- El reporte de una jornada se proyecta sin nombres por defecto.
- Los invitados de una jornada quedan solo con su nombre en el reporte de ese día.
- Los pacientes son ficticios (bancos de nombres y cédulas generadas); se borran al cerrar
  la jornada.

Falta decidir: cuánto tiempo se guardan las notas y los reportes, y quién puede exportarlos.
