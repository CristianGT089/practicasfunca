import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { generarPassword } from "@/lib/nucleo/passwords";
import { esRutaDirectaValida } from "@/lib/nucleo/rutasDirectas";

/**
 * Cuentas rápidas para una sala de cómputo: cada una es un "puesto" (ej. una de las
 * computadoras de dispensación) que un estudiante distinto usa durante la sesión. Se
 * matriculan de una vez en los módulos indicados y quedan marcadas `temporal: true` para
 * poder limpiarlas en bloque al terminar (ver DELETE).
 *
 * Si se manda `rutaDirecta`, esas cuentas entran derecho a esa pantalla al iniciar sesión
 * (sin ver /panel) — es lo que usa, por ejemplo, un puesto de dispensación en la sala.
 */

const schema = z.object({
  cantidad: z.number().int().min(1).max(40),
  prefijo: z.string().trim().min(1).max(30).default("Puesto"),
  moduloIds: z.array(z.string().min(1)).min(1),
  rutaDirecta: z
    .string()
    .nullable()
    .default(null)
    .refine((v) => v === null || esRutaDirectaValida(v), "Pantalla directa inválida"),
});

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }
  const { cantidad, prefijo, moduloIds, rutaDirecta } = parsed.data;

  const modulos = await prisma.modulo.findMany({ where: { id: { in: moduloIds } } });
  if (modulos.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un módulo" }, { status: 400 });
  }

  const base = slug(prefijo) || "puesto";
  const creados: { nombre: string; usuario: string; password: string }[] = [];

  for (let i = 1; i <= cantidad; i++) {
    let intento = i;
    let usuario = `${base}${intento}`;
    // Evita chocar con cuentas ya existentes (de una sesión anterior no limpiada, etc.).
    while (await prisma.usuario.findUnique({ where: { usuario } })) {
      intento++;
      usuario = `${base}${intento}`;
    }

    const passwordTemporal = generarPassword();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);
    const nombre = `${prefijo} ${intento}`;

    const creado = await prisma.usuario.create({
      data: {
        nombre,
        usuario,
        passwordHash,
        rol: "ESTUDIANTE",
        temporal: true,
        rutaDirecta,
        matriculas: { create: modulos.map((m) => ({ moduloId: m.id })) },
      },
    });

    creados.push({ nombre: creado.nombre, usuario: creado.usuario, password: passwordTemporal });
  }

  return NextResponse.json({ creados }, { status: 201 });
}

/** Borra TODAS las cuentas temporales (y lo que hayan generado) para dejar la sala limpia. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const temporales = await prisma.usuario.findMany({ where: { temporal: true }, select: { id: true } });
  const ids = temporales.map((u) => u.id);
  if (ids.length === 0) return NextResponse.json({ eliminados: 0 });

  // Relaciones sin onDelete: Cascade hacia Usuario: hay que vaciarlas a mano antes de borrar.
  await prisma.sesionDispensacion.deleteMany({ where: { usuarioId: { in: ids } } }); // arrastra sus EntregaDispensacion (Cascade)
  await prisma.accion.deleteMany({ where: { intento: { usuarioId: { in: ids } } } });
  await prisma.intento.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.intentoTurno.deleteMany({ where: { usuarioId: { in: ids } } });
  // Matricula sí tiene onDelete: Cascade, se va sola con el usuario.
  const { count } = await prisma.usuario.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ eliminados: count });
}
