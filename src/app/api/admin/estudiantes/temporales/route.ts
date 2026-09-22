import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { esRutaDirectaValida } from "@/lib/nucleo/rutasDirectas";
import { crearPuestosTemporales, eliminarUsuarios } from "@/lib/nucleo/estudiantesTemporales";
import { emitirCambio } from "@/lib/turnero/eventos";

/**
 * Cuentas rápidas para una sala de cómputo: cada una es un "puesto" (ej. una de las
 * computadoras de dispensación) que un estudiante distinto usa durante la sesión. Se
 * matriculan de una vez en los módulos indicados y quedan marcadas `temporal: true` para
 * poder limpiarlas en bloque al terminar (ver DELETE).
 *
 * Si se manda `rutaDirecta`, esas cuentas entran derecho a esa pantalla al iniciar sesión
 * (sin ver /panel) — es lo que usa, por ejemplo, un puesto de dispensación en la sala.
 *
 * Este mismo endpoint también lo usa Control del turnero (con `sesionTurneroId`): esos
 * puestos quedan enlazados a la sesión y se borran solos cuando el turnero se cierra
 * (ver lib/turnero/operaciones.ts#cerrarSesion) — no hace falta el DELETE manual para ellos.
 */

const alumnoSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).nullable().default(null),
});

const schema = z
  .object({
    // Nombres reales de los estudiantes (y género, opcional) — un puesto por cada uno.
    alumnos: z.array(alumnoSchema).max(40).optional(),
    // Alternativa cuando no se tienen los nombres a la mano: genera "Prefijo 1", "Prefijo 2"...
    cantidad: z.number().int().min(1).max(40).optional(),
    prefijo: z.string().trim().min(1).max(30).default("Puesto"),
    moduloIds: z.array(z.string().min(1)).min(1),
    rutaDirecta: z
      .string()
      .nullable()
      .default(null)
      .refine((v) => v === null || esRutaDirectaValida(v), "Pantalla directa inválida"),
    sesionTurneroId: z.string().min(1).nullable().default(null),
  })
  .refine((d) => (d.alumnos && d.alumnos.length > 0) || (d.cantidad ?? 0) > 0, {
    message: "Agrega nombres o una cantidad",
  });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.sesionTurneroId) {
    const sesion = await prisma.sesionTurnero.findUnique({ where: { id: parsed.data.sesionTurneroId } });
    if (!sesion || sesion.estado !== "ABIERTA") {
      return NextResponse.json({ error: "Esa sesión de turnero no está abierta" }, { status: 400 });
    }
  }

  try {
    const creados = await crearPuestosTemporales(parsed.data);
    // Control tiene el snapshot de la sesión abierto por SSE: sin esto, los puestos nuevos
    // no aparecerían ahí hasta el respaldo de 10s.
    if (parsed.data.sesionTurneroId) emitirCambio(parsed.data.sesionTurneroId);
    return NextResponse.json({ creados }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Borra TODAS las cuentas temporales (y lo que hayan generado) para dejar la sala limpia. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const temporales = await prisma.usuario.findMany({ where: { temporal: true }, select: { id: true } });
  const eliminados = await eliminarUsuarios(temporales.map((u) => u.id));

  return NextResponse.json({ eliminados });
}
