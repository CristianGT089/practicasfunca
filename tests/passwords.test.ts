import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPasswordNueva } from "../src/lib/nucleo/passwords";

test("acepta una contraseña fácil de recordar", () => {
  assert.equal(validarPasswordNueva("girasol2026", "mperez"), null);
});

test("rechaza contraseñas cortas", () => {
  assert.match(validarPasswordNueva("abc12", "mperez") ?? "", /al menos 6/);
});

test("rechaza usar el mismo usuario como contraseña", () => {
  assert.match(validarPasswordNueva("MPerez", "mperez") ?? "", /igual al usuario/);
});
