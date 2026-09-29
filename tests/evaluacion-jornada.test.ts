import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarAtencionDispensario, type EntregaEvaluada, type PacienteEvaluado } from "../src/lib/simulacion/evaluacion";

const hoy = new Date("2026-09-28T12:00:00Z");
const futuro = new Date("2026-10-28T12:00:00Z");
const pasado = new Date("2026-09-01T12:00:00Z");

function paciente(extra: Partial<PacienteEvaluado> = {}): PacienteEvaluado {
  return {
    esAltoCosto: false,
    categoriaAfiliado: "CONTRIBUTIVO_A",
    tipoRecogida: "EL_MISMO",
    alergias: [],
    recetas: [
      { id: "r1", cantidadAutorizada: 20, cantidadRedimida: 0, fechaVigencia: futuro, medicamento: { id: "m1", nombre: "Losartán", principioActivo: "losartan" } },
    ],
    ...extra,
  };
}
const entrega = (e: Partial<EntregaEvaluada>): EntregaEvaluada => ({
  recetaElectronicaId: "r1",
  medicamentoId: null,
  medicamentoNombre: "Losartán",
  cantidad: 20,
  resultado: "ENTREGADO",
  altoCostoMarcado: false,
  cuotaModeradora: 5000,
  ...e,
});

test("entrega completa y cuota correcta = 100", () => {
  const r = evaluarAtencionDispensario(paciente(), [entrega({})], hoy);
  assert.equal(r.puntaje, 100);
});

test("cantidad incorrecta se marca como error", () => {
  const r = evaluarAtencionDispensario(paciente(), [entrega({ cantidad: 10 })], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "CANTIDAD_INCORRECTA" && !c.cumplido));
});

test("entregar una fórmula vencida es error; rechazarla es acierto", () => {
  const p = paciente({ recetas: [{ ...paciente().recetas[0], fechaVigencia: pasado }] });
  const mal = evaluarAtencionDispensario(p, [entrega({})], hoy);
  assert.ok(mal.criterios.some((c) => c.clave === "ENTREGO_VENCIDA"));
  const bien = evaluarAtencionDispensario(p, [entrega({ resultado: "RECHAZADO", cantidad: 0, altoCostoMarcado: null, cuotaModeradora: 0 })], hoy);
  assert.equal(bien.puntaje, 100);
});

test("alergia: entregar un AINE a un alérgico es error", () => {
  const p = paciente({
    alergias: ["aine"],
    recetas: [{ id: "r1", cantidadAutorizada: 10, cantidadRedimida: 0, fechaVigencia: futuro, medicamento: { id: "m1", nombre: "Ibuprofeno", principioActivo: "ibuprofeno" } }],
  });
  const r = evaluarAtencionDispensario(p, [entrega({ cantidad: 10 })], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "ENTREGO_CON_ALERGIA"));
});

test("suplantación: todo se debe rechazar y no se evalúa la cuota", () => {
  const r = evaluarAtencionDispensario(
    paciente({ tipoRecogida: "SUPLANTACION" }),
    [entrega({ resultado: "RECHAZADO", cantidad: 0, altoCostoMarcado: null, cuotaModeradora: 0 })],
    hoy
  );
  assert.equal(r.puntaje, 100);
  assert.ok(!r.criterios.some((c) => c.clave.startsWith("CUOTA")));
});

test("alto costo: cobrar cuota a un paciente exento es error", () => {
  const r = evaluarAtencionDispensario(paciente({ esAltoCosto: true }), [entrega({ altoCostoMarcado: false })], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "CUOTA_INCORRECTA"));
});

test("no registrar un medicamento cuenta como omisión", () => {
  const r = evaluarAtencionDispensario(paciente(), [], hoy);
  assert.equal(r.puntaje, 0);
  assert.equal(r.criterios[0].clave, "NO_REGISTRADO");
});

test("entregar algo no autorizado es error", () => {
  const r = evaluarAtencionDispensario(paciente(), [entrega({}), entrega({ recetaElectronicaId: null, medicamentoId: "m9", medicamentoNombre: "Tramadol", altoCostoMarcado: null })], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "ENTREGO_NO_AUTORIZADO"));
});

test("farmacia: no vender lo que no se debía cuenta como rechazo correcto", () => {
  const p = paciente({ tipoRecogida: "SUPLANTACION" });
  assert.equal(evaluarAtencionDispensario(p, [], hoy, "FARMACIA").puntaje, 100);
});

test("farmacia: vender la cantidad de la fórmula es correcto y no hay cuota", () => {
  const r = evaluarAtencionDispensario(paciente(), [entrega({})], hoy, "FARMACIA");
  assert.equal(r.puntaje, 100);
  assert.ok(!r.criterios.some((c) => c.clave.startsWith("CUOTA")));
});

test("farmacia: dos ventas del mismo medicamento se suman", () => {
  const r = evaluarAtencionDispensario(paciente(), [entrega({ cantidad: 10 }), entrega({ cantidad: 10 })], hoy, "FARMACIA");
  assert.equal(r.puntaje, 100);
});

test("farmacia: no vender una fórmula vigente es error", () => {
  const r = evaluarAtencionDispensario(paciente(), [], hoy, "FARMACIA");
  assert.ok(r.criterios.some((c) => c.clave === "RECHAZO_INDEBIDO"));
});
