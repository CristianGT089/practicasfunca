/**
 * Documento de identidad según la edad (Colombia): registro civil de 0 a 6 años, tarjeta
 * de identidad de 7 a 17 y cédula desde los 18. La cédula de extranjería (CE) vale a
 * cualquier edad. El número (NUIP) no cambia al pasar de uno a otro.
 *
 * Puro: lo usan los formularios, la validación al guardar y lo que se muestra o imprime.
 */
import { edadEn } from "./acudiente";

export type TipoDocumentoPaciente = "RC" | "TI" | "CC" | "CE";

export const NOMBRE_TIPO_DOCUMENTO: Record<TipoDocumentoPaciente, string> = {
  RC: "Registro civil",
  TI: "Tarjeta de identidad",
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
};

export function tipoDocumentoSegunEdad(edad: number): "RC" | "TI" | "CC" {
  if (edad < 7) return "RC";
  if (edad < 18) return "TI";
  return "CC";
}

/** Por qué ese tipo de documento no corresponde a esa fecha de nacimiento (null = está bien). */
export function problemaDocumento(tipo: string, fechaNacimiento: string | Date, hoy: Date = new Date()): string | null {
  if (tipo === "CE") return null;
  const n = new Date(fechaNacimiento);
  if (Number.isNaN(n.getTime())) return "Fecha de nacimiento inválida";
  if (n > hoy) return "La fecha de nacimiento no puede ser futura";
  const edad = edadEn(n, hoy);
  const debe = tipoDocumentoSegunEdad(edad);
  return tipo === debe ? null : `Con ${edad} ${edad === 1 ? "año" : "años"} el documento es ${NOMBRE_TIPO_DOCUMENTO[debe].toLowerCase()} (${debe})`;
}

/**
 * El tipo que corresponde hoy (lo que se muestra o imprime): un caso guardado hace años con
 * TI ya puede ser de alguien con cédula. La CE se respeta.
 */
export function tipoDocumentoVigente(tipo: string, fechaNacimiento: string | Date, hoy: Date = new Date()): string {
  if (tipo === "CE") return tipo;
  const n = new Date(fechaNacimiento);
  return Number.isNaN(n.getTime()) ? tipo : tipoDocumentoSegunEdad(edadEn(n, hoy));
}
