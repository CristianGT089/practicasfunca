# Turnero (sistema de turnos de atención)

Herramienta para practicar la operación de un **turnero** tipo droguería / EPS: emitir
turnos, clasificar el servicio, marcar atención prioritaria y llamar en orden desde varios
espacios de atención.

## Alcance y contexto de uso

- Se usa en una **sala de cómputo**, con varios computadores abiertos sobre **la misma
  cuenta de administrador**. No hay login de estudiantes ni rol estudiante.
- **No es un `Modulo`** de la plataforma: no tiene escenarios, checklist, vidas ni
  calificación. Es una **herramienta de administración**, al mismo nivel que "Estudiantes"
  o "Calificaciones".
- Práctica libre: no genera nota. La `SesionTurnero` guarda la actividad por si el profesor
  quiere revisarla, pero nada más.

## Nombre

El modelo `Turno` (prueba final: 5 escenarios encadenados) **no tiene relación** con esto.
Aquí el vocabulario es `Turnero` / `SesionTurnero` / `Espacio` / `Ticket`; en la interfaz
se dice "turno" y "espacio".

## Ubicación en el código

No va en `lib/nucleo/` (no es el motor de casos) ni en `lib/modulos/` (no es un área
clínica). Espacio propio de primer nivel:

```
src/lib/turnero/
  fila.ts       lógica pura: elegir el siguiente ticket de la cola (prioridad + FIFO)
  config.ts     servicios y categorías de prioridad por defecto
  eventos.ts    bus en memoria (EventEmitter) para el push en vivo
src/app/admin/turnero/
  page.tsx          CONTROL  — abre/cierra la sesión, ajusta nº de espacios,
                    "Llamar siguiente" por espacio, Atendido / No se presentó / Rellamar
  registro/         REGISTRO — kiosco a pantalla completa: botones por servicio + prioridad
  tablero/          TABLERO  — proyector/TV, solo lectura: LLAMANDO … cola … últimos llamados
  plantillas/       CRUD de configuraciones de turnero
src/app/api/turnero/
  sesiones/route.ts                 abrir sesión
  sesiones/[id]/route.ts            snapshot inicial · ajustar espacios · cerrar
  sesiones/[id]/stream/route.ts     SSE (tiempo real)
  sesiones/[id]/tickets/route.ts    emitir turno
  sesiones/[id]/llamar/route.ts     llamar siguiente en un espacio  { espacio }
  tickets/[id]/route.ts             atendido · no-show · rellamar
  plantillas/…                      CRUD
src/components/turnero/             TableroLlamado, ColaEspera, BotonServicio, …
```

En el nav de admin: separador **"Herramientas"** → **Turnero** (lleva a Control;
Registro / Tablero / Plantillas son sub‑pestañas).

## Modelo de datos

```prisma
enum ReglaPrioridad { ESTRICTA INTERCALADA }
enum EstadoSesionTurnero { ABIERTA CERRADA }
enum EstadoEspacio { LIBRE LLAMANDO ATENDIENDO PAUSA }
enum EstadoTicket { EN_ESPERA LLAMADO ATENDIDO NO_SE_PRESENTO }

model Turnero {                 // plantilla configurable
  id             String  @id @default(cuid())
  nombre         String
  numeroEspacios Int     @default(3)
  servicios      Json    // [{ codigo, nombre, prefijo }]  ej: { codigo:"MED", nombre:"Entrega de medicamentos", prefijo:"A" }
  categorias     Json    // editable; default: Gestante, Adulto mayor, Persona con discapacidad, Primera infancia
  reglaPrioridad ReglaPrioridad @default(ESTRICTA)
  activo         Boolean @default(true)
  creadoEn       DateTime @default(now())
  sesiones       SesionTurnero[]
}

model SesionTurnero {           // una corrida; cerrarla archiva la cola
  id             String  @id @default(cuid())
  turneroId      String
  turnero        Turnero @relation(fields: [turneroId], references: [id])
  numeroEspacios Int
  estado         EstadoSesionTurnero @default(ABIERTA)
  iniciadaEn     DateTime @default(now())
  cerradaEn      DateTime?
  espacios       Espacio[]
  tickets        Ticket[]
}

model Espacio {
  id             String  @id @default(cuid())
  sesionId       String
  sesion         SesionTurnero @relation(fields: [sesionId], references: [id], onDelete: Cascade)
  numero         Int
  nombre         String?
  estado         EstadoEspacio @default(LIBRE)
  ticketActualId String? @unique
  ticketActual   Ticket? @relation("TicketEnEspacio", fields: [ticketActualId], references: [id])
  @@unique([sesionId, numero])
}

model Ticket {
  id             String  @id @default(cuid())
  sesionId       String
  sesion         SesionTurnero @relation(fields: [sesionId], references: [id], onDelete: Cascade)
  codigo         String        // "A-047"
  servicioCodigo String
  prioritario    Boolean @default(false)
  categoria      String?       // código de la categoría de prioridad, si aplica
  estado         EstadoTicket  @default(EN_ESPERA)
  espacioNumero  Int?
  emitidoEn      DateTime @default(now())
  llamadoEn      DateTime?
  cerradoEn      DateTime?
  espacio        Espacio? @relation("TicketEnEspacio")
  @@index([sesionId, estado])
}
```

## Orden de la cola (`fila.ts`, función pura)

- **ESTRICTA**: `prioritario` primero, luego FIFO por `emitidoEn`.
- **INTERCALADA**: máximo 2 turnos normales seguidos; al tercero entra un prioritario si
  hay alguno esperando (evita dejar a los normales esperando indefinidamente).

`fila.ts` solo elige *cuál* es el siguiente ticket. **No** decide a qué espacio va.

## Asignación de espacio — MANUAL por ahora

En esta versión el turno **no se asigna solo**. Cada espacio tiene un botón
**"Llamar siguiente"** en la pantalla de Control; al pulsarlo:

1. `fila.ts` elige el siguiente `Ticket` en estado `EN_ESPERA`.
2. Ese ticket pasa a `LLAMADO`, se le pone `espacioNumero`, `llamadoEn`.
3. El `Espacio` pasa a `LLAMANDO` con `ticketActualId`.
4. Se emite el evento → el Tablero muestra "LLAMANDO A‑047 → Espacio 2".

Luego, sobre el ticket llamado: **Atendido**, **No se presentó** (ambos liberan el
espacio) o **Rellamar** (reemite el evento sin cambiar de estado).

> ### Pendiente: asignación automática (integración futura)
> Más adelante, al emitir un turno debería **auto‑asignarse** al siguiente espacio libre
> (round‑robin o el que lleve más tiempo desocupado), y el botón "Llamar siguiente" pasar a
> ser solo un override manual. Requiere: estado `LIBRE` fiable por espacio, política de
> reparto configurable en la plantilla (`reglaAsignacion`), y manejo del caso "no hay
> espacio libre" (el turno espera y entra cuando uno se desocupa). No implementado en esta
> versión.

## Tiempo real

La cola vive en Postgres; **cada pantalla es solo una vista**. Si el Registro emite un
turno, queda en la cola aunque el Tablero esté en otro computador.

Propagación:

1. El endpoint que muta (emitir / llamar / atender / cerrar) escribe en DB y llama a
   `eventos.emitir(sesionId)`.
2. `eventos.ts` mantiene un `EventEmitter` en el proceso Node.
3. `GET /api/turnero/sesiones/[id]/stream` es un **SSE**: al suscribirse manda el snapshot
   completo, y luego un snapshot nuevo cada vez que hay un evento de esa sesión.
4. Respaldo: el stream reenvía snapshot cada ~10 s aunque no haya eventos, y el cliente
   reconecta solo si se cae la conexión.

Encaja con el despliegue actual (un contenedor Node en el VPS). Si en el futuro se corre en
varias instancias, el `EventEmitter` en memoria hay que cambiarlo por `LISTEN/NOTIFY` de
Postgres (o Redis pub/sub); el resto no cambia.

## Configuración por defecto (`config.ts`)

```ts
SERVICIOS_DEFAULT = [
  { codigo: "MED", nombre: "Entrega de medicamentos", prefijo: "A" },
  { codigo: "ASE", nombre: "Asesoría / información",   prefijo: "B" },
  { codigo: "CAJ", nombre: "Pago / caja",              prefijo: "C" },
]
CATEGORIAS_PRIORIDAD_DEFAULT = [
  { codigo: "GESTANTE",    nombre: "Gestante" },
  { codigo: "ADULTO_MAYOR", nombre: "Adulto mayor" },
  { codigo: "DISCAPACIDAD", nombre: "Persona con discapacidad" },
  { codigo: "PRIMERA_INFANCIA", nombre: "Primera infancia" },
]
```

Ambas listas son **editables por plantilla** desde `/admin/turnero/plantillas`.
