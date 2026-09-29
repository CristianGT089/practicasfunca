import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarHallazgo, relatoOdontograma, type Marca } from "../src/lib/modulos/odontologia/odontograma";
import { compararOdontogramas } from "../src/lib/modulos/odontologia/calificacion";
import { calcularIndicePlaca } from "../src/lib/modulos/odontologia/historia";

test("una cara tiene un solo hallazgo y clic repetido lo quita", () => {
  let m: Marca[] = [];
  m = aplicarHallazgo(m, 16, "CARIES", "O");
  m = aplicarHallazgo(m, 16, "OBTURADO_BUEN_ESTADO", "O");
  assert.deepEqual(m, [{ diente: 16, hallazgo: "OBTURADO_BUEN_ESTADO", superficie: "O" }]);
  m = aplicarHallazgo(m, 16, "OBTURADO_BUEN_ESTADO", "O");
  assert.deepEqual(m, []);
});

test("ausente borra todo lo demás del diente y buen/mal estado se reemplazan", () => {
  let m: Marca[] = [];
  m = aplicarHallazgo(m, 21, "CORONA_BUEN_ESTADO");
  m = aplicarHallazgo(m, 21, "CORONA_MAL_ESTADO");
  assert.deepEqual(m, [{ diente: 21, hallazgo: "CORONA_MAL_ESTADO" }]);
  m = aplicarHallazgo(m, 21, "AUSENTE");
  assert.deepEqual(m, [{ diente: 21, hallazgo: "AUSENTE" }]);
});

test("comparación: aciertos, cara equivocada y marcas de más", () => {
  const esperado: Marca[] = [
    { diente: 36, hallazgo: "CARIES", superficie: "O" },
    { diente: 46, hallazgo: "AUSENTE" },
  ];
  const obtenido: Marca[] = [
    { diente: 36, hallazgo: "CARIES", superficie: "M" },
    { diente: 46, hallazgo: "AUSENTE" },
    { diente: 11, hallazgo: "CORONA_BUEN_ESTADO" },
  ];
  const c = compararOdontogramas(esperado, obtenido);
  assert.equal(c.aciertos.length, 1);
  assert.equal(c.parciales.length, 1);
  assert.equal(c.sobrantes.length, 1);
  // (1 + 0,5) / (2 esperadas + 1 de más) = 50
  assert.equal(c.puntaje, 50);
});

test("sano no se califica", () => {
  assert.equal(compararOdontogramas([], [{ diente: 11, hallazgo: "SANO" }]).puntaje, 100);
});

test("índice de O'Leary descuenta los dientes ausentes", () => {
  const r = calcularIndicePlaca("PERMANENTE", [{ diente: 18, hallazgo: "AUSENTE" }], [{ diente: 16, superficie: "V" }]);
  assert.equal(r.superficiesPresentes, 31 * 4);
  assert.equal(r.tenidas, 1);
});

test("relato: modo fácil con número FDI, difícil solo el nombre", () => {
  const m: Marca[] = [{ diente: 36, hallazgo: "CARIES", superficie: "O" }];
  assert.match(relatoOdontograma(m, "CLINICO", true)[0], /^Diente 36 \(primer molar inferior izquierdo\)/);
  assert.match(relatoOdontograma(m, "CLINICO", false)[0], /^Primer molar inferior izquierdo/);
});
