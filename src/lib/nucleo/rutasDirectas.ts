/**
 * Pantallas a las que una cuenta TEMPORAL puede entrar derecho al iniciar sesión, sin
 * pasar por /panel (ver Usuario.rutaDirecta). Lista cerrada a propósito: son rutas que el
 * login hace `router.push` directo, así que solo deben ser las que de verdad existen.
 */
export const RUTAS_DIRECTAS = [
  { valor: "/panel/dispensacion", etiqueta: "Dispensación (fórmulas)" },
  { valor: "/panel/catalogo", etiqueta: "Farmacia — catálogo real / venta" },
] as const;

export type RutaDirecta = (typeof RUTAS_DIRECTAS)[number]["valor"];

export function esRutaDirectaValida(valor: string): valor is RutaDirecta {
  return RUTAS_DIRECTAS.some((r) => r.valor === valor);
}
