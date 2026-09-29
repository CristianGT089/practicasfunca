import { test } from "node:test";
import assert from "node:assert/strict";
import { planDeSituaciones } from "../src/lib/simulacion/situaciones";

const azarFijo = () => 0.42;

test("cada situación elegida aparece al menos una vez", () => {
  const plan = planDeSituaciones(6, ["FORMULA_VENCIDA", "SUPLANTACION", "ALERGIA", "ALTO_COSTO"], 0.33, azarFijo);
  assert.equal(plan.length, 6);
  for (const s of ["FORMULA_VENCIDA", "SUPLANTACION", "ALERGIA", "ALTO_COSTO"]) {
    assert.ok(plan.some((p) => p.includes(s as never)), `falta ${s}`);
  }
});

test("respeta la proporción de casos normales", () => {
  const plan = planDeSituaciones(9, ["ALERGIA"], 0.33, azarFijo);
  assert.equal(plan.filter((p) => p.length === 0).length, 3);
});

test("con más situaciones que cupos, las combina sin repetirlas", () => {
  const plan = planDeSituaciones(2, ["FORMULA_VENCIDA", "ALERGIA", "ALTO_COSTO", "PACIENTE_MOLESTO"], 0, azarFijo);
  const todas = plan.flat();
  assert.equal(new Set(todas).size, 4);
});

test("nunca junta suplantación con tercero autorizado", () => {
  const plan = planDeSituaciones(1, ["SUPLANTACION", "TERCERO_AUTORIZADO"], 0, azarFijo);
  assert.ok(!plan.some((p) => p.includes("SUPLANTACION") && p.includes("TERCERO_AUTORIZADO")));
});

test("siempre deja al menos un caso con situación", () => {
  const plan = planDeSituaciones(3, ["ALERGIA"], 0.9, azarFijo);
  assert.ok(plan.some((p) => p.length > 0));
});

test("sin situaciones elegidas, todos son normales", () => {
  assert.deepEqual(planDeSituaciones(3, [], 0.33, azarFijo), [[], [], []]);
});
