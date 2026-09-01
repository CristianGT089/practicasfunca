// Clave de deduplicación del catálogo real de medicamentos: normaliza principio activo +
// presentación + lote (trim + mayúsculas, sin acentos) para que variaciones de captura como
// "Amoxicilina" / "AMOXICILINA " / "amoxicilina" no se traten como medicamentos distintos.
export function normalizarClaveUnica(
  principioActivo: string,
  presentacion: string,
  numeroLote: string | null
): string {
  const normalizar = (s: string) =>
    s
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ");

  return [normalizar(principioActivo), normalizar(presentacion), normalizar(numeroLote ?? "")].join("|");
}
