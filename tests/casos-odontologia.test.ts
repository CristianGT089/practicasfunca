import { test } from "node:test";
import assert from "node:assert/strict";
import { CASOS_ODONTOLOGIA } from "../src/lib/modulos/odontologia/casosEjemplo";
import { esperadoVacio, normalizarEsperado } from "../src/lib/modulos/odontologia/historia";
import { dientesDeDenticion, type Denticion } from "../src/lib/modulos/odontologia/odontograma";

test("5 casos de práctica virtual y 5 de jornada presencial", () => {
  assert.equal(CASOS_ODONTOLOGIA.filter((c) => !c.presencial).length, 5);
  assert.equal(CASOS_ODONTOLOGIA.filter((c) => c.presencial).length, 5);
});

test("títulos y documentos no se repiten (el consultorio busca por documento)", () => {
  assert.equal(new Set(CASOS_ODONTOLOGIA.map((c) => c.titulo)).size, CASOS_ODONTOLOGIA.length);
  assert.equal(new Set(CASOS_ODONTOLOGIA.map((c) => c.paciente.documento)).size, CASOS_ODONTOLOGIA.length);
});

test("ninguna marca ni código se pierde al validar, y los dientes son de su dentición", () => {
  for (const c of CASOS_ODONTOLOGIA) {
    const crudo = { ...esperadoVacio(), ...c.esperado };
    const e = normalizarEsperado(crudo);
    assert.equal(e.odontograma.length, crudo.odontograma.length, `${c.titulo}: odontograma`);
    assert.equal(e.placa.length, crudo.placa.length, `${c.titulo}: placa`);
    assert.equal(e.alertaMedica.length, crudo.alertaMedica.length, `${c.titulo}: alerta`);
    assert.equal(e.antecedentesPersonales.length, crudo.antecedentesPersonales.length, `${c.titulo}: antecedentes`);
    assert.equal(e.antecedentesOdontologicos.length, crudo.antecedentesOdontologicos.length, `${c.titulo}: antecedentes odont.`);
    assert.equal(e.examenEstomatologico.length, crudo.examenEstomatologico.length, `${c.titulo}: estomatológico`);
    assert.equal(e.examenDental.length, crudo.examenDental.length, `${c.titulo}: dental`);
    const dientes = dientesDeDenticion(c.denticion as Denticion);
    for (const mk of e.odontograma) assert.ok(dientes.includes(mk.diente), `${c.titulo}: diente ${mk.diente}`);
  }
});
