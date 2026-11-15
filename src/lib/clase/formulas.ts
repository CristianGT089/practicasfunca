/**
 * Mini hoja de cálculo para las actividades de la clase: referencias (A1), rangos (A1:B3),
 * + − × ÷, paréntesis y las funciones básicas, en español o en inglés (SUMA o SUM), con los
 * argumentos separados por «;» o «,» como en Google Sheets.
 */

export type Valor = number | string | null;
export type Hoja = Valor[][];

const FUNCIONES: Record<string, string> = {
  SUMA: "SUMA",
  SUM: "SUMA",
  PROMEDIO: "PROMEDIO",
  AVERAGE: "PROMEDIO",
  MAX: "MAX",
  MIN: "MIN",
  CONTAR: "CONTAR",
  COUNT: "CONTAR",
  CONTARA: "CONTARA",
  COUNTA: "CONTARA",
};

/** "C4" → { fila: 3, col: 2 } (desde 0). */
export function celdaAIndices(ref: string): { fila: number; col: number } | null {
  const m = /^\$?([A-Z]{1,2})\$?(\d{1,4})$/.exec(ref.trim().toUpperCase());
  if (!m) return null;
  const col = m[1].split("").reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
  return { fila: Number(m[2]) - 1, col };
}

export function letraColumna(col: number): string {
  let s = "";
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const nombreCelda = (fila: number, col: number) => `${letraColumna(col)}${fila + 1}`;

/** "b2 : a1" → "A1:B2" (de arriba-izquierda a abajo-derecha). null si no es un rango válido. */
export function normalizarRango(texto: string): string | null {
  const partes = texto.replace(/\s/g, "").toUpperCase().split(":");
  if (partes.length !== 2) return null;
  const a = celdaAIndices(partes[0]);
  const b = celdaAIndices(partes[1]);
  if (!a || !b) return null;
  return `${nombreCelda(Math.min(a.fila, b.fila), Math.min(a.col, b.col))}:${nombreCelda(Math.max(a.fila, b.fila), Math.max(a.col, b.col))}`;
}

export class ErrorFormula extends Error {}

type Token = { t: "num" | "ref" | "fn" | "op" | "(" | ")" | "sep" | ":"; v: string };

function tokenizar(f: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < f.length) {
    const c = f[i];
    if (c === " ") {
      i++;
      continue;
    }
    const resto = f.slice(i);
    const num = /^\d+(\.\d+)?/.exec(resto);
    if (num) {
      tokens.push({ t: "num", v: num[0] });
      i += num[0].length;
      continue;
    }
    const pal = /^\$?[A-Za-zÁÉÍÓÚáéíóú]+\$?\d*/.exec(resto);
    if (pal) {
      const v = pal[0].toUpperCase();
      if (/^\$?[A-Z]{1,2}\$?\d+$/.test(v)) tokens.push({ t: "ref", v: v.replace(/\$/g, "") });
      else tokens.push({ t: "fn", v });
      i += pal[0].length;
      continue;
    }
    if ("+-*/".includes(c)) tokens.push({ t: "op", v: c });
    else if (c === "(" || c === ")") tokens.push({ t: c, v: c });
    else if (c === ";" || c === ",") tokens.push({ t: "sep", v: c });
    else if (c === ":") tokens.push({ t: ":", v: c });
    else throw new ErrorFormula(`No entiendo el símbolo «${c}»`);
    i++;
  }
  return tokens;
}

/**
 * Evalúa una fórmula (con o sin «=» al inicio) sobre la hoja. Devuelve un número o lanza
 * ErrorFormula con un mensaje para el estudiante.
 */
export function evaluar(formula: string, hoja: Hoja): number {
  const tokens = tokenizar(formula.trim().replace(/^=/, ""));
  if (!tokens.length) throw new ErrorFormula("La fórmula está vacía");
  let pos = 0;
  const ver = () => tokens[pos];
  const tomar = () => tokens[pos++];

  const valorDe = (ref: string): Valor => {
    const c = celdaAIndices(ref);
    if (!c) throw new ErrorFormula(`«${ref}» no es una celda`);
    return hoja[c.fila]?.[c.col] ?? null;
  };
  const numeroDe = (ref: string): number => {
    const v = valorDe(ref);
    if (v === null || v === "") return 0;
    if (typeof v === "number") return v;
    throw new ErrorFormula(`#¡VALOR! La celda ${ref} tiene texto («${v}»): no se puede hacer cuentas con texto`);
  };
  const celdasDeRango = (a: string, b: string): Valor[] => {
    const r = normalizarRango(`${a}:${b}`);
    if (!r) throw new ErrorFormula("Rango no válido");
    const [ini, fin] = r.split(":").map((x) => celdaAIndices(x)!);
    const out: Valor[] = [];
    for (let f = ini.fila; f <= fin.fila; f++) for (let c = ini.col; c <= fin.col; c++) out.push(hoja[f]?.[c] ?? null);
    return out;
  };

  // Argumento de función: un rango (lista de valores) o una expresión (un número).
  function argumento(): Valor[] {
    const t = ver();
    if (t?.t === "ref" && tokens[pos + 1]?.t === ":") {
      tomar();
      tomar();
      const fin = tomar();
      if (fin?.t !== "ref") throw new ErrorFormula("Después de «:» va otra celda, por ejemplo A1:A5");
      return celdasDeRango(t.v, fin.v);
    }
    if (t?.t === "ref" && (tokens[pos + 1]?.t === "sep" || tokens[pos + 1]?.t === ")")) {
      tomar();
      return [valorDe(t.v)];
    }
    return [expresion()];
  }

  function funcion(nombre: string): number {
    const fn = FUNCIONES[nombre];
    if (!fn) throw new ErrorFormula(`#¿NOMBRE? No conozco la función «${nombre}». Prueba SUMA, PROMEDIO, MAX, MIN o CONTAR`);
    if (tomar()?.t !== "(") throw new ErrorFormula(`Después de ${nombre} van paréntesis: ${nombre}(…)`);
    const valores: Valor[] = [];
    if (ver()?.t !== ")") {
      valores.push(...argumento());
      while (ver()?.t === "sep") {
        tomar();
        valores.push(...argumento());
      }
    }
    if (tomar()?.t !== ")") throw new ErrorFormula("Falta cerrar el paréntesis «)»");
    const nums = valores.filter((v): v is number => typeof v === "number");
    switch (fn) {
      case "SUMA":
        return nums.reduce((a, b) => a + b, 0);
      case "PROMEDIO":
        if (!nums.length) throw new ErrorFormula("#¡DIV/0! No hay números para promediar");
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case "MAX":
        return nums.length ? Math.max(...nums) : 0;
      case "MIN":
        return nums.length ? Math.min(...nums) : 0;
      case "CONTAR":
        return nums.length;
      default:
        return valores.filter((v) => v !== null && v !== "").length;
    }
  }

  function factor(): number {
    const t = tomar();
    if (!t) throw new ErrorFormula("La fórmula quedó incompleta");
    if (t.t === "op" && t.v === "-") return -factor();
    if (t.t === "op" && t.v === "+") return factor();
    if (t.t === "num") return Number(t.v);
    if (t.t === "ref") {
      if (ver()?.t === ":") throw new ErrorFormula("Un rango (A1:A5) va dentro de una función, por ejemplo =SUMA(A1:A5)");
      return numeroDe(t.v);
    }
    if (t.t === "fn") return funcion(t.v);
    if (t.t === "(") {
      const v = expresion();
      if (tomar()?.t !== ")") throw new ErrorFormula("Falta cerrar el paréntesis «)»");
      return v;
    }
    throw new ErrorFormula(`Sobra «${t.v}»`);
  }

  function termino(): number {
    let v = factor();
    while (ver()?.t === "op" && (ver().v === "*" || ver().v === "/")) {
      const op = tomar().v;
      const d = factor();
      if (op === "/" && d === 0) throw new ErrorFormula("#¡DIV/0! No se puede dividir entre cero");
      v = op === "*" ? v * d : v / d;
    }
    return v;
  }

  function expresion(): number {
    let v = termino();
    while (ver()?.t === "op" && (ver().v === "+" || ver().v === "-")) {
      const op = tomar().v;
      const d = termino();
      v = op === "+" ? v + d : v - d;
    }
    return v;
  }

  const resultado = expresion();
  if (pos < tokens.length) throw new ErrorFormula(`Sobra «${tokens[pos].v}» al final`);
  return resultado;
}

/** ¿La fórmula usa la función pedida (en español o en inglés)? */
export function usaFuncion(formula: string, funcion: string): boolean {
  const nombres = Object.entries(FUNCIONES)
    .filter(([, v]) => v === FUNCIONES[funcion.toUpperCase()])
    .map(([k]) => k);
  return nombres.some((n) => new RegExp(`\\b${n}\\s*\\(`, "i").test(formula));
}

/** ¿Usa al menos una referencia a celda (y no solo números escritos a mano)? */
export function usaReferencias(formula: string): boolean {
  return /\$?[A-Z]{1,2}\$?\d+/i.test(formula.replace(/^=/, "").replace(/[A-Za-z]{3,}\s*\(/g, "("));
}

/** Para mostrar un número como lo haría la hoja (hasta 2 decimales, con coma). */
export function mostrarNumero(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
