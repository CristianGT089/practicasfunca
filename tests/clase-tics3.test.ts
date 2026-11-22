import { test } from "node:test";
import assert from "node:assert/strict";
import { TICS_3 } from "../src/lib/clase/lecciones/tics3";
import { celdaAIndices, celdasDeRango, desplazar, evaluar, type Hoja } from "../src/lib/clase/formulas";
import { calcularDinamica, faltaEnDinamica, type ConfigDinamica } from "../src/lib/clase/dinamica";

test("clase 3: ids únicos", () => {
  const ids = TICS_3.diapositivas.flatMap((d) => ("id" in d ? [d.id] : []));
  assert.equal(new Set(ids).size, ids.length);
});

test("clase 3: cada solución de fórmulas calcula sin error, también al copiarla", () => {
  for (const d of TICS_3.diapositivas) {
    if (d.tipo !== "actividad" || d.actividad !== "formulas") continue;
    const hoja: Hoja = d.datos.map((f) => [...f]);
    for (const r of d.retos) {
      const origen = celdaAIndices(r.celda)!;
      for (const celda of r.copiar ? celdasDeRango(r.copiar) : [r.celda]) {
        const c = celdaAIndices(celda)!;
        const f = desplazar(r.solucion, c.fila - origen.fila, c.col - origen.col);
        const v = evaluar(f, hoja);
        assert.notEqual(v, null, `${d.id} ${celda}: ${f}`);
        while (hoja.length <= c.fila) hoja.push([]);
        hoja[c.fila][c.col] = v;
      }
    }
  }
});

test("clase 3: las respuestas de la tabla dinámica salen de la tabla", () => {
  for (const d of TICS_3.diapositivas) {
    if (d.tipo !== "actividad" || d.actividad !== "dinamica") continue;
    for (const r of d.retos) {
      const c: ConfigDinamica = { filas: r.filas ?? null, columnas: r.columnas ?? null, valores: r.valores ?? null, filtro: r.filtro ?? null };
      assert.equal(faltaEnDinamica(c, r), null);
      if (r.respuesta === undefined) continue;
      const t = calcularDinamica(d.datos, c);
      assert.ok(t.celdas.flat().some((x) => x !== null && Math.abs(x - r.respuesta!) < 0.5), `${r.texto} → ${r.respuesta}`);
    }
  }
});
