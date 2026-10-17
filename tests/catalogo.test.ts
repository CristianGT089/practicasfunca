import { test } from "node:test";
import assert from "node:assert/strict";
import { esMedicamentoDispensable } from "../src/lib/simulacion/catalogo";

test("reconoce las formas farmacéuticas, con variantes del inventario", () => {
  for (const f of ["TABLETAS", "TABLETAS RECUBIERTAS", "CAPSULAS", "JARABE", "JAREBE", "SUSPENSIÓN ORAL", "INHALADOR POLVO", "INYECTABLE"]) {
    assert.ok(esMedicamentoDispensable(f), f);
  }
});

test("deja por fuera los dispositivos e insumos", () => {
  for (const f of ["DM", null, "", "SOLUCION", "LIQUIDO", "PARCHES", "ESPUMA", "ENTENSION DE OXIGENO"]) {
    assert.ok(!esMedicamentoDispensable(f), String(f));
  }
});
