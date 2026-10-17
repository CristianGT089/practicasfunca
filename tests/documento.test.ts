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
