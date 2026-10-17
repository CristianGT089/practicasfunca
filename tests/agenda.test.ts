import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cruces,
  cumpleOportunidad,
  diasHabilesDesde,
  diasHabilesEntre,
  esDiaHabil,
  festivosColombia,
  instanteColombia,
  problemaHorario,
} from "../src/lib/modulos/odontologia/agenda";

test("festivos de Colombia 2026 (incluye los trasladados y los de Pascua)", () => {
  const f = festivosColombia(2026);
  for (const d of ["2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25"]) {
    assert.ok(f.has(d), d);
  }
  assert.equal(f.size, 18);
});

test("días hábiles: salta fines de semana y festivos", () => {
  assert.equal(esDiaHabil("2026-10-17"), false); // sábado
  assert.equal(esDiaHabil("2026-10-12"), false); // festivo
  assert.deepEqual(diasHabilesDesde("2026-10-30", 3), ["2026-10-30", "2026-11-03", "2026-11-04"]); // 2 de nov festivo
});

test("oportunidad: máximo 3 días hábiles desde la solicitud", () => {
  const lunes = instanteColombia("2026-10-19", 9);
  assert.equal(diasHabilesEntre(lunes, instanteColombia("2026-10-22", 8)), 3);
  assert.ok(cumpleOportunidad(lunes, instanteColombia("2026-10-22", 8)));
  assert.ok(!cumpleOportunidad(lunes, instanteColombia("2026-10-23", 8)));
});

test("horario: hábil, entre 7 y 17, en bloques de 20 minutos", () => {
  assert.equal(problemaHorario(instanteColombia("2026-10-20", 7, 0), 40), null);
  assert.match(problemaHorario(instanteColombia("2026-10-20", 16, 40), 40) ?? "", /7:00 a 17:00/);
  assert.match(problemaHorario(instanteColombia("2026-10-20", 8, 10), 20) ?? "", /cada 20/);
  assert.match(problemaHorario(instanteColombia("2026-10-17", 8, 0), 20) ?? "", /no es hábil/);
});

test("cruces en la misma unidad; las canceladas no ocupan", () => {
  const nueva = { unidad: 1, inicio: instanteColombia("2026-10-20", 8, 0), duracionMin: 40 };
  const otras = [
    { id: "a", unidad: 1, inicio: instanteColombia("2026-10-20", 8, 20), duracionMin: 20 },
    { id: "b", unidad: 2, inicio: instanteColombia("2026-10-20", 8, 0), duracionMin: 20 },
    { id: "c", unidad: 1, inicio: instanteColombia("2026-10-20", 7, 40), duracionMin: 20, estado: "CANCELADA" },
    { id: "d", unidad: 1, inicio: instanteColombia("2026-10-20", 8, 40), duracionMin: 20 },
  ];
  assert.deepEqual(cruces(nueva, otras).map((c) => c.id), ["a"]);
});

import { revisarCitaDeAtencion } from "../src/lib/modulos/odontologia/agenda";

test("cita de la jornada: solo se exige si el paciente sigue el tratamiento aquí", () => {
  const cerradaEn = instanteColombia("2026-10-19", 9);
  const base = { tipo: "TRATAMIENTO", inicio: instanteColombia("2026-10-21", 8), pacienteTelefono: "3001234567", acudienteNombre: null };
  assert.equal(revisarCitaDeAtencion({ conductaEsperada: "INTERCONSULTA_MEDICA", citas: [], cerradaEn, esMenor: false }), null);
  assert.equal(revisarCitaDeAtencion({ conductaEsperada: "ATENCION_EN_CONSULTA", citas: [base], cerradaEn, esMenor: false })?.puntaje, 100);
  assert.equal(revisarCitaDeAtencion({ conductaEsperada: "ATENCION_EN_CONSULTA", citas: [], cerradaEn, esMenor: false })?.puntaje, 0);
  const tarde = revisarCitaDeAtencion({ conductaEsperada: "ATENCION_EN_CONSULTA", citas: [{ ...base, inicio: instanteColombia("2026-10-26", 8) }], cerradaEn, esMenor: true });
  assert.equal(tarde?.lineas.filter((l) => !l.cumplido).length, 2); // fuera de plazo y sin acudiente
});
