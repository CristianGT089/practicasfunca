import { prisma } from "@/lib/nucleo/prisma";
import bcrypt from "bcryptjs";
import { generarPassword } from "@/lib/nucleo/passwords";

/**
 * Crea N cuentas de estudiante para un puesto de sala de cómputo: matriculadas de una vez,
 * `temporal: true`, con usuario/contraseña generados sin chocar con cuentas existentes.
 * Lo usan tanto "Puestos temporales" (Estudiantes) como Control del turnero.
 */
export async function crearPuestosTemporales(opts: {
  cantidad: number;
  prefijo: string;
  moduloIds: string[];
  rutaDirecta: string | null;
  sesionTurneroId?: string | null;
}) {
  const modulos = await prisma.modulo.findMany({ where: { id: { in: opts.moduloIds } } });
  if (modulos.length === 0) throw new Error("Selecciona al menos un módulo");

  const base = slug(opts.prefijo) || "puesto";
  const creados: { nombre: string; usuario: string; password: string }[] = [];

  for (let i = 1; i <= opts.cantidad; i++) {
    let intento = i;
    let usuario = `${base}${intento}`;
    // Evita chocar con cuentas ya existentes (de una sesión anterior no limpiada, etc.).
    while (await prisma.usuario.findUnique({ where: { usuario } })) {
      intento++;
      usuario = `${base}${intento}`;
    }

    const passwordTemporal = generarPassword();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);
    const nombre = `${opts.prefijo} ${intento}`;

    const creado = await prisma.usuario.create({
      data: {
        nombre,
        usuario,
        passwordHash,
        rol: "ESTUDIANTE",
        temporal: true,
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
