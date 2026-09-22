import { prisma } from "@/lib/nucleo/prisma";
import type { Genero } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generarPassword } from "@/lib/nucleo/passwords";

export type AlumnoPuesto = { nombre: string; genero?: Genero | null };

/**
 * Crea cuentas de estudiante para un puesto de sala de cómputo: matriculadas de una vez,
 * `temporal: true`, con usuario/contraseña generados sin chocar con cuentas existentes. Lo
 * usan tanto "Puestos temporales" (Estudiantes) como Control del turnero.
 *
 * Dos formas de dar la lista:
 * - `alumnos`: nombres reales de los estudiantes (y su género, opcional) — un puesto por
 *   cada uno, con ese nombre tal cual.
 * - `cantidad` + `prefijo`: cuando no se tienen los nombres a la mano — genera "Prefijo 1",
 *   "Prefijo 2"... como antes.
 */
export async function crearPuestosTemporales(opts: {
  moduloIds: string[];
  rutaDirecta: string | null;
  sesionTurneroId?: string | null;
  alumnos?: AlumnoPuesto[];
  cantidad?: number;
  prefijo?: string;
}) {
  const modulos = await prisma.modulo.findMany({ where: { id: { in: opts.moduloIds } } });
  if (modulos.length === 0) throw new Error("Selecciona al menos un módulo");

  const lista: AlumnoPuesto[] =
    opts.alumnos && opts.alumnos.length > 0
      ? opts.alumnos
      : Array.from({ length: opts.cantidad ?? 0 }, (_, i) => ({
          nombre: `${opts.prefijo || "Puesto"} ${i + 1}`,
          genero: null,
        }));

  if (lista.length === 0) throw new Error("Agrega al menos un estudiante");

  const creados: { nombre: string; usuario: string; password: string }[] = [];

  for (const alumno of lista) {
    const nombre = alumno.nombre.trim();
    if (!nombre) continue;

    const base = slug(nombre) || "puesto";
    let usuario = base;
    let intento = 1;
    // Evita chocar con cuentas ya existentes (nombre repetido, sesión anterior no limpiada...).
    while (await prisma.usuario.findUnique({ where: { usuario } })) {
      intento++;
      usuario = `${base}${intento}`;
    }

    const passwordTemporal = generarPassword();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    const creado = await prisma.usuario.create({
      data: {
        nombre,
        usuario,
        passwordHash,
        rol: "ESTUDIANTE",
        temporal: true,
        genero: alumno.genero ?? null,
        rutaDirecta: opts.rutaDirecta,
        sesionTurneroId: opts.sesionTurneroId ?? null,
        matriculas: { create: modulos.map((m) => ({ moduloId: m.id })) },
      },
    });

    creados.push({ nombre: creado.nombre, usuario: creado.usuario, password: passwordTemporal });
  }

  return creados;
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Borra por completo las cuentas dadas (y todo lo que hayan generado): sesiones de
 * dispensación, acciones/intentos de escenarios, intentos de turno. `Matricula` sí tiene
 * `onDelete: Cascade` hacia Usuario, se va sola.
 */
export async function eliminarUsuarios(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  await prisma.sesionDispensacion.deleteMany({ where: { usuarioId: { in: ids } } }); // arrastra sus EntregaDispensacion (Cascade)
  await prisma.accion.deleteMany({ where: { intento: { usuarioId: { in: ids } } } });
  await prisma.intento.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.intentoTurno.deleteMany({ where: { usuarioId: { in: ids } } });
  const { count } = await prisma.usuario.deleteMany({ where: { id: { in: ids } } });

  return count;
}
