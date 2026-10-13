# Enfermería

Programa: **Auxiliar en Enfermería** (técnico laboral, 4 semestres). Plan de estudios en
nueva.funca.edu.co/programa/auxiliar-en-enfermeria: bioseguridad, signos vitales y toma de
muestras (1.º); actividades de la vida diaria y administración de medicamentos (2.º);
atención a la familia y cuidado por sistemas y grupo etario (3.º); práctica formativa (4.º).

## Práctica virtual (existente)

Casos de administración de medicamentos (los "5 correctos", alergias, signos vitales):
administrar o no administrar. Datos solo por seed (`prisma/seed.ts`).

## Hoja de enfermería (registro del turno)

Formato con campos estándar (FUNCA no tiene un formato propio). Lógica pura en
`src/lib/modulos/enfermeria/hoja.ts`, formulario en
`src/components/modulos/enfermeria/HojaEnfermeria.tsx`. Para revisarlo:
Contenido → Enfermería → Hoja de enfermería (con un ejemplo de prueba; no se guarda).

1. **Identificación**: servicio, cama, turno, diagnóstico médico, alergias (aviso rojo).
2. **Signos vitales** (varias tomas): TA, FC, FR, temperatura, SatO₂, glucometría, dolor (EVA).
   Se interpretan con rangos de adulto en reposo (normal / alerta / crítico); en menores de
   18 años no se interpreta porque los rangos dependen de la edad.
3. **Valoración**: estado de conciencia y hallazgos por necesidad (orientación, piel, respiración,
   alimentación, eliminación, movilidad, dispositivos).
4. **Escalas**: Braden (6–23; ≤12 alto, 13–14 moderado, 15–18 bajo), Glasgow (3–15; ≤8 grave,
   9–12 moderado, 13–14 leve) y Downton (≥3 alto riesgo; la deambulación suma una sola vez).
5. **Control de líquidos**: ingresos y egresos en ml, periodo (6/8/12/24 h) y balance.
6. **Administración de medicamentos**: medicamento, dosis, vía, frecuencia, hora, si se administró
   y, si no, por qué (obligatorio).
7. **Nota de enfermería SOAPIE**.

**Calificación** (`revisarHoja` + `notaHoja`): contra una hoja esperada del caso. Solo cuenta lo
que el caso define: signos (temperatura ±0,1 °C), valoración (marcar de más descuenta),
puntaje exacto de cada escala, totales del balance y la decisión de administrar o no cada
medicamento (con motivo si no). Pesos: medicamentos 30, signos 20, escalas 20, valoración 15,
balance 15. La nota SOAPIE la revisa el docente.

## Jornada presencial: Ronda de medicamentos

Tipo de jornada `ENFERMERIA` (Jornadas → Nueva jornada → *Ronda de medicamentos*, o desde el
Inicio). Los casos viven en el código: `src/lib/modulos/enfermeria/ronda.ts` (15 pacientes); la
jornada guarda sus códigos en `Simulacion.situaciones`.

| Caso | Qué se practica | Respuesta correcta |
|---|---|---|
| Alergia a penicilina | Verificar alergias (manilla roja) | No dar ampicilina; acetaminofén sí |
| Homónimos 1 y 2 | Identificar con nombre completo y documento | Cada una su medicamento |
| Digoxina con FC 52 | Pulso antes del medicamento | No dar digoxina; furosemida sí |
| Insulina con glucometría 52 | Glucometría antes de la insulina | No aplicar |
| Losartán con TA 88/54 | TA antes del antihipertensivo | No dar |
| Tramadol PRN antes de tiempo | Intervalo de un PRN | No repetir (última dosis 05:00) |
| Acetaminofén pediátrico | Cálculo mg/kg → ml | 10 ml |
| Goteo | Gotas/min con macrogotero | 42 gotas/min |
| Orden vencida | Vigencia de la orden | No dar |
| Orden sin firma | Validez de la orden | No dar |
| Rechazo | Derecho del paciente a rechazar | No forzar; registrar el motivo |
| Gestante con TA 150/100 y cefalea | Signo de alarma | No tratar solo el dolor; avisar |
| Encamado (Braden) | Escala de Braden | 9 (riesgo alto); enoxaparina sí |
| Sin novedades | Caso normal | Administrar y registrar |

**Flujo**
1. Crear la ronda (pacientes y número de estaciones = computadores) y **descargar el PDF**: por
   paciente, la **manilla** para recortar (roja si tiene alergia) y la **tarjeta** del compañero
   (cómo actuar y los signos vitales que muestra solo si se los toman).
2. Iniciar: se crea una cuenta por estación (`/panel/enfermeria`). El docente pone en cada
   estación al estudiante que atiende.
3. En la estación: buscar por el documento de la manilla → kárdex (órdenes con dosis, vía, hora,
   médico, vigencia y firma; indicaciones como "No administrar si FC < 60") → hoja de enfermería
   precargada con identificación y una fila por orden. Se registran los signos tomados, si se
   administró cada medicamento (y por qué no) y, si el caso lo pide, el cálculo. Cerrar y firmar.
4. Finalizar → confirmar quién atendió → calificar → reporte (con "Qué debía hacer" en cada caso).

El kárdex no muestra las alergias a propósito: se verifican con la manilla y preguntando.

**Nota** (`revisarHoja`): medicamentos 30, signos 20, cálculos 20, escalas 20, valoración 15,
balance 15 (solo cuentan los componentes que el caso define).

## Siguientes pasos propuestos

- Dictado de enfermería (balance y escalas) y pacientes reales (signos vitales tomados de
  verdad, con rúbrica).
- Casos de práctica virtual con la hoja de enfermería.
