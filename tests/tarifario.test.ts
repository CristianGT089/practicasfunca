import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TARIFARIO_ODONTOLOGIA,
  UVB_VIGENTE,
  presupuestoDesdeOdontograma,
  raicesDe,
  valorEnPesos,
} from "../src/lib/modulos/odontologia/tarifario";
import type { Marca } from "../src/lib/modulos/odontologia/odontograma";

test("catálogo: 83 procedimientos del capítulo de salud oral, códigos únicos", () => {
  assert.equal(TARIFARIO_ODONTOLOGIA.length, 83);
  assert.equal(new Set(TARIFARIO_ODONTOLOGIA.map((i) => i.codigo)).size, 83);
  assert.ok(TARIFARIO_ODONTOLOGIA.every((i) => /^36\d{3}$/.test(i.codigo) && i.uvb > 0));
});

test("pesos = UVB × valor de la UVB, a la centena más próxima", () => {
  assert.equal(UVB_VIGENTE.valor, 12110);
  assert.equal(valorEnPesos(5.46), 66100); // 66.120,6 → 66.100
  assert.equal(valorEnPesos(3.09), 37400); // 37.419,9 → 37.400
  assert.equal(valorEnPesos(1, 12150), 12200); // 12.150 → 12.200 (mitad sube)
});

test("raíces: primer premolar superior birradicular, molares multi, temporales por posición", () => {
  assert.equal(raicesDe(14), "BI");
  assert.equal(raicesDe(44), "UNI");
  assert.equal(raicesDe(36), "MULTI");
  assert.equal(raicesDe(11), "UNI");
  assert.equal(raicesDe(53), "UNI");
  assert.equal(raicesDe(85), "MULTI");
});

test("presupuesto sugerido desde el odontograma", () => {
  const marcas: Marca[] = [
    { diente: 16, hallazgo: "CARIES", superficie: "O" },
    { diente: 16, hallazgo: "CARIES", superficie: "M" },
    { diente: 16, hallazgo: "CARIES", superficie: "D" },
    { diente: 36, hallazgo: "ENDODONCIA_INDICADA" },
    { diente: 14, hallazgo: "ENDODONCIA_INDICADA" },
    { diente: 48, hallazgo: "EXODONCIA_QUIRURGICA_INDICADA" },
    { diente: 48, hallazgo: "CARIES", superficie: "O" }, // se va a extraer: no se obtura
    { diente: 85, hallazgo: "EXODONCIA_SIMPLE_INDICADA" },
    { diente: 27, hallazgo: "SELLANTE_POR_HACER" },
    { diente: 21, hallazgo: "CORONA_MAL_ESTADO" },
    { diente: 17, hallazgo: "RESINA", superficie: "O" }, // ya restaurado: nada que hacer
    { diente: 15, hallazgo: "AMALGAMA", superficie: "O" },
    { diente: 25, hallazgo: "IMPLANTE" },
  ];
  const p = Object.fromEntries(presupuestoDesdeOdontograma(marcas).map((l) => [l.codigo, l]));
  assert.equal(p["36101"].cantidad, 1); // examen
  assert.deepEqual([p["36203"].cantidad, p["36203"].dientes], [1, [16]]); // una obturación
  assert.equal(p["36204"].cantidad, 2); // dos superficies adicionales
  assert.deepEqual(p["36403"].dientes, [36]); // multirradicular
  assert.deepEqual(p["36402"].dientes, [14]); // birradicular
  assert.deepEqual(p["36604"].dientes, [48]); // exodoncia vía abierta multirradicular
  assert.equal(p["36103"].cantidad, 6); // 2 RX por cada endodoncia y por la quirúrgica
  assert.deepEqual(p["36804"].dientes, [85]); // exodoncia temporal
  assert.deepEqual(p["36908"].dientes, [27]); // sellante
  assert.deepEqual(p["36207"].dientes, [21]); // corona anterior
  assert.equal(p["36203"].valorUnitario, valorEnPesos(5.46));
  assert.ok(!p["36201"]);
});
