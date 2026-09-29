import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularTrato, normalizarGuion } from "../src/lib/escena/guion";

const guion = normalizarGuion({
  animoInicial: 1,
  entrada: "¡Por fin!",
  frases: { error: "¿Y ahora?" },
  respuestas: {
    saludo: [
      { texto: "Buenas, disculpe la espera", efecto: 1, respuesta: "Bueno." },
      { texto: "¿Qué necesita?", efecto: 0, respuesta: "Ya le dije." },
      { texto: "Todos esperamos", efecto: -1, respuesta: "¡Grosero!" },
    ],
    alRechazar: [
      { texto: "Le explico con calma", efecto: 2, respuesta: "Entiendo." },
      { texto: "No se puede", efecto: -2, respuesta: "¡Su jefe!" },
    ],
  },
})!;

test("la mejor respuesta en cada momento da 100 de trato", () => {
  assert.equal(calcularTrato(guion, [{ momento: "saludo", indice: 0 }, { momento: "alRechazar", indice: 0 }]), 100);
});

test("la neutra vale la mitad y la peor cero", () => {
  assert.equal(calcularTrato(guion, [{ momento: "saludo", indice: 1 }]), 50);
  assert.equal(calcularTrato(guion, [{ momento: "saludo", indice: 2 }, { momento: "alRechazar", indice: 1 }]), 0);
});

test("solo cuenta la primera respuesta de cada momento", () => {
  assert.equal(calcularTrato(guion, [{ momento: "saludo", indice: 2 }, { momento: "saludo", indice: 0 }]), 0);
});

test("sin respuestas no hay nota de trato", () => {
  assert.equal(calcularTrato(guion, []), null);
});

test("el guion se sanea: sin entrada no hay guion; efectos acotados", () => {
  assert.equal(normalizarGuion({ frases: {} }), null);
  const g = normalizarGuion({ entrada: "Hola", animoInicial: 9, respuestas: { saludo: [{ texto: "x", efecto: 7, respuesta: "y" }, { texto: "" }] } })!;
  assert.equal(g.animoInicial, 4);
  assert.equal(g.respuestas.saludo?.length, 1);
  assert.equal(g.respuestas.saludo?.[0].efecto, 3);
});

import { puntajeRubrica } from "../src/lib/modulos/odontologia/rubrica";

test("rúbrica: sin todos los criterios no hay nota; cumple todo = 100", () => {
  assert.equal(puntajeRubrica({ historia: 2 }), null);
  assert.equal(puntajeRubrica({ historia: 2, odontograma: 2, alerta: 2, bioseguridad: 2 }), 100);
  assert.equal(puntajeRubrica({ historia: 2, odontograma: 1, alerta: 2, bioseguridad: 2 }), 88);
});
