import { randomInt } from "crypto";

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generarPassword(longitud = 10): string {
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += ALFABETO[randomInt(ALFABETO.length)];
  }
  return resultado;
}
