import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarHallazgo, relatoOdontograma, type Marca } from "../src/lib/modulos/odontologia/odontograma";
import { compararOdontogramas } from "../src/lib/modulos/odontologia/calificacion";
import { calcularIndicePlaca } from "../src/lib/modulos/odontologia/historia";

test("una cara tiene un solo hallazgo y clic repetido lo quita", () => {
  let m: Marca[] = [];
  m = aplicarHallazgo(m, 16, "CARIES", "O");
  m = aplicarHallazgo(m, 16, "RESINA", "O");
  assert.deepEqual(m, [{ diente: 16, hallazgo: "RESINA", superficie: "O" }]);
  m = aplicarHallazgo(m, 16, "RESINA", "O");
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

test("mixta: pares temporal/permanente y contradicciones", async () => {
  const { parMixto, contradiccionesMixta } = await import("../src/lib/modulos/odontologia/odontograma");
  assert.equal(parMixto(55), 15);
  assert.equal(parMixto(15), 55);
  assert.equal(parMixto(83), 43);
  assert.equal(parMixto(16), null);
  const m: Marca[] = [
    { diente: 55, hallazgo: "CARIES", superficie: "O" },
    { diente: 15, hallazgo: "CARIES", superficie: "O" },
    { diente: 64, hallazgo: "CARIES", superficie: "O" },
    { diente: 24, hallazgo: "SIN_ERUPCIONAR" },
  ];
  assert.deepEqual(contradiccionesMixta(m), [{ temporal: 55, permanente: 15 }]);
});

test("marcar el resto como sano no pisa nada ni adivina en la mixta", async () => {
  const { marcarRestoSano } = await import("../src/lib/modulos/odontologia/odontograma");
  const base: Marca[] = [{ diente: 16, hallazgo: "CARIES", superficie: "O" }];
  const perm = marcarRestoSano(base, "PERMANENTE");
  assert.equal(perm.length, 32);
  assert.ok(perm.some((x) => x.diente === 16 && x.hallazgo === "CARIES"));
  assert.ok(!perm.some((x) => x.diente === 16 && x.hallazgo === "SANO"));
  const mixta = marcarRestoSano([{ diente: 15, hallazgo: "SIN_ERUPCIONAR" }], "MIXTA");
  assert.ok(mixta.some((x) => x.diente === 55 && x.hallazgo === "SANO")); // su permanente no ha salido
  assert.ok(!mixta.some((x) => x.diente === 54)); // 54 y 14 sin datos: no se adivina
  assert.ok(mixta.some((x) => x.diente === 16 && x.hallazgo === "SANO")); // molar sin par
});

test("convenciones nuevas: resina, amalgama, prótesis removible e implante", async () => {
  const { normalizarMarcas, definicionHallazgo } = await import("../src/lib/modulos/odontologia/odontograma");
  // Lo guardado con los códigos anteriores se lee con las convenciones nuevas.
  assert.deepEqual(
    normalizarMarcas([
      { diente: 16, hallazgo: "OBTURADO_BUEN_ESTADO", superficie: "O" },
      { diente: 26, hallazgo: "OBTURADO_MAL_ESTADO", superficie: "D" },
    ]),
    [
      { diente: 16, hallazgo: "RESINA", superficie: "O" },
      { diente: 26, hallazgo: "AMALGAMA", superficie: "D" },
    ]
  );
  assert.equal(definicionHallazgo("AMALGAMA")?.color, "NEGRO");
  assert.equal(definicionHallazgo("RESINA")?.color, "AZUL");
  assert.equal(definicionHallazgo("IMPLANTE")?.simbolo.tipo, "LETRA");

  // Ausente convive con lo que reemplaza al diente; Sano lo borra todo.
  let m: Marca[] = [];
  m = aplicarHallazgo(m, 36, "AUSENTE");
  m = aplicarHallazgo(m, 36, "PROTESIS_REMOVIBLE");
  assert.deepEqual(m.map((x) => x.hallazgo).sort(), ["AUSENTE", "PROTESIS_REMOVIBLE"]);
  m = aplicarHallazgo(m, 36, "AUSENTE"); // quitar ausente deja la prótesis
  assert.deepEqual(m.map((x) => x.hallazgo), ["PROTESIS_REMOVIBLE"]);
  m = aplicarHallazgo(m, 36, "AUSENTE");
  m = aplicarHallazgo(m, 36, "IMPLANTE");
  assert.equal(m.length, 3);
  m = aplicarHallazgo(m, 36, "SANO");
  assert.deepEqual(m, [{ diente: 36, hallazgo: "SANO" }]);
  // Una caries sí quita el "ausente" (el diente está).
  m = aplicarHallazgo([{ diente: 46, hallazgo: "AUSENTE" }], 46, "CARIES", "O");
  assert.deepEqual(m, [{ diente: 46, hallazgo: "CARIES", superficie: "O" }]);
});
