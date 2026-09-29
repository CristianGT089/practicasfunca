/**
 * Cifrado simétrico (AES-256-GCM) con una clave derivada de AUTH_SECRET. Se usa solo para
 * poder volver a mostrar las contraseñas de las cuentas de computador de una jornada: no
 * para contraseñas de personas, que siguen guardándose solo como hash.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function clave() {
  const secreto = process.env.AUTH_SECRET ?? "dev-secret-change-in-production-please-use-a-long-random-string";
  return createHash("sha256").update(`puestos:${secreto}`).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave(), iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), datos].map((b) => b.toString("base64")).join(".");
}

/** Null si no se puede descifrar (por ejemplo, si cambió AUTH_SECRET). */
export function descifrar(cifrado: string): string | null {
  try {
    const [iv, tag, datos] = cifrado.split(".").map((p) => Buffer.from(p, "base64"));
    const d = createDecipheriv("aes-256-gcm", clave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(datos), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
