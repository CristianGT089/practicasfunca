/**
 * Acudiente del paciente menor de edad en la historia de Salud Oral. Un menor no se atiende
 * solo: lo acompaña su padre, madre o representante legal, que da el consentimiento informado
 * para la atención (Ley 1098 de 2006, Código de la Infancia y la Adolescencia; Res. 1995 de
 * 1999 sobre historia clínica). En la historia se registra quién lo acompaña, su documento,
 * su parentesco y que dio el consentimiento; sin eso no se cierra la historia.
 *
 * Puro: lo usan el formulario, el cierre, la calificación y las tarjetas impresas.
 */

export type AcudienteHistoria = {
  nombre: string;
  tipoDocumento: string;
  documento: string;
  parentesco: string;
  telefono: string;
  /** El acudiente dio el consentimiento informado para la atención del menor. */
  consentimiento: boolean;
};

export const PARENTESCOS_ACUDIENTE = ["Madre", "Padre", "Abuelo(a)", "Tío(a)", "Hermano(a) mayor de edad", "Representante legal"];

export const acudienteVacio = (): AcudienteHistoria => ({
  nombre: "",
  tipoDocumento: "CC",
  documento: "",
  parentesco: "",
  telefono: "",
  consentimiento: false,
});

export function edadEn(fechaNacimiento: string | Date, hoy: Date = new Date()): number {
  const n = new Date(fechaNacimiento);
  let e = hoy.getUTCFullYear() - n.getUTCFullYear();
  if (hoy.getUTCMonth() < n.getUTCMonth() || (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() < n.getUTCDate())) e -= 1;
  return e;
}

export const esMenorDeEdad = (fechaNacimiento: string | Date, hoy: Date = new Date()) => edadEn(fechaNacimiento, hoy) < 18;

/** "a, b y c" */
export const enumerar = (lista: string[]) => (lista.length <= 1 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`);

/** Lo que falta registrar del acudiente para poder cerrar la historia (vacío = completo). */
export function faltantesAcudiente(a: AcudienteHistoria): string[] {
  const faltan: string[] = [];
  if (!a.nombre.trim()) faltan.push("el nombre del acudiente");
  if (!a.documento.trim()) faltan.push("su documento");
  if (!a.parentesco.trim()) faltan.push("el parentesco");
  if (!a.consentimiento) faltan.push("su consentimiento informado");
  return faltan;
}

/**
 * Cédula del acudiente de un caso de práctica: sale siempre igual del documento del paciente
 * (va impresa en la tarjeta de quien lo interpreta y con ella se califica), sin guardarla.
 */
export function documentoAcudienteDeCaso(documentoPaciente: string): string {
  let h = 2166136261;
  for (const c of `acudiente:${documentoPaciente}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `10${String(h % 100_000_000).padStart(8, "0")}`;
}

/** Lo que se espera ver registrado en un caso con paciente menor (null = adulto). */
export type AcudienteEsperado = { nombre: string; documento: string; parentesco: string } | null;

export function acudienteEsperadoDeCaso(paciente: {
  documento: string;
  fechaNacimiento: string | Date;
  contactoEmergencia: string | null;
  parentescoContacto: string | null;
}, hoy: Date = new Date()): AcudienteEsperado {
  if (!esMenorDeEdad(paciente.fechaNacimiento, hoy)) return null;
  return {
    nombre: paciente.contactoEmergencia ?? "",
    documento: documentoAcudienteDeCaso(paciente.documento),
    parentesco: paciente.parentescoContacto ?? "",
  };
}

const sinTildes = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Revisión del acudiente: datos completos, la cédula que presentó, el parentesco y el
 * consentimiento. Cada parte vale lo mismo (0-100).
 */
export function revisarAcudiente(esperado: NonNullable<AcudienteEsperado>, registrado: AcudienteHistoria) {
  const lineas: { descripcion: string; cumplido: boolean }[] = [];
  const nombreBien = registrado.nombre.trim() !== "" && (!esperado.nombre || sinTildes(registrado.nombre).includes(sinTildes(esperado.nombre).split(/\s+/)[0]));
  lineas.push({
    descripcion: nombreBien ? "Acudiente: nombre registrado" : `Acudiente: faltó registrar bien quién acompaña al menor${esperado.nombre ? ` (${esperado.nombre})` : ""}`,
    cumplido: nombreBien,
  });
  const documentoBien = registrado.documento.replace(/\D/g, "") === esperado.documento;
  lineas.push({
    descripcion: documentoBien ? "Acudiente: documento correcto" : `Acudiente: el documento era ${esperado.documento}`,
    cumplido: documentoBien,
  });
  const parentescoBien = registrado.parentesco.trim() !== "" && (!esperado.parentesco || sinTildes(registrado.parentesco).startsWith(sinTildes(esperado.parentesco).slice(0, 3)));
  lineas.push({
    descripcion: parentescoBien ? "Acudiente: parentesco registrado" : `Acudiente: parentesco${esperado.parentesco ? ` (era ${esperado.parentesco.toLowerCase()})` : ""}`,
    cumplido: parentescoBien,
  });
  lineas.push({
    descripcion: registrado.consentimiento ? "Acudiente: consentimiento informado" : "Acudiente: faltó el consentimiento informado",
    cumplido: registrado.consentimiento,
  });
  const puntaje = Math.round((lineas.filter((l) => l.cumplido).length / lineas.length) * 100);
  return { puntaje, lineas };
}
