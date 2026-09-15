# Dispensación (servicio farmacéutico)

Módulo de **práctica libre, sin nota**. El estudiante atiende una secuencia de pacientes
que llegan a la ventanilla de un servicio farmacéutico de IPS/EPS con **fórmulas médicas**,
busca al paciente en el sistema, coteja la fórmula contra lo autorizado y **dispensa**
(total o parcial). Los medicamentos no se cobran.

Coexiste con el módulo `farmacia` (droguería): son dos competencias distintas. El estudiante
se matricula en el que corresponda.

## Por qué no usa el motor de escenarios

No hay `Escenario` / `PasoEsperado` / `Intento` / calificación / informe. Es una herramienta,
como el turnero. En su lugar:

- `Modulo.tipo = SIMULADOR` y `Modulo.rutaSimulador = "/panel/dispensacion"`.
- `/panel`, cuando el módulo activo es `SIMULADOR`, muestra un botón "Abrir simulador" en
  vez de la lista de casos calificados.

## Flujo

1. **Llega el siguiente paciente** con una o varias fórmulas físicas (se ven como
   documentos en pantalla).
2. El estudiante lee el documento y **busca al paciente** en el sistema.
3. El sistema muestra la ficha del paciente y, por cada renglón de la(s) fórmula(s), la
   **autorización** correspondiente (`RecetaElectronica`): cantidad autorizada, ya redimida,
   saldo disponible, vigencia.
4. El estudiante **entrega** (cantidad total o parcial) o **rechaza** cada renglón.
5. Al terminar → **Siguiente paciente**. En cualquier momento → **Reiniciar práctica**.

## Avisos (`lib/modulos/dispensacion/reglas.ts`)

Sin nota; solo guían y muestran las consecuencias.

| Código | Nivel | Cuándo |
|---|---|---|
| `IDENTIDAD` | BLOQUEO | quien reclama presenta un documento distinto al del titular |
| `FORMULA_NO_EN_SISTEMA` | BLOQUEO | fórmula de médico particular, no cargada en la EPS → remitir |
| `NO_AUTORIZADO` | BLOQUEO | el medicamento no aparece autorizado para ese paciente |
| `VENCIDA` / `AGOTADA` | BLOQUEO | la autorización venció / ya se redimió por completo |
| `EXCEDE_AUTORIZADO` | ALERTA | la fórmula pide más de lo que queda → entrega parcial hasta el saldo |
| `CANTIDAD_TACHADA` | ALERTA | la cantidad tiene corrección a mano |
| `ALERGIA` | ALERTA | el medicamento cruza con una alergia registrada |
| `SIN_STOCK` | ALERTA | no hay existencias en el punto |
| `MEDICO_DIFERENTE` | INFO | el médico de la fórmula ≠ el que registró la autorización |

Con un BLOQUEO la pantalla no ofrece "Entregar" (el sistema real tampoco dejaría);
siempre se puede "Rechazar" con un motivo.

## Modelo de datos

Reusa `Paciente` (cédula, alergias), `Medicamento` y **`RecetaElectronica`** (la
autorización del sistema; el emparejamiento con cada renglón es por `pacienteId` +
`medicamentoId` en tiempo de ejecución).

```
CasoDispensacion      un paciente que llega (paciente, contexto, orden, documentoPresentado)
  FormulaPresentada   una fórmula física que entrega (médico, fechas, cargadaEnSistema, nota)
    RenglonFormula    un medicamento del papel (cantidad, cantidadTachada, posología)

SesionDispensacion    corrida de práctica de un estudiante (indiceCaso) — aísla su estado
  EntregaDispensacion lo que hizo con un renglón (ENTREGADO n / RECHAZADO + motivo),
                      con el link a la RecetaElectronica para descontar saldo en la sesión
```

"Reiniciar práctica" borra las sesiones del estudiante y arranca una nueva desde el caso 0;
las autorizaciones (`RecetaElectronica`) vuelven a su estado sembrado porque el consumo de
la práctica vive en `EntregaDispensacion`, no en `cantidadRedimida`.

## Sala de cómputo: puestos temporales

A diferencia del turnero (una sola cuenta admin), acá **cada estudiante necesita su propia
cuenta** — la sesión de práctica (`SesionDispensacion`) vive por `usuarioId`, así que dos
personas con la misma cuenta compartirían el mismo avance.

Para no tener que dar de alta un estudiante a la vez antes de cada práctica, `/admin/estudiantes`
tiene una sección **"Puestos temporales para sala de cómputo"**: el admin pide N cuentas
(ej. 3, una por computador), les pone un nombre base ("Dispensación") y elige en qué
módulo(s) matricularlas. Crea `Dispensación 1`, `Dispensación 2`, `Dispensación 3`
(usuarios `dispensacion1/2/3`) ya matriculadas, con contraseña generada, listas para
repartir en cada puesto.

Quedan marcadas `Usuario.temporal = true`. Terminada la sesión, **"Eliminar cuentas
temporales"** las borra todas de un clic (`DELETE /api/admin/estudiantes/temporales`),
arrastrando sus sesiones/entregas/matrículas — no hace falta limpiarlas una por una ni
dejarlas acumulándose de una clase a otra.

Admin CRUD de casos y autorizaciones: ver `/admin/modulos/dispensacion/casos` y `/autorizaciones`.
