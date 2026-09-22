# Simulación

Envoltorio de una jornada de práctica completa: el admin da una lista de nombres de
estudiantes, el sistema **genera un pool de pacientes** (historia clínica + receta, a
partir del catálogo real) y todo corre sobre un **turnero** — el estudiante busca por
cédula en su ventanilla (Farmacia o Dispensario) y atiende lo que le vayan llamando.

No reemplaza `Turno` (prueba final de escenarios) ni el `turnero` de mostrador libre — es
un tercer modo, más guiado, para una jornada de clase completa.

## Decisiones ya tomadas con el usuario

1. **Pool de pacientes, no 1-a-1 con estudiantes.** Se generan N pacientes; los
   estudiantes (en sus puestos) atienden lo que el turnero les llame — no hay una
   asignación fija estudiante↔paciente.
2. **Cédula no encontrada en el turnero → se rechaza al sacar el turno.** Solo se puede
   sacar turno con una cédula que corresponda a un paciente generado para esa simulación.
3. **Cuota moderadora real, con exención por diagnóstico de alto costo**, en el
   Dispensario (que hasta ahora era 100% gratis). Tarifas 2026 (fuente:
   [saludtotal.com](https://saludtotal.com.co/plan-de-beneficios-en-salud/cuotas-moderadoras-copagos-y-upc-en-2026/)):

   | Categoría del afiliado | Cuota moderadora |
   |---|---|
   | Subsidiado (Sisbén A/B) | Exento |
   | Contributivo A (< 2 SMMLV) | ~$5.000 fijo |
   | Contributivo B (2–5 SMMLV) | 17,3% |
   | Contributivo C (> 5 SMMLV) | 23% |
   | Cualquier categoría, diagnóstico de alto costo | Exento |

   Aplica **una vez por atención** (no por renglón) — es lo que dice la fuente
   ("por cada consulta o medicamento"), simplificado a "por visita" para no complicar el
   checklist. El monto es informativo/mostrado en pantalla; no hay pasarela de pago real.

4. **Revisión antes de abrir.** El generador produce un borrador; el admin lo ve en una
   lista, puede regenerar o editar un caso puntual, y solo entonces "abre" la simulación
   (a partir de ahí se puede sacar turno).

## Decisión de arquitectura nueva (no se le preguntó explícitamente, documentada aquí)

**El stock y las autorizaciones son compartidos por toda la simulación, no por
estudiante.** A diferencia de la práctica libre de Dispensación (`SesionDispensacion` por
`usuarioId`, aislada), acá varios estudiantes atienden la MISMA jornada — si un estudiante
agota el stock de un medicamento, debe verse agotado para todos los demás también (es una
sola farmacia compartida ese día, no N prácticas paralelas). Por eso el consumo se
contabiliza por `simulacionId`, no por usuario — ver modelo `EntregaSimulacion` abajo.

## Modelo de datos

Reusa lo que ya existe en vez de duplicar:

- **`Paciente`** (cédula, edad, alergias, antecedentes) — se extiende con `diagnostico`,
  `esAltoCosto`, `categoriaAfiliado` y `simulacionId` (nullable: null = paciente
  sembrado/permanente de siempre; con valor = generado para esa simulación, se borra con
  ella).
- **`RecetaElectronica`** (paciente, medicamento, cantidadAutorizada, vigencia) — el
  generador crea una o varias por paciente, contra medicamentos `CATALOGO_REAL`. Así toda
  la lógica de Dispensación que ya existe (`buscarPaciente`, `evaluarRenglon`: vencida,
  agotada, alergia...) funciona sin tocarla.
- **`Ticket`** (turnero) gana `pacienteId` (nullable — los turnos del turnero de mostrador
  normal, sin simulación, lo dejan vacío).

Nuevo:

```prisma
enum TipoSimulacion { FARMACIA DISPENSARIO }
enum EstadoSimulacion { BORRADOR ABIERTA CERRADA }
enum CategoriaAfiliado { SUBSIDIADO CONTRIBUTIVO_A CONTRIBUTIVO_B CONTRIBUTIVO_C }

model Simulacion {
  id              String @id @default(cuid())
  nombre          String
  tipo            TipoSimulacion
  estado          EstadoSimulacion @default(BORRADOR)
  turneroId       String            // Turnero (plantilla) que se usa para esta simulación
  sesionTurneroId String?  @unique  // la SesionTurnero, una vez abierta
  creadaEn        DateTime @default(now())
  abiertaEn       DateTime?
  cerradaEn       DateTime?

  pacientes Paciente[]              // los generados (Paciente.simulacionId)
  entregas  EntregaSimulacion[]
}

// Consumo COMPARTIDO por simulación (no por estudiante) contra una RecetaElectronica.
model EntregaSimulacion {
  id                  String @id @default(cuid())
  simulacionId        String
  recetaElectronicaId String
  usuarioId           String            // quién la hizo, solo para trazabilidad/informe
  cantidad            Int
  resultado           ResultadoEntrega  // reusa el enum de Dispensación
  cuotaModeradora     Int               // lo cobrado (0 si exento), informativo
  creadoEn            DateTime @default(now())
}
```

`Paciente` gana: `diagnostico String?`, `esAltoCosto Boolean @default(false)`,
`categoriaAfiliado CategoriaAfiliado?`, `simulacionId String?`.

## El generador (`lib/simulacion/generador.ts`)

Entrada: nombres de participantes + cuántos pacientes generar + tipo.

Por paciente:
1. Nombre + cédula (10 dígitos, sin chocar con `Paciente.cedula` existente) + edad
   + `categoriaAfiliado` (aleatorio, con `SUBSIDIADO` más probable — refleja la
   distribución real) + alergias (0–2, de un banco de tags que ya usa `Medicamento.tags`).
2. `diagnostico`: aleatorio de dos bancos — común (gripe, hipertensión, control
   prenatal...) o de una lista fija de **alto costo** (cáncer, VIH, insuficiencia renal
   crónica, epilepsia, artritis reumatoide — la lista real de la Cuenta de Alto Costo) con
   baja probabilidad; si sale de esta lista, `esAltoCosto = true`.
3. Receta: 1–3 renglones, eligiendo medicamentos `CATALOGO_REAL` con stock > 0 al momento
   de generar (evita crear de entrada un caso imposible), cantidad autorizada razonable,
   médico/fecha/vigencia inventados. Vigencia: si la fecha de vencimiento del lote ya
   pasó, la receta queda vencida a propósito (es un caso de práctica válido); si no, se le
   da una vigencia normal.

El admin puede, en la pantalla de revisión, "regenerar" un paciente puntual (vuelve a
tirar los pasos 1–3 para ese cupo) o editar campos sueltos antes de abrir.

## Fases de construcción

1. ✅ Esquema + generador + pantalla de revisión/apertura. `/admin/simulacion` (lista +
   crear borrador) y `/admin/simulacion/[id]` (revisar, regenerar, abrir/cerrar).
2. ✅ Turnero: `Ticket.pacienteId`, validar cédula contra la simulación al sacar turno.
   `/admin/turnero/registro` pide cédula cuando `snapshot.sesion.simulacionId` existe.
3. ✅ Pantalla de dispensación: cuota moderadora (con exención de alto costo) al atender.
   Nuevo módulo `lib/simulacion/dispensario.ts` + rutas
   `/api/modulos/dispensacion/simulacion/{buscar,dispensar}`; `/panel/dispensacion`
   cambia a "modo simulación" automáticamente cuando el turno activo del espacio trae
   `paciente` (lo reporta `PanelMiEspacio` vía `onEstado`), mostrando el paciente del pool
   en vez de la secuencia de `CasoDispensacion` y registrando el consumo en
   `EntregaSimulacion` (compartido por simulación, no por estudiante).

   **Corrección importante (pedida por el usuario):** la exención NO la calcula el sistema
   solo — `Paciente.esAltoCosto` no se revela en `buscarPacienteSimulacion` hasta que ya se
   decidió. El estudiante lee el `diagnostico` y marca él mismo, con un checkbox, si
   califica como alto costo; esa marca (`altoCostoMarcado`, enviada a
   `dispensarRenglonSimulacion`/`rechazarRenglonSimulacion`) es la que calcula la cuota
   realmente cobrada — se guarda en `EntregaSimulacion.altoCostoMarcado` en la primera
   entrega del paciente en la simulación (`decidirCuota`). Una vez cobrada, la pantalla
   revela si acertó comparando contra la verdad del sistema. El cálculo puro (sin Prisma)
   vive en `lib/simulacion/cuotaModeradora.ts` para poder importarlo también en el cliente
   (vista previa en vivo mientras el estudiante decide, antes de cobrar).
4. ✅ PDF de la receta generada, imprimible. `lib/simulacion/recetaPdf.ts` (jsPDF, client-side)
   genera un PDF con una página por paciente (fórmula + datos clínicos), descargable desde
   "Descargar recetas (PDF)" en `/admin/simulacion/[id]`, para repartir físicamente en clase.
5. ✅ Tercero autorizado vs. suplantación en la verificación de identidad. Decisión con el
   usuario: un tercero autorizado **no bloquea**, solo genera una ALERTA que el estudiante
   puede pasar si verifica el parentesco/justificación; una suplantación sí bloquea, igual
   que antes. `Paciente` gana `tipoRecogida` (`EL_MISMO` default / `TERCERO_AUTORIZADO` /
   `SUPLANTACION`), `personaRecogeNombre/Cedula/Relacion`; el generador los produce con
   ~20% de probabilidad (30% de esos casos es suplantación). `evaluarRenglon` gana un
   parámetro opcional `terceroAutorizado` que baja el aviso de identidad de BLOQUEO a
   ALERTA — los llamadores que no lo pasan (práctica libre de Dispensación) no cambian de
   comportamiento. El dispensario de Simulación y la pantalla de revisión del admin
   muestran quién está realmente en la ventanilla.
6. ✅ Reordenar el nav: "Turnero" ahora vive dentro del desplegable "Simulación" en
   `/admin` (Simulaciones · Turnero · Configurar turnero), igual que las secciones de un
   módulo.

Las 6 fases del plan quedan construidas. Sigue pendiente, sin bloquear nada de esto:
confirmar con la profesora el nombre real del documento de "no entrega por falta de
stock" (ver sección anterior).

## Prueba end-to-end real (Claude in Chrome)

Se probó el flujo completo en el navegador (crear simulación → revisar/regenerar →
descargar PDF → abrir → sacar turno por cédula en Registro → llamar/dispensar en
Dispensación, incluyendo el caso de suplantación y el de un paciente normal). Se
encontraron y corrigieron 3 problemas reales en el camino:

1. **PDF de recetas**: el separador "·" se veía como un glifo roto con la fuente
   `helvetica` de jsPDF — cambiado por un guion simple.
2. **Registro sin cédula**: mostraba "Datos inválidos" genérico (el zod del endpoint
   rechaza la cédula vacía como error de formato, no como el caso de negocio "falta la
   cédula"). Ahora se valida en el cliente antes de llamar a la API y los botones quedan
   deshabilitados hasta que hay cédula.
3. **Diseño corregido en vivo**: el dispensario de Simulación mostraba automáticamente
   quién era el paciente en cuanto le tocaba el turno (resuelto por la cédula ya validada
   en el turnero) — le quitaba el sentido a verificar identidad. Se cambió para que el
   estudiante tenga que **pedir el documento y buscarlo** en `/panel/dispensacion` (igual
   que en la práctica libre de Dispensación); si busca la cédula de otro paciente del
   pool, avisa que el turno actual no es para esa persona.

También se afinó el generador: los diagnósticos y antecedentes de `bancos.ts` ahora
llevan `minEdad`/`maxEdad` (`elegirPorEdad` en `generador.ts`) para evitar casos absurdos
como "control prenatal" en un niño o "control de crecimiento" en un adulto — verificado
generando 200 pacientes de prueba sin ninguno fuera de rango.

## Pendiente de confirmar con la profe

El nombre real del documento/registro de "lo que no se pudo entregar por falta de stock"
(no encontré un formato oficial fijo — el mecanismo real es una constancia con radicado,
ver conversación). Por ahora se muestra como aviso en pantalla, sin generar un documento
aparte.
