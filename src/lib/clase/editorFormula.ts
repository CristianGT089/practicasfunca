/**
 * Lo que necesita el asistente de la barra de fórmulas para ayudar mientras se escribe, como
 * Google Sheets: qué palabra se está escribiendo (autocompletar), dentro de qué función y en qué
 * argumento está el cursor (tarjeta de ayuda), si se está escribiendo una columna de tabla
 * (Turnos[…) y qué referencias tiene la fórmula (para pintarlas de colores en la hoja).
 * Todo es puro y sin React: se prueba en tests/editor-formula.test.ts.
 */
import { celdaAIndices, celdasDeRango, normalizarRango, rangoDeTabla, buscarTabla, type Hoja, type TablaHoja } from "./formulas";

const LETRA = "A-Za-zÁÉÍÓÚáéíóúÑñ_";

export type ContextoCursor = {
  /** El cursor está dentro de un texto entre comillas (ahí no se sugiere nada). */
  enTexto: boolean;
  /** La palabra que se está escribiendo justo antes del cursor, si puede ser una función o tabla. */
  palabra: { texto: string; inicio: number } | null;
  /** Se está escribiendo la columna de una tabla: Turnos[Es… */
  columna: { tabla: string; parcial: string; inicio: number } | null;
  /** La función más interna abierta donde está el cursor y en qué argumento (desde 0). */
  llamada: { nombre: string; argumento: number } | null;
  /** Lo que hay antes del cursor deja poner una referencia (después de =, (, ;, :, un operador). */
  aceptaReferencia: boolean;
};

export function contextoCursor(texto: string, cursor: number): ContextoCursor {
  const antes = texto.slice(0, cursor);
  let enTexto = false;
  let enCorchete = false;
  const pila: { nombre: string; argumento: number }[] = [];
  for (let i = 0; i < antes.length; i++) {
    const c = antes[i];
    if (enTexto) {
      if (c === '"' || c === "”" || c === "“") enTexto = false;
      continue;
    }
    if (enCorchete) {
      if (c === "]") enCorchete = false;
      continue;
    }
    if (c === '"' || c === "“" || c === "”") enTexto = true;
    else if (c === "[") enCorchete = true;
    else if (c === "(") {
      const m = new RegExp(`([${LETRA}][${LETRA}\\d.]*)\\s*$`).exec(antes.slice(0, i));
      pila.push({ nombre: m ? m[1].toUpperCase() : "", argumento: 0 });
    } else if (c === ")") pila.pop();
    else if ((c === ";" || c === ",") && pila.length) pila[pila.length - 1].argumento++;
  }
  const abiertas = pila.filter((p) => p.nombre);
  const llamada = abiertas.length ? abiertas[abiertas.length - 1] : null;

  let columna: ContextoCursor["columna"] = null;
  let palabra: ContextoCursor["palabra"] = null;
  if (!enTexto) {
    const col = new RegExp(`([${LETRA}][${LETRA}\\d.]*)?\\[@?([^\\[\\]]*)$`).exec(antes);
    if (col && enCorchete) columna = { tabla: col[1] ?? "", parcial: col[2], inicio: cursor - col[2].length };
    else {
      const m = new RegExp(`(^|[=(;,+\\-*/&<>:\\s])([${LETRA}][${LETRA}\\d.]*)$`).exec(antes);
      // «B2» es una celda, no el comienzo de una función.
      if (m && !/^\$?[A-Za-z]{1,2}\$?\d+$/.test(m[2])) palabra = { texto: m[2], inicio: cursor - m[2].length };
    }
  }
  const aceptaReferencia = !enTexto && !enCorchete && antes.startsWith("=") && /[=(;,+\-*/&<>:\s]$/.test(antes);
  return { enTexto, palabra, columna, llamada, aceptaReferencia };
}

export type Referencia = {
  inicio: number;
  fin: number;
  texto: string;
  /** Mismo color para la misma referencia escrita dos veces. */
  color: number;
};

/** Las referencias de la fórmula (celdas, rangos y de tabla), en orden, con su color. */
export function referenciasDe(texto: string): Referencia[] {
  const out: Referencia[] = [];
  const colores = new Map<string, number>();
  const patron = new RegExp(
    `"[^"]*"?|[“”][^“”]*[“”]?|([${LETRA}][${LETRA}\\d.]*)?\\[[^\\]]*\\]?|(?<![${LETRA}\\d.$])\\$?[A-Za-z]{1,2}\\$?\\d+(?::\\$?[A-Za-z]{1,2}\\$?\\d+)?(?![${LETRA}\\d(\\[])|[${LETRA}][${LETRA}\\d.]*`,
    "g",
  );
  for (const m of texto.matchAll(patron)) {
    const t = m[0];
    if (/^["“”]/.test(t)) continue;
    const esTabla = t.includes("[");
    const esCelda = /^\$?[A-Za-z]{1,2}\$?\d+(:\$?[A-Za-z]{1,2}\$?\d+)?$/.test(t);
    if (!esTabla && !esCelda) continue;
    const clave = t.replace(/\$/g, "").toUpperCase();
    if (!colores.has(clave)) colores.set(clave, colores.size);
    out.push({ inicio: m.index!, fin: m.index! + t.length, texto: t, color: colores.get(clave)! });
  }
  return out;
}

/** Las celdas que abarca una referencia (para pintarlas en la hoja). Vacío si no se entiende. */
export function celdasDeReferencia(ref: string, hoja: Hoja, tablas: TablaHoja[] = []): { fila: number; col: number }[] {
  const tabla = new RegExp(`^([${LETRA}][${LETRA}\\d.]*)?\\[@?([^\\[\\]]*)\\]$`).exec(ref);
  let rango: string | null = null;
  if (tabla) {
    const t = tabla[1] ? buscarTabla(tabla[1], tablas) : tablas[0];
    if (!t) return [];
    try {
      rango = rangoDeTabla(t, hoja, tabla[2] || undefined);
    } catch {
      return [];
    }
  } else if (ref.includes(":")) rango = normalizarRango(ref);
  else {
    const c = celdaAIndices(ref);
    return c ? [c] : [];
  }
  return rango ? celdasDeRango(rango).map((x) => celdaAIndices(x)!) : [];
}

/** Inserta `nuevo` reemplazando de `desde` a `hasta`; devuelve el texto y dónde queda el cursor. */
export function reemplazar(texto: string, desde: number, hasta: number, nuevo: string): { texto: string; cursor: number } {
  return { texto: texto.slice(0, desde) + nuevo + texto.slice(hasta), cursor: desde + nuevo.length };
}

/**
 * La «pista con huecos»: la solución con los argumentos de la función principal cambiados por
 * el nombre de cada argumento, p. ej. =SUMAR.SI(rango; criterio; rango_suma).
 */
export function solucionConHuecos(solucion: string, nombres: (i: number) => string | undefined): string {
  const m = new RegExp(`^=\\s*([${LETRA}][${LETRA}\\d.]*)\\(`).exec(solucion);
  if (!m) return solucion.replace(/\$?[A-Z]{1,2}\$?\d+/g, "___");
  const cuerpo = solucion.slice(m[0].length);
  let nivel = 0;
  let enTexto = false;
  let fin = cuerpo.length;
  let n = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    if (c === '"') enTexto = !enTexto;
    if (enTexto) continue;
    if (c === "(") nivel++;
    else if (c === ")") {
      if (nivel === 0) {
        fin = i;
        break;
      }
      nivel--;
    } else if (c === ";" && nivel === 0) n++;
  }
  const args = Array.from({ length: cuerpo.slice(0, fin).trim() ? n + 1 : 0 }, (_, i) => nombres(i) ?? "___");
  return `=${m[1]}(${args.join("; ")})${cuerpo.slice(fin + 1)}`;
}
