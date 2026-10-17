import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acudienteEsperadoDeCaso,
  acudienteVacio,
  documentoAcudienteDeCaso,
  edadEn,
  faltantesAcudiente,
  revisarAcudiente,
} from "../src/lib/modulos/odontologia/acudiente";
import { revisarHistoria } from "../src/lib/modulos/odontologia/calificacion";
import { esperadoVacio, historiaVacia, normalizarHistoria } from "../src/lib/modulos/odontologia/historia";

const hoy = new Date("2026-10-17T12:00:00Z");
const nino = { documento: "1098765432", fechaNacimiento: "2020-03-10", contactoEmergencia: "Yuliana Quintero", parentescoContacto: "Madre" };

test("edad y mayoría de edad, contando si ya cumplió años", () => {
  assert.equal(edadEn("2008-10-18", hoy), 17);
  assert.equal(edadEn("2008-10-17", hoy), 18);
  assert.equal(acudienteEsperadoDeCaso({ ...nino, fechaNacimiento: "2000-01-01" }, hoy), null);
});

test("la cédula del acudiente de un caso siempre es la misma", () => {
  assert.equal(documentoAcudienteDeCaso("1098765432"), documentoAcudienteDeCaso("1098765432"));
  assert.match(documentoAcudienteDeCaso("1098765432"), /^10\d{8}$/);
});

test("sin consentimiento ni documento no se puede cerrar", () => {
  const faltan = faltantesAcudiente({ ...acudienteVacio(), nombre: "Yuliana", parentesco: "Madre" });
  assert.deepEqual(faltan, ["su documento", "su consentimiento informado"]);
});

test("acudiente bien registrado = 100; con otra cédula pierde esa parte", () => {
  const esperado = acudienteEsperadoDeCaso(nino, hoy)!;
  const bien = { nombre: "Yuliana Quintero", tipoDocumento: "CC", documento: esperado.documento, parentesco: "Madre", telefono: "", consentimiento: true };
  assert.equal(revisarAcudiente(esperado, bien).puntaje, 100);
  assert.equal(revisarAcudiente(esperado, { ...bien, documento: "123" }).puntaje, 75);
});

test("la historia de un adulto no evalúa el acudiente; la de un menor sí", () => {
  const adulto = revisarHistoria(esperadoVacio(), historiaVacia(), "PERMANENTE", "ATENCION_EN_CONSULTA", "ATENCION_EN_CONSULTA");
  assert.equal(adulto.puntajes.acudiente, null);
  const menor = revisarHistoria(esperadoVacio(), historiaVacia(), "TEMPORAL", "ATENCION_EN_CONSULTA", "ATENCION_EN_CONSULTA", acudienteEsperadoDeCaso(nino, hoy));
  assert.equal(menor.puntajes.acudiente, 0);
});

test("una historia guardada antes del cambio se lee con el acudiente vacío", () => {
  const h = normalizarHistoria({ motivoConsulta: "dolor" });
  assert.deepEqual(h.acudiente, acudienteVacio());
});
