/**
 * Mini hoja de cálculo para las actividades de la clase. Entiende referencias (A1, $A$1), rangos
 * (A1:B3), + − × ÷, & (unir texto), comparaciones (= <> < > <= >=), textos entre comillas,
 * VERDADERO/FALSO y las funciones del curso, en español o en inglés (SUMA o SUM), con los
 * argumentos separados por «;» o «,» como en Google Sheets.
 *
 * Primero arma el árbol de la fórmula y después lo evalúa: así SI.ERROR puede atrapar el error
 * de su primer argumento y SI solo calcula la rama que toca, como en Sheets.
 */

export type Valor = number | string | boolean | null;
export type Hoja = Valor[][];

/**
 * Una tabla con nombre dentro de la hoja (como «Formato › Convertir en tabla» en Sheets): la
 * primera fila de `rango` son los encabezados y el resto, los datos. Con ella se escribe
 * `Turnos[Estado]` en vez de `$D$2:$D$9`: no hay que contar filas ni poner $ al copiar.
 */
export type TablaHoja = { nombre: string; rango: string };

/** Opciones de `evaluar`: las tablas de la hoja y la celda donde va la fórmula (para `[@Columna]`). */
export type OpcionesEvaluar = { tablas?: TablaHoja[]; celda?: string };

/** Nombre que escribe el estudiante → nombre canónico (en español). */
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
  SI: "SI",
  IF: "SI",
  Y: "Y",
  AND: "Y",
  O: "O",
  OR: "O",
  "CONTAR.SI": "CONTAR.SI",
  COUNTIF: "CONTAR.SI",
  "SUMAR.SI": "SUMAR.SI",
  SUMIF: "SUMAR.SI",
  "PROMEDIO.SI": "PROMEDIO.SI",
  AVERAGEIF: "PROMEDIO.SI",
  "CONTAR.SI.CONJUNTO": "CONTAR.SI.CONJUNTO",
  COUNTIFS: "CONTAR.SI.CONJUNTO",
  "SUMAR.SI.CONJUNTO": "SUMAR.SI.CONJUNTO",
  SUMIFS: "SUMAR.SI.CONJUNTO",
  CONCATENAR: "CONCATENAR",
  CONCATENATE: "CONCATENAR",
  CONCAT: "CONCATENAR",
  REDONDEAR: "REDONDEAR",
  ROUND: "REDONDEAR",
  HOY: "HOY",
  TODAY: "HOY",
  "SI.ERROR": "SI.ERROR",
  IFERROR: "SI.ERROR",
  BUSCARV: "BUSCARV",
  VLOOKUP: "BUSCARV",
  BUSCARX: "BUSCARX",
  XLOOKUP: "BUSCARX",
};

const BOOLEANOS: Record<string, boolean> = { VERDADERO: true, TRUE: true, FALSO: false, FALSE: false };

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
  const partes = texto.replace(/[\s$]/g, "").toUpperCase().split(":");
  if (partes.length !== 2) return null;
  const a = celdaAIndices(partes[0]);
  const b = celdaAIndices(partes[1]);
  if (!a || !b) return null;
  return `${nombreCelda(Math.min(a.fila, b.fila), Math.min(a.col, b.col))}:${nombreCelda(Math.max(a.fila, b.fila), Math.max(a.col, b.col))}`;
}

/** Celdas de un rango "E2:E6", en orden (filas y luego columnas). */
export function celdasDeRango(rango: string): string[] {
  const r = normalizarRango(rango);
  if (!r) return [];
  const [a, b] = r.split(":").map((x) => celdaAIndices(x)!);
  const out: string[] = [];
  for (let f = a.fila; f <= b.fila; f++) for (let c = a.col; c <= b.col; c++) out.push(nombreCelda(f, c));
  return out;
}

/** Error de escritura de la fórmula (no se puede ni calcular). */
export class ErrorFormula extends Error {}

/** Error de cálculo (#N/A, #¡DIV/0!…): SI.ERROR lo puede atrapar. */
export class ErrorCelda extends ErrorFormula {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(`${codigo} ${mensaje}`);
  }
}

type Token =
  | { t: "num" | "str" | "ref" | "fn" | "op" | "(" | ")" | "sep" | ":"; v: string }
  /** Referencia de tabla: `Turnos[Estado]`, `Turnos[@Estado]`, `[@Estado]` o `Turnos[#Todo]`. */
  | { t: "tabla"; v: string; tabla: string; columna: string; fila: boolean };

/** `Turnos[Estado]`, `Turnos[@Estado]`, `[@Estado]` o `Turnos[[#Esta fila];[Estado]]` (Excel). */
const REF_TABLA = /^([A-Za-zÁÉÍÓÚáéíóúÑñ_][\wÁÉÍÓÚáéíóúÑñ.]*)?\[(?:\[#(?:esta fila|this row)\][;,]\s*\[([^\[\]]+)\]|(@?)([^\[\]]*))\]/i;

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
    if (c === '"' || c === "“" || c === "”") {
      const fin = resto.slice(1).search(/["“”]/);
      if (fin === -1) throw new ErrorFormula("Falta cerrar las comillas: los textos van entre comillas, por ejemplo \"Cancelado\"");
      tokens.push({ t: "str", v: resto.slice(1, fin + 1) });
      i += fin + 2;
      continue;
    }
    const tabla = REF_TABLA.exec(resto);
    if (tabla) {
      const fila = !!tabla[2] || tabla[3] === "@";
      const columna = (tabla[2] ?? tabla[4]).trim();
      if (!tabla[1] && !fila) throw new ErrorFormula(`Falta el nombre de la tabla antes de «[${columna}]», por ejemplo Turnos[${columna || "Estado"}]`);
      tokens.push({ t: "tabla", v: tabla[0], tabla: tabla[1] ?? "", columna, fila });
      i += tabla[0].length;
      continue;
    }
    if (c === "[" || c === "]") throw new ErrorFormula("Los corchetes van pegados al nombre de la tabla: Turnos[Estado]");
    const num = /^\d+(\.\d+)?/.exec(resto);
    if (num) {
      tokens.push({ t: "num", v: num[0] });
      i += num[0].length;
      continue;
    }
    if (/^\$?[A-Za-z]{1,2}\s*:\s*\$?[A-Za-z]{1,2}(?![A-Za-z\d])/.test(resto))
      throw new ErrorFormula("En esta hoja usa el rango con números de fila, por ejemplo C2:C7 en vez de C:C");
    const pal = /^\$?[A-Za-zÁÉÍÓÚáéíóúÑñ_]+(\.[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*\$?\d*(?:_[\wÁÉÍÓÚáéíóúÑñ]*)*/.exec(resto);
    if (pal) {
      const v = pal[0].toUpperCase();
      if (/^\$?[A-Z]{1,2}\$?\d+$/.test(v)) tokens.push({ t: "ref", v });
      else tokens.push({ t: "fn", v });
      i += pal[0].length;
      continue;
    }
    const op = /^(<>|<=|>=|[+\-*/&=<>])/.exec(resto);
    if (op) {
      tokens.push({ t: "op", v: op[0] });
      i += op[0].length;
      continue;
    }
    if (c === "(" || c === ")") tokens.push({ t: c, v: c });
    else if (c === ";" || c === ",") tokens.push({ t: "sep", v: c });
    else if (c === ":") tokens.push({ t: ":", v: c });
    else throw new ErrorFormula(`No entiendo el símbolo «${c}»`);
    i++;
  }
  return tokens;
}

type Nodo =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "ref"; ref: string }
  | { k: "rango"; a: string; b: string }
  | { k: "tabla"; tabla: string; columna: string; fila: boolean; escrito: string }
  /** Un nombre suelto (sin paréntesis): puede ser una tabla entera, p. ej. BUSCARV(B2; Profesionales; 2; FALSO). */
  | { k: "nombre"; v: string }
  | { k: "fn"; nombre: string; escrito: string; args: Nodo[] }
  | { k: "bin"; op: string; a: Nodo; b: Nodo }
  | { k: "neg"; a: Nodo };

/**
 * Agrega los «)» que faltan al final, como hace Sheets al pulsar Enter: =SUMA(B2:B7 → =SUMA(B2:B7).
 * No cuenta los paréntesis que van dentro de textos entre comillas ni de corchetes de tabla.
 */
export function completarParentesis(formula: string): string {
  let abiertos = 0;
  let enTexto = false;
  let enCorchete = false;
  for (const c of formula) {
    if (enTexto) {
      if (c === '"' || c === "”" || c === "“") enTexto = false;
    } else if (enCorchete) {
      if (c === "]") enCorchete = false;
    } else if (c === '"' || c === "“" || c === "”") enTexto = true;
    else if (c === "[") enCorchete = true;
    else if (c === "(") abiertos++;
    else if (c === ")" && abiertos > 0) abiertos--;
  }
  // Si quedó un texto sin cerrar, no se adivina: que el error lo diga.
  return enTexto || abiertos === 0 ? formula : formula.trimEnd() + ")".repeat(abiertos);
}

function analizar(formula: string): Nodo {
  const tokens = tokenizar(completarParentesis(formula.trim()).replace(/^=/, ""));
  if (!tokens.length) throw new ErrorFormula("La fórmula está vacía");
  let pos = 0;
  const ver = () => tokens[pos];
  const tomar = () => tokens[pos++];
  const esOp = (...ops: string[]) => ver()?.t === "op" && ops.includes(ver().v);

  function comparacion(): Nodo {
    let a = concatenacion();
    while (esOp("=", "<>", "<", ">", "<=", ">=")) {
      const op = tomar().v;
      a = { k: "bin", op, a, b: concatenacion() };
    }
    return a;
  }
  function concatenacion(): Nodo {
    let a = suma();
    while (esOp("&")) {
      tomar();
      a = { k: "bin", op: "&", a, b: suma() };
    }
    return a;
  }
  function suma(): Nodo {
    let a = termino();
    while (esOp("+", "-")) {
      const op = tomar().v;
      a = { k: "bin", op, a, b: termino() };
    }
    return a;
  }
  function termino(): Nodo {
    let a = factor();
    while (esOp("*", "/")) {
      const op = tomar().v;
      a = { k: "bin", op, a, b: factor() };
    }
    return a;
  }
  function factor(): Nodo {
    if (esOp("-")) {
      tomar();
      return { k: "neg", a: factor() };
    }
    if (esOp("+")) {
      tomar();
      return factor();
    }
    return primario();
  }
  function primario(): Nodo {
    const t = tomar();
    if (!t) throw new ErrorFormula("La fórmula quedó incompleta");
    if (t.t === "tabla") return { k: "tabla", tabla: t.tabla, columna: t.columna, fila: t.fila, escrito: t.v };
    if (t.t === "num") return { k: "num", v: Number(t.v) };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "ref") {
      if (ver()?.t === ":") {
        tomar();
        const fin = tomar();
        if (fin?.t !== "ref") throw new ErrorFormula("Después de «:» va otra celda, por ejemplo A1:A5");
        return { k: "rango", a: t.v, b: fin.v };
      }
      return { k: "ref", ref: t.v };
    }
    if (t.t === "fn") {
      if (ver()?.t !== "(") {
        if (t.v in BOOLEANOS) return { k: "bool", v: BOOLEANOS[t.v] };
        // Puede ser el nombre de una tabla: se resuelve al evaluar, cuando se conocen las tablas.
        return { k: "nombre", v: t.v };
      }
      const nombre = FUNCIONES[t.v];
      if (!nombre) throw new ErrorCelda("#¿NOMBRE?", `No conozco la función «${t.v}». Revisa cómo se escribe.`);
      tomar();
      const args: Nodo[] = [];
      if (ver()?.t !== ")") {
        args.push(comparacion());
        while (ver()?.t === "sep") {
          tomar();
          args.push(comparacion());
        }
      }
      if (tomar()?.t !== ")") throw new ErrorFormula(`Falta cerrar el paréntesis «)» de ${t.v}`);
      return { k: "fn", nombre, escrito: t.v, args };
    }
    if (t.t === "(") {
      const v = comparacion();
      if (tomar()?.t !== ")") throw new ErrorFormula("Falta cerrar el paréntesis «)»");
      return v;
    }
    if (t.t === "sep") throw new ErrorFormula("Sobra un «;» o le falta algo antes");
    throw new ErrorFormula(`Sobra «${t.v}»`);
  }

  const raiz = comparacion();
  if (pos < tokens.length) throw new ErrorFormula(`Sobra «${tokens[pos].v}» al final`);
  return raiz;
}

// ───────────────────────── Valores ─────────────────────────

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Días desde el 30/12/1899, como guardan las fechas Sheets y Excel. */
function serialFecha(anio: number, mes: number, dia: number): number {
  return Math.round((Date.UTC(anio, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000);
}

/** "15/12/2026" → número de fecha; null si no es una fecha. */
function fechaDeTexto(t: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t.trim());
  return m ? serialFecha(Number(m[3]), Number(m[2]), Number(m[1])) : null;
}

/** Número a partir de un texto que parece número o fecha ("1500", "36,5", "15/12/2026"). */
function numeroDeTexto(t: string): number | null {
  if (/^-?\d+([.,]\d+)?$/.test(t.trim())) return Number(t.trim().replace(",", "."));
  return fechaDeTexto(t);
}

const vacio = (v: Valor) => v === null || v === "";

function aTexto(v: Valor): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO";
  if (typeof v === "number") return String(Math.round(v * 1e9) / 1e9).replace(".", ",");
  return v;
}

/** Compara como Sheets: números con números (las fechas en texto cuentan como número), lo demás como texto sin mayúsculas. */
function comparar(a: Valor, b: Valor): number {
  const na = typeof a === "number" ? a : typeof a === "boolean" ? null : vacio(a) && typeof b === "number" ? 0 : a !== null ? numeroDeTexto(a) : null;
  const nb = typeof b === "number" ? b : typeof b === "boolean" ? null : vacio(b) && typeof a === "number" ? 0 : b !== null ? numeroDeTexto(b) : null;
  if ((typeof a === "number" || typeof b === "number") && na !== null && nb !== null) return na - nb;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return sinTildes(aTexto(a)).localeCompare(sinTildes(aTexto(b)));
}

/** ¿El valor cumple el criterio de CONTAR.SI? (">50", "<>Cancelado", "Urgente", 3, "Enf*"). */
function cumpleCriterio(v: Valor, criterio: Valor): boolean {
  if (typeof criterio === "number") return comparar(v, criterio) === 0 && !vacio(v);
  if (typeof criterio === "boolean") return v === criterio;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(criterio ?? "")!;
  const op = m[1] ?? "=";
  const resto = m[2];
  const n = numeroDeTexto(resto);
  if (n !== null) {
    const nv = typeof v === "number" ? v : typeof v === "string" ? numeroDeTexto(v) : null;
    if (nv === null) return op === "<>";
    const d = nv - n;
    return { "=": d === 0, "<>": d !== 0, "<": d < 0, ">": d > 0, "<=": d <= 0, ">=": d >= 0 }[op]!;
  }
  if (op === "=" || op === "<>") {
    let igual: boolean;
    if (resto === "") igual = vacio(v);
    else {
      const patron = new RegExp(
        "^" +
          sinTildes(resto)
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".") +
          "$",
      );
      igual = patron.test(sinTildes(aTexto(v)));
    }
    return op === "=" ? igual : !igual;
  }
  if (typeof v !== "string") return false;
  const d = sinTildes(v).localeCompare(sinTildes(resto));
  return { "<": d < 0, ">": d > 0, "<=": d <= 0, ">=": d >= 0 }[op as "<" | ">" | "<=" | ">="];
}

/**
 * Evalúa una fórmula (con o sin «=» al inicio) sobre la hoja. Devuelve el valor de la celda o
 * lanza ErrorFormula (no se pudo leer) / ErrorCelda (#N/A, #¡DIV/0!…) con un mensaje para el estudiante.
 */
export function evaluar(formula: string, hoja: Hoja, opciones: OpcionesEvaluar = {}): Valor {
  const raiz = resolverTablas(analizar(formula), hoja, opciones);
  type Matriz = Valor[][];

  const celda = (ref: string): Valor => {
    const c = celdaAIndices(ref);
    if (!c) throw new ErrorFormula(`«${ref}» no es una celda`);
    return hoja[c.fila]?.[c.col] ?? null;
  };
  const matriz = (a: string, b: string): Matriz => {
    const r = normalizarRango(`${a}:${b}`);
    if (!r) throw new ErrorFormula("Rango no válido");
    const [ini, fin] = r.split(":").map((x) => celdaAIndices(x)!);
    const out: Matriz = [];
    for (let f = ini.fila; f <= fin.fila; f++) {
      const fila: Valor[] = [];
      for (let c = ini.col; c <= fin.col; c++) fila.push(hoja[f]?.[c] ?? null);
      out.push(fila);
    }
    return out;
  };

  function rangoDe(n: Nodo, para: string): Matriz {
    if (n.k === "rango") return matriz(n.a, n.b);
    if (n.k === "ref") return [[celda(n.ref)]];
    throw new ErrorFormula(`En ${para} aquí va un rango de celdas, por ejemplo B2:B20`);
  }

  function escalar(n: Nodo): Valor {
    switch (n.k) {
      case "num":
        return n.v;
      case "str":
        return n.v;
      case "bool":
        return n.v;
      case "ref":
        return celda(n.ref);
      case "rango":
        throw new ErrorFormula(`Un rango (${n.a}:${n.b}) va dentro de una función, por ejemplo =SUMA(${n.a}:${n.b})`);
      case "neg":
        return -numero(n.a);
      case "fn":
        return funcion(n);
      case "tabla":
      case "nombre":
        throw new ErrorFormula("Referencia de tabla sin resolver");
      case "bin": {
        if (n.op === "&") return aTexto(escalar(n.a)) + aTexto(escalar(n.b));
        if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
          const d = comparar(escalar(n.a), escalar(n.b));
          return { "=": d === 0, "<>": d !== 0, "<": d < 0, ">": d > 0, "<=": d <= 0, ">=": d >= 0 }[n.op]!;
        }
        const a = numero(n.a);
        const b = numero(n.b);
        if (n.op === "+") return a + b;
        if (n.op === "-") return a - b;
        if (n.op === "*") return a * b;
        if (b === 0) throw new ErrorCelda("#¡DIV/0!", "No se puede dividir entre cero (o entre una celda vacía).");
        return a / b;
      }
    }
  }

  function numero(n: Nodo): number {
    const v = escalar(n);
    if (v === null || v === "") return 0;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const t = numeroDeTexto(v);
    if (t !== null) return t;
    const donde = n.k === "ref" ? `La celda ${n.ref.replace(/\$/g, "")} tiene texto` : "Hay un texto";
    throw new ErrorCelda("#¡VALOR!", `${donde} («${v}»): no se puede hacer cuentas con texto.`);
  }

  const booleano = (n: Nodo): boolean => {
    const v = escalar(n);
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (vacio(v)) return false;
    throw new ErrorCelda("#¡VALOR!", `La condición tiene que dar VERDADERO o FALSO; dio «${v}». Revisa la comparación (por ejemplo B2>50).`);
  };

  /** Valores de los argumentos de SUMA, PROMEDIO…: de los rangos, solo los números; de los sueltos, convertidos. */
  function numerosDe(args: Nodo[]): number[] {
    const out: number[] = [];
    for (const a of args) {
      if (a.k === "rango") {
        for (const v of matriz(a.a, a.b).flat()) if (typeof v === "number") out.push(v);
      } else if (a.k === "ref") {
        const v = celda(a.ref);
        if (typeof v === "number") out.push(v);
      } else out.push(numero(a));
    }
    return out;
  }

  function cuantos(n: { args: Nodo[]; escrito: string }, min: number, max = min, uso = "") {
    if (n.args.length < min || n.args.length > max)
      throw new ErrorFormula(`${n.escrito} ${min === max ? `lleva ${min}` : `lleva de ${min} a ${max}`} dato${max === 1 ? "" : "s"} separados por «;»${uso ? `: ${uso}` : ""}.`);
  }

  function funcion(n: Extract<Nodo, { k: "fn" }>): Valor {
    const a = n.args;
    switch (n.nombre) {
      case "SUMA":
        return numerosDe(a).reduce((x, y) => x + y, 0);
      case "PROMEDIO": {
        const nums = numerosDe(a);
        if (!nums.length) throw new ErrorCelda("#¡DIV/0!", "No hay números para promediar.");
        return nums.reduce((x, y) => x + y, 0) / nums.length;
      }
      case "MAX": {
        const nums = numerosDe(a);
        return nums.length ? Math.max(...nums) : 0;
      }
      case "MIN": {
        const nums = numerosDe(a);
        return nums.length ? Math.min(...nums) : 0;
      }
      case "CONTAR":
        return numerosDe(a).length;
      case "CONTARA":
        return a.flatMap((x) => (x.k === "rango" || x.k === "ref" ? rangoDe(x, n.escrito).flat() : [escalar(x)])).filter((v) => !vacio(v)).length;
      case "SI": {
        cuantos(n, 2, 3, `=SI(condición; si se cumple; si no)`);
        if (booleano(a[0])) return escalar(a[1]);
        return a[2] ? escalar(a[2]) : false;
      }
      case "Y":
        return a.every((x) => booleano(x));
      case "O":
        return a.some((x) => booleano(x));
      case "CONTAR.SI": {
        cuantos(n, 2, 2, "=CONTAR.SI(rango; criterio)");
        const crit = escalar(a[1]);
        return rangoDe(a[0], n.escrito).flat().filter((v) => cumpleCriterio(v, crit)).length;
      }
      case "SUMAR.SI":
      case "PROMEDIO.SI": {
        cuantos(n, 2, 3, `=${n.escrito}(rango; criterio; rango a sumar)`);
        const donde = rangoDe(a[0], n.escrito).flat();
        const valores = a[2] ? rangoDe(a[2], n.escrito).flat() : donde;
        if (valores.length !== donde.length) throw new ErrorCelda("#¡VALOR!", "El rango del criterio y el rango a sumar deben tener el mismo tamaño.");
        const crit = escalar(a[1]);
        const nums = donde.flatMap((v, i) => (cumpleCriterio(v, crit) && typeof valores[i] === "number" ? [valores[i] as number] : []));
        if (n.nombre === "SUMAR.SI") return nums.reduce((x, y) => x + y, 0);
        if (!nums.length) throw new ErrorCelda("#¡DIV/0!", "Ninguna fila cumple el criterio: no hay nada que promediar.");
        return nums.reduce((x, y) => x + y, 0) / nums.length;
      }
      case "CONTAR.SI.CONJUNTO":
      case "SUMAR.SI.CONJUNTO": {
        const suma = n.nombre === "SUMAR.SI.CONJUNTO";
        const pares = suma ? a.slice(1) : a;
        if (pares.length < 2 || pares.length % 2)
          throw new ErrorFormula(
            suma
              ? `${n.escrito} empieza con el rango a sumar y sigue con parejas rango; criterio: =${n.escrito}(F2:F20; B2:B20; "Urgencias"; C2:C20; "Urgente")`
              : `${n.escrito} va con parejas rango; criterio: =${n.escrito}(B2:B20; "Urgencias"; C2:C20; "Urgente")`,
          );
        const valores = suma ? rangoDe(a[0], n.escrito).flat() : null;
        const condiciones = [];
        for (let i = 0; i < pares.length; i += 2) condiciones.push({ rango: rangoDe(pares[i], n.escrito).flat(), crit: escalar(pares[i + 1]) });
        const largo = valores?.length ?? condiciones[0].rango.length;
        if (condiciones.some((c) => c.rango.length !== largo)) throw new ErrorCelda("#¡VALOR!", "Todos los rangos deben tener el mismo tamaño (las mismas filas).");
        let total = 0;
        for (let i = 0; i < largo; i++) {
          if (!condiciones.every((c) => cumpleCriterio(c.rango[i], c.crit))) continue;
          if (!valores) total++;
          else if (typeof valores[i] === "number") total += valores[i] as number;
        }
        return total;
      }
      case "CONCATENAR":
        return a.map((x) => (x.k === "rango" ? matriz(x.a, x.b).flat().map(aTexto).join("") : aTexto(escalar(x)))).join("");
      case "REDONDEAR": {
        cuantos(n, 1, 2, "=REDONDEAR(número; decimales)");
        const v = numero(a[0]);
        const d = a[1] ? Math.trunc(numero(a[1])) : 0;
        const f = 10 ** d;
        return (Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9)) / f;
      }
      case "HOY": {
        if (a.length) throw new ErrorFormula(`${n.escrito} no lleva nada entre los paréntesis: =${n.escrito}()`);
        const h = new Date();
        return serialFecha(h.getFullYear(), h.getMonth() + 1, h.getDate());
      }
      case "SI.ERROR": {
        cuantos(n, 2, 2, `=${n.escrito}(fórmula; qué mostrar si da error)`);
        try {
          return escalar(a[0]);
        } catch (e) {
          if (e instanceof ErrorCelda) return escalar(a[1]);
          throw e;
        }
      }
      case "BUSCARV": {
        cuantos(n, 3, 4, `=${n.escrito}(qué busco; tabla; columna; FALSO)`);
        const buscado = escalar(a[0]);
        const tabla = rangoDe(a[1], n.escrito);
        const col = Math.trunc(numero(a[2]));
        if (col < 1) throw new ErrorCelda("#¡VALOR!", "El número de columna empieza en 1 (la primera columna de la tabla).");
        if (col > (tabla[0]?.length ?? 0)) throw new ErrorCelda("#¡REF!", `La tabla solo tiene ${tabla[0]?.length ?? 0} columnas y pediste la ${col}.`);
        const exacta = a[3] ? !booleano(a[3]) : false;
        let fila = -1;
        if (exacta) fila = tabla.findIndex((f) => !vacio(f[0]) && comparar(f[0], buscado) === 0);
        else {
          // Coincidencia aproximada (búsqueda binaria, como Sheets): solo sirve con la primera columna ordenada.
          let lo = 0;
          let hi = tabla.length - 1;
          while (lo <= hi) {
            const m = (lo + hi) >> 1;
            if (comparar(tabla[m][0], buscado) <= 0) {
              fila = m;
              lo = m + 1;
            } else hi = m - 1;
          }
        }
        if (fila === -1) throw new ErrorCelda("#N/A", `No encontré «${aTexto(buscado)}» en la primera columna de la tabla.`);
        return tabla[fila][col - 1];
      }
      case "BUSCARX": {
        cuantos(n, 3, 4, `=${n.escrito}(qué busco; dónde lo busco; qué devuelvo; si no lo encuentra)`);
        const buscado = escalar(a[0]);
        const donde = rangoDe(a[1], n.escrito);
        const resultado = rangoDe(a[2], n.escrito);
        const vertical = donde.length > 1 || donde[0].length === 1;
        const lista = vertical ? donde.map((f) => f[0]) : donde[0];
        if ((vertical && donde[0].length > 1) || (!vertical && donde.length > 1))
          throw new ErrorFormula("El rango donde se busca debe ser una sola columna (o una sola fila).");
        const res = vertical ? resultado.map((f) => f[0]) : resultado[0];
        if ((vertical ? resultado[0].length : resultado.length) > 1) throw new ErrorFormula("En esta hoja, el rango que se devuelve debe ser una sola columna.");
        if (res.length !== lista.length) throw new ErrorCelda("#¡VALOR!", "El rango donde buscas y el que devuelves deben tener el mismo número de filas.");
        const i = lista.findIndex((v) => !vacio(v) && comparar(v, buscado) === 0);
        if (i === -1) {
          if (a[3]) return escalar(a[3]);
          throw new ErrorCelda("#N/A", `No encontré «${aTexto(buscado)}» en el rango donde buscas.`);
        }
        return res[i];
      }
    }
    throw new ErrorCelda("#¿NOMBRE?", `No conozco la función «${n.escrito}».`);
  }

  const v = escalar(raiz);
  if (raiz.k === "rango") throw new ErrorFormula("Un rango solo va dentro de una función");
  return v;
}

const mismoNombre = (a: string, b: string) => sinTildes(a) === sinTildes(b);

/** La tabla por su nombre (sin importar mayúsculas ni tildes). */
export function buscarTabla(nombre: string, tablas: TablaHoja[] = []): TablaHoja | undefined {
  return tablas.find((t) => mismoNombre(t.nombre, nombre));
}

/** Encabezados de una tabla, con la columna (letra) de cada uno. */
export function columnasDeTabla(tabla: TablaHoja, hoja: Hoja): { nombre: string; col: number }[] {
  const r = normalizarRango(tabla.rango);
  if (!r) return [];
  const [ini, fin] = r.split(":").map((x) => celdaAIndices(x)!);
  const out: { nombre: string; col: number }[] = [];
  for (let c = ini.col; c <= fin.col; c++) out.push({ nombre: aTexto(hoja[ini.fila]?.[c] ?? null), col: c });
  return out;
}

/** El rango de datos de una tabla (sin encabezados), entera o de una columna: "B2:B9". */
export function rangoDeTabla(tabla: TablaHoja, hoja: Hoja, columna?: string): string {
  const r = normalizarRango(tabla.rango)!;
  const [ini, fin] = r.split(":").map((x) => celdaAIndices(x)!);
  if (!columna || /^#(todo|all|datos|data)$/i.test(columna)) return `${nombreCelda(ini.fila + 1, ini.col)}:${nombreCelda(fin.fila, fin.col)}`;
  const cols = columnasDeTabla(tabla, hoja);
  const c = cols.find((x) => mismoNombre(x.nombre, columna));
  if (!c)
    throw new ErrorCelda("#¡REF!", `La tabla ${tabla.nombre} no tiene la columna «${columna}». Sus columnas son: ${cols.map((x) => x.nombre).join(", ")}.`);
  return `${nombreCelda(ini.fila + 1, c.col)}:${nombreCelda(fin.fila, c.col)}`;
}

/** Cambia las referencias de tabla por los rangos que representan. */
function resolverTablas(n: Nodo, hoja: Hoja, op: OpcionesEvaluar): Nodo {
  const tablas = op.tablas ?? [];
  const sinTabla = (nombre: string) =>
    new ErrorCelda(
      "#¿NOMBRE?",
      tablas.length
        ? `No hay una tabla llamada «${nombre}». ${tablas.length === 1 ? "La tabla de esta hoja es" : "Las tablas de esta hoja son"}: ${tablas.map((t) => t.nombre).join(", ")}.`
        : `No entiendo «${nombre}». Si es un texto, va entre comillas: "${nombre.toLowerCase()}". Si es una función, le faltan los paréntesis.`,
    );
  switch (n.k) {
    case "nombre": {
      const t = buscarTabla(n.v, tablas);
      if (!t) throw sinTabla(n.v);
      const [a, b] = rangoDeTabla(t, hoja).split(":");
      return { k: "rango", a, b };
    }
    case "tabla": {
      let t = n.tabla ? buscarTabla(n.tabla, tablas) : undefined;
      // [@Columna] sin nombre: la tabla donde está la celda de la fórmula.
      if (!n.tabla) {
        const c = op.celda ? celdaAIndices(op.celda) : null;
        t = tablas.find((x) => {
          const r = normalizarRango(x.rango);
          if (!r || !c) return false;
          const [i, f] = r.split(":").map((y) => celdaAIndices(y)!);
          return c.fila > i.fila && c.fila <= f.fila && c.col >= i.col && c.col <= f.col + 1;
        });
        if (!t) throw new ErrorCelda("#¡REF!", `[@${n.columna}] solo funciona en una celda dentro de la tabla. Escribe el nombre de la tabla: Tabla[@${n.columna}].`);
      }
      if (!t) throw sinTabla(n.tabla);
      const [a, b] = rangoDeTabla(t, hoja, n.columna).split(":");
      if (!n.fila) return { k: "rango", a, b };
      const c = op.celda ? celdaAIndices(op.celda) : null;
      const ini = celdaAIndices(a)!;
      const fin = celdaAIndices(b)!;
      if (!c || c.fila < ini.fila || c.fila > fin.fila)
        throw new ErrorCelda("#¡VALOR!", `${n.escrito} trae el dato de la misma fila, así que solo sirve en una fila de la tabla.`);
      return { k: "ref", ref: nombreCelda(c.fila, ini.col) };
    }
    case "fn":
      return { ...n, args: n.args.map((x) => resolverTablas(x, hoja, op)) };
    case "bin":
      return { ...n, a: resolverTablas(n.a, hoja, op), b: resolverTablas(n.b, hoja, op) };
    case "neg":
      return { ...n, a: resolverTablas(n.a, hoja, op) };
    default:
      return n;
  }
}

/** ¿Usa referencias de tabla (Turnos[Estado])? ¿Y la de la fila actual ([@Estado]), que Google Sheets no tiene? */
export function usaTablas(formula: string): { tabla: boolean; fila: boolean } {
  const f = sinTextos(formula);
  return { tabla: /[\wÁÉÍÓÚáéíóúÑñ.]\[|\[@/.test(f), fila: /\[@|#(esta fila|this row)/i.test(f) };
}

/** Nombres (en español y en inglés) de una función. */
function nombresDe(funcion: string): string[] {
  const canon = FUNCIONES[funcion.toUpperCase()] ?? funcion.toUpperCase();
  return Object.entries(FUNCIONES)
    .filter(([, v]) => v === canon)
    .map(([k]) => k);
}

/** Quita los textos entre comillas (para revisar la fórmula sin que estorben). */
const sinTextos = (f: string) => f.replace(/["“][^"“”]*["”]/g, '""');

/** ¿La fórmula usa la función pedida (en español o en inglés)? «SI» no cuenta dentro de «CONTAR.SI». */
export function usaFuncion(formula: string, funcion: string): boolean {
  const f = sinTextos(formula);
  return nombresDe(funcion).some((n) => new RegExp(`(^|[^A-Za-z.])${n.replace(/\./g, "\\.")}\\s*\\(`, "i").test(f));
}

/** Cuántos argumentos lleva la primera vez que aparece la función (para dar pistas). */
export function argumentosDe(formula: string, funcion: string): number | null {
  const f = sinTextos(formula);
  for (const n of nombresDe(funcion)) {
    const m = new RegExp(`(^|[^A-Za-z.])${n.replace(/\./g, "\\.")}\\s*\\(`, "i").exec(f);
    if (!m) continue;
    let nivel = 0;
    let cuenta = 1;
    for (let i = m.index + m[0].length; i < f.length; i++) {
      const c = f[i];
      if (c === "(") nivel++;
      else if (c === ")") {
        if (nivel === 0) return cuenta;
        nivel--;
      } else if ((c === ";" || c === ",") && nivel === 0) cuenta++;
    }
    return cuenta;
  }
  return null;
}

/** ¿Usa al menos una referencia a celda (y no solo números escritos a mano)? */
export function usaReferencias(formula: string, tablas: TablaHoja[] = []): boolean {
  const f = sinTextos(formula).replace(/^=/, "").replace(/\[[^\]]*\]/g, "[]");
  if (/(^|[^A-Za-z.$_\d])\$?[A-Z]{1,2}\$?\d+(?![\w])/i.test(f) || usaTablas(formula).tabla) return true;
  // Una tabla entera por su nombre: =BUSCARV(…; Profesionales; 2; FALSO).
  const palabras = f.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ_][\wÁÉÍÓÚáéíóúÑñ]*(?!\s*\()/g) ?? [];
  return palabras.some((p) => !!buscarTabla(p, tablas));
}

/** ¿Tiene alguna referencia fija con $ (B$7, $B$7)? */
export function usaAbsoluta(formula: string): boolean {
  return /\$[A-Z]{0,2}\$?\d|[A-Z]\$\d/i.test(sinTextos(formula));
}

/**
 * La fórmula copiada `filas` hacia abajo y `cols` a la derecha: las referencias se corren,
 * salvo la parte fijada con $ (como al arrastrar el cuadrito azul).
 */
export function desplazar(formula: string, filas: number, cols: number): string {
  return formula
    .split(/(["“][^"“”]*["”]|\[[^\]]*\])/)
    .map((parte, i) =>
      i % 2
        ? parte
        : parte.replace(/(?<![A-Za-z.\d])(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?![A-Za-z\d(])/g, (_, d1, col, d2, fila) => {
            const c = d1 ? col.toUpperCase() : letraColumna(celdaAIndices(`${col}1`)!.col + cols);
            const f = d2 ? Number(fila) : Number(fila) + filas;
            return `${d1}${c}${d2}${f}`;
          }),
    )
    .join("");
}

/** Para mostrar un número como lo haría la hoja (hasta 2 decimales, con coma). */
export function mostrarNumero(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

/** Para mostrar cualquier valor en la celda. */
export function mostrarValor(v: Valor): string {
  if (typeof v === "number") return mostrarNumero(v);
  if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO";
  return v ?? "";
}

/** ¿Dos resultados son el mismo? (números con tolerancia de centavos; textos sin mayúsculas ni espacios de más). */
export function mismoValor(a: Valor, b: Valor): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.005;
  if (typeof a === "number" || typeof b === "number") return false;
  return sinTildes(mostrarValor(a)).replace(/\s+/g, " ") === sinTildes(mostrarValor(b)).replace(/\s+/g, " ");
}
