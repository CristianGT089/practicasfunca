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
    personaRecogeCedula: null,
    recogida: { decision: "PACIENTE", documentoQuienReclama: null },
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
    paciente({ tipoRecogida: "SUPLANTACION", recogida: { decision: "NO_ENTREGA", documentoQuienReclama: null } }),
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
  const r = evaluarAtencionDispensario(paciente({ recogida: null }), [], hoy);
  assert.equal(r.puntaje, 0);
  assert.ok(r.criterios.some((c) => c.clave === "NO_REGISTRADO"));
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

test("quién reclama: no registrarlo es error", () => {
  const r = evaluarAtencionDispensario(paciente({ recogida: null }), [entrega({})], hoy);
  const c = r.criterios.find((x) => x.clave.startsWith("IDENTIDAD"));
  assert.equal(c?.cumplido, false);
  assert.ok(r.puntaje < 100);
});

test("suplantación: registrar que no se entrega rechaza toda la fórmula", () => {
  const r = evaluarAtencionDispensario(
    paciente({ tipoRecogida: "SUPLANTACION", personaRecogeCedula: "1012345678", recogida: { decision: "NO_ENTREGA", documentoQuienReclama: null } }),
    [],
    hoy
  );
  assert.equal(r.puntaje, 100);
  assert.ok(r.criterios.some((c) => c.clave === "RECHAZO_CORRECTO"));
});

test("suplantación: tomarlo por el paciente es error de identidad", () => {
  const r = evaluarAtencionDispensario(
    paciente({ tipoRecogida: "SUPLANTACION", personaRecogeCedula: "1012345678" }),
    [entrega({})],
    hoy
  );
  assert.ok(r.criterios.some((c) => c.clave === "IDENTIDAD_INCORRECTA"));
  assert.ok(r.criterios.some((c) => c.clave === "ENTREGO_A_SUPLANTADOR"));
});

test("tercero o acudiente: hay que registrar su cédula", () => {
  const base = { tipoRecogida: "TERCERO_AUTORIZADO" as const, personaRecogeCedula: "1012345678" };
  const bien = evaluarAtencionDispensario(
    paciente({ ...base, recogida: { decision: "TERCERO", documentoQuienReclama: "1.012.345.678" } }),
    [entrega({})],
    hoy
  );
  assert.equal(bien.puntaje, 100);
  const otraCedula = evaluarAtencionDispensario(
    paciente({ ...base, recogida: { decision: "TERCERO", documentoQuienReclama: "1099999999" } }),
    [entrega({})],
    hoy
  );
  assert.ok(otraCedula.criterios.some((c) => c.clave === "IDENTIDAD_INCORRECTA"));
});

test("no entregar a quien sí podía recibir es rechazo indebido", () => {
  const r = evaluarAtencionDispensario(paciente({ recogida: { decision: "NO_ENTREGA", documentoQuienReclama: null } }), [], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "RECHAZO_INDEBIDO"));
  assert.ok(r.criterios.some((c) => c.clave === "IDENTIDAD_INCORRECTA"));
});

// ---------- Pendientes (Res. 1604 de 2013) ----------

const t0 = new Date("2026-09-28T10:00:00Z");
const t1 = new Date("2026-09-28T10:05:00Z");
const t2 = new Date("2026-09-28T10:20:00Z");
const conPendiente = (pendiente: PacienteEvaluado["recetas"][number]["pendiente"], prefiere: "ESTABLECIMIENTO" | "DOMICILIO" = "ESTABLECIMIENTO") =>
  paciente({
    situaciones: ["PENDIENTE"],
    pendientePrefiere: prefiere,
    recetas: [
      { id: "r1", cantidadAutorizada: 20, cantidadRedimida: 0, fechaVigencia: futuro, deficitJornada: 8, pendiente, medicamento: { id: "m1", nombre: "Losartán", principioActivo: "losartan" } },
    ],
  });

test("pendiente bien manejado: entrega lo que hay, constancia y entrega al volver", () => {
  const r = evaluarAtencionDispensario(
    conPendiente({ cantidad: 8, modalidad: "ESTABLECIMIENTO", direccion: null, telefono: null, creadoEn: t1 }),
    [entrega({ cantidad: 12, creadoEn: t0 }), entrega({ cantidad: 8, creadoEn: t2, altoCostoMarcado: null, cuotaModeradora: 0 })],
    hoy
  );
  assert.equal(r.puntaje, 100, JSON.stringify(r.criterios.filter((c) => !c.cumplido)));
  assert.equal(r.criterios.filter((c) => c.clave === "PENDIENTE_CORRECTO").length, 4);
});

test("pendiente sin registrar: es error aunque haya entregado lo que había", () => {
  const r = evaluarAtencionDispensario(conPendiente(null), [entrega({ cantidad: 12, creadoEn: t0 })], hoy);
  assert.ok(r.criterios.some((c) => c.clave === "PENDIENTE_INCORRECTO" && c.descripcion.includes("registrar el pendiente")));
});

test("pendiente: domicilio sin dirección o con la modalidad equivocada es error", () => {
  const sinDatos = evaluarAtencionDispensario(
    conPendiente({ cantidad: 8, modalidad: "DOMICILIO", direccion: "", telefono: null, creadoEn: t1 }, "DOMICILIO"),
    [entrega({ cantidad: 12, creadoEn: t0 })],
    hoy
  );
  assert.ok(sinDatos.criterios.some((c) => c.clave === "PENDIENTE_INCORRECTO"));
  const otraModalidad = evaluarAtencionDispensario(
    conPendiente({ cantidad: 8, modalidad: "ESTABLECIMIENTO", direccion: null, telefono: null, creadoEn: t1 }, "DOMICILIO"),
    [entrega({ cantidad: 12, creadoEn: t0 })],
    hoy
  );
  assert.ok(otraModalidad.criterios.some((c) => c.clave === "PENDIENTE_INCORRECTO"));
});

test("reclama un pendiente de antes: solo se entrega lo que faltaba y no se cobra cuota", () => {
  const p = paciente({
    situaciones: ["RECLAMA_PENDIENTE"],
    recetas: [
      { id: "r1", cantidadAutorizada: 20, cantidadRedimida: 14, fechaVigencia: futuro, medicamento: { id: "m1", nombre: "Losartán", principioActivo: "losartan" } },
      { id: "r2", cantidadAutorizada: 10, cantidadRedimida: 10, fechaVigencia: futuro, medicamento: { id: "m2", nombre: "Omeprazol", principioActivo: "omeprazol" } },
    ],
  });
  const bien = evaluarAtencionDispensario(p, [entrega({ cantidad: 6, altoCostoMarcado: null, cuotaModeradora: 0 })], hoy);
  assert.equal(bien.puntaje, 100);
  assert.ok(!bien.criterios.some((c) => c.clave.startsWith("CUOTA")));
  const deMas = evaluarAtencionDispensario(p, [entrega({ cantidad: 20 })], hoy);
  assert.ok(deMas.criterios.some((c) => c.clave === "CANTIDAD_INCORRECTA"));
});
