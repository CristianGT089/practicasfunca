import { test } from "node:test";
import assert from "node:assert/strict";
import { problemaDocumento, tipoDocumentoVigente } from "../src/lib/modulos/odontologia/documento";

const hoy = new Date("2026-10-17T12:00:00Z");

test("el documento debe corresponder a la edad", () => {
  assert.equal(problemaDocumento("RC", "2022-03-17", hoy), null);
  assert.equal(problemaDocumento("TI", "2011-07-11", hoy), null);
  assert.match(problemaDocumento("CC", "2011-07-11", hoy) ?? "", /tarjeta de identidad \(TI\)/);
  assert.match(problemaDocumento("TI", "2005-01-01", hoy) ?? "", /cédula de ciudadanía \(CC\)/);
  assert.equal(problemaDocumento("CE", "2015-01-01", hoy), null);
});

test("lo que se muestra sigue a la edad de hoy (un caso viejo con TI ya puede tener CC)", () => {
  assert.equal(tipoDocumentoVigente("TI", "2008-01-01", hoy), "CC");
  assert.equal(tipoDocumentoVigente("CE", "2020-01-01", hoy), "CE");
});

import { generarCasoAleatorio } from "../src/lib/modulos/odontologia/dictado";
import { contradiccionesMixta } from "../src/lib/modulos/odontologia/odontograma";

test("dictado con dentición mixta: el documento cuadra con la edad y no hay pares contradictorios", () => {
  for (let i = 0; i < 200; i++) {
    const { paciente, esperado } = generarCasoAleatorio("MIXTA", i % 2 === 0);
    assert.equal(problemaDocumento(paciente.tipoDocumento, paciente.fechaNacimiento), null);
    assert.deepEqual(contradiccionesMixta(esperado.odontograma), []);
    assert.ok(esperado.odontograma.length > 0);
  }
});

test("dictado de adulto y de niño pequeño: el documento cuadra con la fecha de nacimiento", () => {
  for (let i = 0; i < 200; i++) {
    for (const d of ["PERMANENTE", "TEMPORAL"] as const) {
      const { paciente } = generarCasoAleatorio(d, false);
      assert.equal(problemaDocumento(paciente.tipoDocumento, paciente.fechaNacimiento), null, `${d} ${paciente.fechaNacimiento}`);
    }
  }
});
