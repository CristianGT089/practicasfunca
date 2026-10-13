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

## Siguientes pasos propuestos

- **Jornada presencial "Ronda de medicamentos"**: camas = unidades, compañeros con tarjeta y
  manilla, situaciones elegibles (alergia, homónimos, digoxina con bradicardia, insulina con
  hipoglucemia, PRN antes de tiempo, cálculo pediátrico, goteo, orden vencida, rechazo…).
- Casos de enfermería con hoja esperada, dictado de enfermería (balance y escalas) y
  pacientes reales (signos vitales tomados de verdad, con rúbrica).
