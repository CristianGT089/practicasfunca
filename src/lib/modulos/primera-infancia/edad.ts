/** Edad en meses completos a una fecha dada (por defecto hoy). Pura, usable en cliente y servidor. */
export function calcularEdadMeses(fechaNacimiento: Date, hoy: Date = new Date()): number {
  let meses = (hoy.getFullYear() - fechaNacimiento.getFullYear()) * 12 + (hoy.getMonth() - fechaNacimiento.getMonth());
  if (hoy.getDate() < fechaNacimiento.getDate()) meses -= 1;
  return Math.max(0, meses);
}

/** Un nacimiento antes de las 37 semanas se considera prematuro. */
export function esPrematuro(semanasGestacionNacimiento: number | null | undefined): boolean {
  return typeof semanasGestacionNacimiento === "number" && semanasGestacionNacimiento < 37;
}

/**
 * Edad corregida: se resta a la edad cronológica las semanas que faltaron para llegar a
 * las 40 semanas de gestación (término), convertidas a meses. Solo aplica mientras el
 * prematuro no ha cumplido los 2 años; para los casos de este módulo (niños menores de 3
 * años) se aplica siempre que sea prematuro.
 */
export function calcularEdadCorregidaMeses(
  fechaNacimiento: Date,
  semanasGestacionNacimiento: number | null | undefined,
  hoy: Date = new Date()
): number {
  const edadCronologica = calcularEdadMeses(fechaNacimiento, hoy);
  if (!esPrematuro(semanasGestacionNacimiento)) return edadCronologica;
  const semanasFaltantes = 40 - (semanasGestacionNacimiento as number);
  const mesesAjuste = Math.round(semanasFaltantes / 4.345);
  return Math.max(0, edadCronologica - mesesAjuste);
}
