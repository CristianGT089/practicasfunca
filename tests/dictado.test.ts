import { test } from "node:test";
import assert from "node:assert/strict";
import { avanceEstudiante, generarCasoAleatorio, guionDictado, mapaCalor } from "../src/lib/modulos/odontologia/dictado";
import { dientesDeDenticion, normalizarMarcas, type Marca } from "../src/lib/modulos/odontologia/odontograma";
import { esperadoVacio, normalizarEsperado } from "../src/lib/modulos/odontologia/historia";

/** Generador reproducible para las pruebas. */
function semilla(n: number) {
  let s = n;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

test("el caso al azar es válido: marcas normalizadas y dientes de su dentición", () => {
  for (let i = 1; i <= 40; i++) {
    for (const d of ["PERMANENTE", "TEMPORAL"] as const) {
      const { esperado, paciente } = generarCasoAleatorio(d, i % 2 === 0, semilla(i));
      const validos = new Set(dientesDeDenticion(d));
      assert.ok(esperado.odontograma.length > 0);
      assert.deepEqual(normalizarMarcas(esperado.odontograma).length, esperado.odontograma.length);
      assert.ok(esperado.odontograma.every((m) => validos.has(m.diente)));
      // Lo que sale del generador sobrevive a la normalización de catálogos.
      assert.deepEqual(normalizarEsperado(esperado), esperado);
      const hallazgosPorDiente = new Map<number, Set<string>>();
      for (const m of esperado.odontograma) hallazgosPorDiente.set(m.diente, new Set([...(hallazgosPorDiente.get(m.diente) ?? []), m.hallazgo]));
      // Un hallazgo por diente, salvo el diente perdido reemplazado por prótesis removible.
      assert.ok(
        [...hallazgosPorDiente.values()].every(
          (h) => h.size === 1 || (h.size === 2 && h.has("AUSENTE") && h.has("PROTESIS_REMOVIBLE"))
        )
      );
      assert.equal(paciente.tipoDocumento, d === "TEMPORAL" ? "RC" : "CC");
    }
  }
});

test("solo odontograma: sin historia en el caso ni en el guion", () => {
  const { esperado } = generarCasoAleatorio("PERMANENTE", false, semilla(7));
  assert.deepEqual(esperado.alertaMedica, []);
  assert.deepEqual(esperado.antecedentesOdontologicos, []);
  const guion = guionDictado(esperado, "ODONTOGRAMA");
  assert.ok(guion.every((l) => l.seccion === "Odontograma"));
  // Cada marca del caso aparece en exactamente una línea.
  assert.equal(guion.flatMap((l) => l.marcas).length, esperado.odontograma.length);
});

test("el guion dicta por cuadrantes (18→11, 21→28, 38→31, 41→48) y nombra caras", () => {
  const esperado = {
    ...esperadoVacio(),
    alertaMedica: ["hipertension"],
    odontograma: [
      { diente: 46, hallazgo: "AUSENTE" },
      { diente: 21, hallazgo: "CARIES", superficie: "M" },
      { diente: 16, hallazgo: "CARIES", superficie: "O" },
      { diente: 16, hallazgo: "CARIES", superficie: "V" },
      { diente: 36, hallazgo: "CORONA_BUEN_ESTADO" },
      { diente: 31, hallazgo: "ROTACION" },
      { diente: 47, hallazgo: "AUSENTE" },
      { diente: 18, hallazgo: "AUSENTE" },
    ] as Marca[],
  };
  const guion = guionDictado(esperado, "COMPLETA", "Me duele");
  const dientes = guion.filter((l) => l.seccion === "Odontograma").map((l) => l.id);
  assert.deepEqual(dientes, ["d18", "d16", "d21", "d36", "d31", "d46", "d47"]);
  const d16 = guion.find((l) => l.id === "d16")!;
  assert.match(d16.texto, /Diente 16/);
  assert.match(d16.texto, /cariado en vestibular y oclusal/i);
  assert.match(guion.find((l) => l.id === "alerta")!.texto, /hipertensi/i);
  assert.equal(guion[0].id, "motivo");
});

test("avance: solo cuenta lo ya dictado", () => {
  const esperado = {
    ...esperadoVacio(),
    odontograma: [
      { diente: 16, hallazgo: "CARIES", superficie: "O" },
      { diente: 26, hallazgo: "AUSENTE" },
    ] as Marca[],
  };
  const guion = guionDictado(esperado, "ODONTOGRAMA");
  const estudiante: Marca[] = [{ diente: 16, hallazgo: "CARIES", superficie: "O" }];
  assert.deepEqual(avanceEstudiante(guion, new Set(["d16"]), estudiante), { esperadas: 1, bien: 1 });
  assert.deepEqual(avanceEstudiante(guion, new Set(["d16", "d26"]), estudiante), { esperadas: 2, bien: 1 });
  assert.deepEqual(avanceEstudiante(guion, new Set(), estudiante), { esperadas: 0, bien: 0 });
});

test("mapa de calor: un diente cuenta si está exacto (ni de menos ni de más), peor primero", () => {
  const esperado: Marca[] = [
    { diente: 16, hallazgo: "CARIES", superficie: "O" },
    { diente: 26, hallazgo: "AUSENTE" },
  ];
  const estudiantes: Marca[][] = [
    [...esperado],
    [{ diente: 16, hallazgo: "CARIES", superficie: "O" }, { diente: 16, hallazgo: "CARIES", superficie: "M" }],
    [{ diente: 26, hallazgo: "AUSENTE" }, { diente: 16, hallazgo: "CARIES", superficie: "O" }],
    [],
  ];
  const mapa = mapaCalor(esperado, estudiantes);
  assert.deepEqual(mapa, [
    { diente: 26, bien: 2, total: 4, porcentaje: 50 },
    { diente: 16, bien: 2, total: 4, porcentaje: 50 },
  ].sort((a, b) => a.diente - b.diente));
  assert.deepEqual(mapaCalor(esperado, []).map((c) => c.porcentaje), [0, 0]);
});
