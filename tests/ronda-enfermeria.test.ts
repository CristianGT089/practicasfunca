import { test } from "node:test";
import assert from "node:assert/strict";
import { CASOS_RONDA, esperadoDeCaso, ordenDe, vigenciaOrden } from "../src/lib/modulos/enfermeria/ronda";
import { hojaVacia, notaHoja, revisarHoja, tomaVacia, type HojaEnfermeria } from "../src/lib/modulos/enfermeria/hoja";
import { buscarPaciente, hojaInicial } from "../src/lib/modulos/enfermeria/jornada";

test("catálogo: códigos y documentos únicos; cada medicamento esperado tiene su orden", () => {
  assert.equal(new Set(CASOS_RONDA.map((c) => c.codigo)).size, CASOS_RONDA.length);
  assert.equal(new Set(CASOS_RONDA.map((c) => c.paciente.documento)).size, CASOS_RONDA.length);
  for (const c of CASOS_RONDA) {
    assert.ok(c.esperado.medicamentos && c.esperado.medicamentos.length > 0, c.codigo);
    for (const m of c.esperado.medicamentos!) assert.ok(ordenDe(c, m.medicamento), `${c.codigo}: ${m.medicamento}`);
    assert.ok(c.guion.length > 0 && c.explicacion.length > 20, c.codigo);
  }
});

test("las órdenes vencidas o sin firma no se deben administrar", () => {
  const hoy = new Date("2026-10-13T12:00:00");
  for (const c of CASOS_RONDA) {
    for (const o of c.ordenes) {
      const v = vigenciaOrden(o, hoy);
      const esperado = c.esperado.medicamentos!.find((m) => ordenDe(c, m.medicamento) === o);
      if ((!v.vigente || !o.firmada) && esperado) assert.equal(esperado.administrar, false, `${c.codigo}: ${o.medicamento}`);
    }
  }
  const vencida = CASOS_RONDA.find((c) => c.codigo === "ORDEN_VENCIDA")!;
  assert.equal(vigenciaOrden(vencida.ordenes[0], hoy).vigente, false);
});

test("los cálculos de los casos son correctos", () => {
  const ped = CASOS_RONDA.find((c) => c.codigo === "PEDIATRICO_ACETAMINOFEN")!;
  const mg = 15 * ped.paciente.pesoKg!; // 300 mg
  assert.equal((mg * 5) / 150, ped.calculo!.valor); // jarabe 150 mg / 5 ml → 10 ml
  const goteo = CASOS_RONDA.find((c) => c.codigo === "GOTEO")!;
  assert.equal(Math.round((1000 * 20) / (8 * 60)), goteo.calculo!.valor); // 41,7 → 42
});

test("buscar por documento de la manilla, con o sin puntos", () => {
  const codigos = CASOS_RONDA.map((c) => c.codigo);
  assert.equal(buscarPaciente(codigos, "41.234.567")?.codigo, "DIGOXINA_BRADICARDIA");
  assert.equal(buscarPaciente(["NORMAL"], "41234567"), null); // no está en esta ronda
});

/** Una hoja que hace todo bien según lo esperado del caso. */
function hojaPerfecta(codigo: string): HojaEnfermeria {
  const c = CASOS_RONDA.find((x) => x.codigo === codigo)!;
  const h = hojaInicial(c);
  h.signos = [{ ...tomaVacia(), ...c.signos }];
  h.medicamentos = h.medicamentos.map((m) => {
    const e = c.esperado.medicamentos!.find((x) => ordenDe(c, x.medicamento)?.medicamento === m.medicamento);
    return e ? { ...m, administrado: e.administrar ? "SI" : "NO", observacion: e.administrar ? "" : "Se informa al médico" } : m;
  });
  if (c.calculo) h.calculos = { [c.calculo.clave]: c.calculo.valor };
  if (c.esperado.braden !== null) h.escalas.braden = { percepcion: 2, humedad: 2, actividad: 1, movilidad: 1, nutricion: 2, friccion: 1 };
  return h;
}

test("cada caso: la hoja correcta saca 100 y una vacía saca 0", () => {
  for (const c of CASOS_RONDA) {
    const bien = revisarHoja(esperadoDeCaso(c), hojaPerfecta(c.codigo));
    assert.equal(notaHoja(bien.puntajes), 100, c.codigo);
    const mal = revisarHoja(esperadoDeCaso(c), hojaVacia());
    assert.equal(notaHoja(mal.puntajes), 0, c.codigo);
  }
});

test("digoxina: administrarla con FC 52 es el error que pesa", () => {
  const h = hojaPerfecta("DIGOXINA_BRADICARDIA");
  h.medicamentos = h.medicamentos.map((m) => (m.medicamento === "Digoxina" ? { ...m, administrado: "SI", observacion: "" } : m));
  const c = CASOS_RONDA.find((x) => x.codigo === "DIGOXINA_BRADICARDIA")!;
  const r = revisarHoja(esperadoDeCaso(c), h);
  assert.equal(r.puntajes.medicamentos, 50);
  assert.ok(r.lineas.some((l) => l.descripcion === "Digoxina: NO debía administrarse"));
});
