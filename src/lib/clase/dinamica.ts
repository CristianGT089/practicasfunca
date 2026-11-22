import type { ResumenDinamica, RetoDinamica } from "./tipos";

/** Cómo está armado el editor de la tabla dinámica (un campo por zona, como para empezar). */
export type ConfigDinamica = {
  filas: number | null;
  columnas: number | null;
  valores: { columna: number; resumen: ResumenDinamica } | null;
  filtro: { columna: number; valores: string[] } | null;
};

export type ResultadoDinamica = {
  filas: string[];
  columnas: string[];
  /** celdas[fila][columna]; null = no hay datos en ese cruce. */
  celdas: (number | null)[][];
  totalFilas: (number | null)[];
  totalColumnas: (number | null)[];
  total: number | null;
};

const texto = (v: string | number | undefined) => (v === undefined || v === "" ? "(vacío)" : String(v));

/** Valores distintos de una columna, ordenados como los ordena Sheets (A → Z, números de menor a mayor). */
export function valoresDistintos(datos: (string | number)[][], columna: number): string[] {
  const vistos = [...new Set(datos.slice(1).map((f) => texto(f[columna])))];
  const numeros = vistos.every((v) => !Number.isNaN(Number(v)));
  return vistos.sort((a, b) => (numeros ? Number(a) - Number(b) : a.localeCompare(b, "es")));
}

function resumir(valores: (string | number)[], resumen: ResumenDinamica): number | null {
  if (!valores.length) return null;
  if (resumen === "CONTARA") return valores.filter((v) => v !== "").length;
  const nums = valores.filter((v): v is number => typeof v === "number");
  if (resumen === "SUMA") return nums.reduce((a, b) => a + b, 0);
  if (!nums.length) return null;
  if (resumen === "PROMEDIO") return nums.reduce((a, b) => a + b, 0) / nums.length;
  return resumen === "MAX" ? Math.max(...nums) : Math.min(...nums);
}

/** Calcula la tabla dinámica: agrupa por filas y columnas, resume los valores y saca los totales. */
export function calcularDinamica(datos: (string | number)[][], c: ConfigDinamica): ResultadoDinamica {
  const registros = datos.slice(1).filter((f) => !c.filtro || c.filtro.valores.includes(texto(f[c.filtro.columna])));
  const filas = c.filas === null ? [""] : valoresDistintos([datos[0], ...registros], c.filas);
  const columnas = c.columnas === null ? [""] : valoresDistintos([datos[0], ...registros], c.columnas);
  const de = (pred: (f: (string | number)[]) => boolean) =>
    c.valores ? resumir(registros.filter(pred).map((f) => f[c.valores!.columna] ?? ""), c.valores.resumen) : null;
  const enFila = (f: (string | number)[], fila: string) => c.filas === null || texto(f[c.filas]) === fila;
  const enCol = (f: (string | number)[], col: string) => c.columnas === null || texto(f[c.columnas]) === col;
  return {
    filas,
    columnas,
    celdas: filas.map((fi) => columnas.map((co) => de((f) => enFila(f, fi) && enCol(f, co)))),
    totalFilas: filas.map((fi) => de((f) => enFila(f, fi))),
    totalColumnas: columnas.map((co) => de((f) => enCol(f, co))),
    total: de(() => true),
  };
}

/** Lo primero que le falta al editor para cumplir el reto (null = cumple). Una pista, no la solución. */
export function faltaEnDinamica(c: ConfigDinamica, r: RetoDinamica): string | null {
  if ((r.filas ?? null) !== c.filas) return r.filas === undefined ? "Este reto no usa la zona Filas: quita ese campo." : "Revisa la zona Filas: ¿por qué campo hay que agrupar?";
  if ((r.columnas ?? null) !== c.columnas)
    return r.columnas === undefined ? "Este reto no usa la zona Columnas: quita ese campo." : "Revisa la zona Columnas: el reto pide cruzar con otro campo.";
  if (!r.valores !== !c.valores) return r.valores ? "Falta la zona Valores: ¿qué se cuenta o se suma?" : "Este reto no usa la zona Valores.";
  if (r.valores && c.valores) {
    if (r.valores.columna !== c.valores.columna) return "Revisa la zona Valores: ¿qué campo hay que resumir?";
    if (r.valores.resumen !== c.valores.resumen) return "El campo de Valores está bien; revisa «Resumir por» (¿sumar, contar, promediar…?).";
  }
  if (!r.filtro !== !c.filtro) return r.filtro ? "Falta un filtro: el reto pide solo una parte de los datos." : "Este reto no lleva filtro: quítalo.";
  if (r.filtro && c.filtro) {
    if (r.filtro.columna !== c.filtro.columna) return "Revisa el filtro: ¿por qué campo hay que filtrar?";
    const a = [...r.filtro.valores].sort().join("|");
    const b = [...c.filtro.valores].sort().join("|");
    if (a !== b) return "El filtro está en el campo correcto; revisa qué valores dejaste marcados.";
  }
  return null;
}
