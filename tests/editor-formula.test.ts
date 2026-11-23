import { test } from "node:test";
import assert from "node:assert/strict";
import { contextoCursor, referenciasDe, celdasDeReferencia, solucionConHuecos } from "../src/lib/clase/editorFormula";
import { CATALOGO, funcionDelCatalogo, funcionesQueEmpiezan, argumentoEn, sintaxis } from "../src/lib/clase/catalogoFunciones";
import { evaluar, type Hoja } from "../src/lib/clase/formulas";

const fin = (t: string) => contextoCursor(t, t.length);

test("contexto: palabra que se escribe, función y argumento", () => {
  assert.deepEqual(fin("=SU").palabra, { texto: "SU", inicio: 1 });
  assert.equal(fin("=B2").palabra, null);
  assert.deepEqual(fin("=SUMAR.SI(B2:B9;").llamada, { nombre: "SUMAR.SI", argumento: 1 });
  assert.deepEqual(fin('=SI(D2="a;b";').llamada, { nombre: "SI", argumento: 1 });
  assert.deepEqual(fin("=REDONDEAR(PROMEDIO(C2:C6)").llamada, { nombre: "REDONDEAR", argumento: 0 });
  assert.deepEqual(fin("=REDONDEAR(PROMEDIO(C2:C6);").llamada, { nombre: "REDONDEAR", argumento: 1 });
  assert.equal(fin('=SI(D2="Can').enTexto, true);
  assert.equal(fin('=SI(D2="Can').palabra, null);
  assert.deepEqual(fin("=SUMA(Turnos[Va").columna, { tabla: "Turnos", parcial: "Va", inicio: 13 });
  assert.equal(fin("=SUMA(").aceptaReferencia, true);
  assert.equal(fin("=SUMA(B2").aceptaReferencia, false);
});

test("referencias con colores (la misma referencia, el mismo color)", () => {
  const r = referenciasDe('=SUMAR.SI(B2:B9;"B3";E2:E9)+B2:B9+Turnos[Valor]');
  assert.deepEqual(r.map((x) => [x.texto, x.color]), [["B2:B9", 0], ["E2:E9", 1], ["B2:B9", 0], ["Turnos[Valor]", 2]]);
  assert.deepEqual(referenciasDe("=SUMA(A1)").map((x) => x.texto), ["A1"]);
});

test("celdas de una referencia, también de tabla", () => {
  const hoja: Hoja = [["Paciente", "Valor"], ["Ana", 1], ["Luis", 2]];
  const tablas = [{ nombre: "Turnos", rango: "A1:B3" }];
  assert.deepEqual(celdasDeReferencia("Turnos[Valor]", hoja, tablas), [{ fila: 1, col: 1 }, { fila: 2, col: 1 }]);
  assert.equal(celdasDeReferencia("A1:B2", hoja).length, 4);
});

test("catálogo: cubre las funciones del motor y sus ejemplos calculan", () => {
  for (const f of ["SUMA", "SUM", "CONTAR.SI", "COUNTIF", "BUSCARX", "CONCAT", "SI.ERROR"]) assert.ok(funcionDelCatalogo(f), f);
  assert.deepEqual(funcionesQueEmpiezan("cont").map((f) => f.nombre), ["CONTAR", "CONTARA", "CONTAR.SI", "CONTAR.SI.CONJUNTO"]);
  assert.equal(funcionesQueEmpiezan("vlo")[0].nombre, "BUSCARV");
  const conjunto = funcionDelCatalogo("CONTAR.SI.CONJUNTO")!;
  assert.equal(argumentoEn(conjunto, 4), 2);
  assert.equal(argumentoEn(conjunto, 5), 3);
  assert.equal(sintaxis(funcionDelCatalogo("SUMAR.SI")!), "SUMAR.SI(rango; criterio; [rango_suma])");
  const hoja: Hoja = Array.from({ length: 30 }, (_, i) => Array.from({ length: 13 }, (_, c) => (c === 0 ? `x${i}` : i)));
  for (const f of CATALOGO) {
    if (/BUSCAR|Profesionales/.test(f.enSalud.formula)) continue;
    assert.doesNotThrow(() => {
      try {
        evaluar(f.enSalud.formula, hoja);
      } catch (e) {
        if (!(e instanceof Error) || !e.message.startsWith("#")) throw e;
      }
    }, f.nombre);
  }
});

test("pista con huecos", () => {
  const nombres = (i: number) => funcionDelCatalogo("SUMAR.SI")!.argumentos[i]?.nombre;
  assert.equal(solucionConHuecos('=SUMAR.SI(B2:B9;"Enfermería";E2:E9)', nombres), "=SUMAR.SI(rango; criterio; rango_suma)");
});
