import { randomInt } from "crypto";

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generarPassword(longitud = 10): string {
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += ALFABETO[randomInt(ALFABETO.length)];
  }
  return resultado;
}

export const LARGO_MINIMO_PASSWORD = 6;

/**
 * Reglas para una contraseña elegida por el propio usuario: fácil de recordar, pero no
 * trivial. Devuelve el motivo del rechazo o null si es válida.
 */
export function validarPasswordNueva(nueva: string, usuario: string): string | null {
  if (nueva.length < LARGO_MINIMO_PASSWORD) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`;
  }
  if (nueva.length > 72) return "La contraseña es demasiado larga";
  if (nueva.trim().toLowerCase() === usuario.trim().toLowerCase()) {
    return "La contraseña no puede ser igual al usuario";
  }
  return null;
}
