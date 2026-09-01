import { Accion, PasoEsperado, RegistroCrecimiento } from "@prisma/client";
import { estaFueraDeChecklist as estaFueraDeChecklistGenerico } from "../checklist";
import { esPrematuro } from "./edad";

export { coincideParametrosConMotivos, contarPasosCumplidos } from "../checklist";

/** Verbos de "consultar/verificar" que en modo difícil nunca cuestan un corazón. */
export const ACCIONES_SIEMPRE_PERMITIDAS: string[] = [
  "VER_FICHA_NINO",
  "VALORAR_HITO",
  "REGISTRAR_PESO_TALLA",
  "CALCULAR_EDAD_CORREGIDA",
  "VERIFICAR_ESQUEMA_VACUNACION",
];

export function estaFueraDeChecklist(
  tipo: string,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[]
): boolean {
  return estaFueraDeChecklistGenerico(tipo, payload, pasosEsperados, ACCIONES_SIEMPRE_PERMITIDAS);
}

export type NinoLike = {
  fechaNacimiento: Date;
  semanasGestacionNacimiento: number | null;
};

/**
 * Antes de valorar hitos de un niño prematuro hay que usar su edad corregida, no la
 * cronológica — si no, se sobre-diagnostica retraso. Se exige haber calculado la edad
 * corregida antes del primer VALORAR_HITO cuando el niño es prematuro.
 */
export function evaluarPeligroValorarHito(nino: NinoLike, accionesPrevias: Accion[]): string[] {
  const razones: string[] = [];
  if (esPrematuro(nino.semanasGestacionNacimiento)) {
    const yaCalculada = accionesPrevias.some((a) => a.tipo === "CALCULAR_EDAD_CORREGIDA");
    if (!yaCalculada) {
      razones.push("Este niño nació prematuro: debes calcular la edad corregida antes de valorar sus hitos de desarrollo.");
    }
  }
  return razones;
}

/**
 * ¿La tendencia de peso/talla es descendente respecto al registro anterior? Señal de
 * alarma nutricional que debe llevar a derivar, no a un simple "seguimiento normal".
 */
export function tendenciaCrecimientoDescendente(registros: RegistroCrecimiento[]): boolean {
  const ordenados = [...registros].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  if (ordenados.length < 2) return false;
  const [anterior, ultimo] = ordenados.slice(-2);
  return ultimo.pesoKg < anterior.pesoKg;
}
