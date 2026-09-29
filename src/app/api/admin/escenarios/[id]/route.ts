import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { obtenerPersonaje } from "@/lib/escena/personajes";
import { normalizarGuion } from "@/lib/escena/guion";
import { puedeGestionarModulo, requireGestor, type Gestor } from "@/lib/nucleo/permisos";

async function puedeGestionarEscenario(gestor: Gestor, id: string) {
  const escenario = await prisma.escenario.findUnique({ where: { id }, select: { modulo: { select: { slug: true } } } });
  return escenario ? puedeGestionarModulo(gestor, escenario.modulo.slug) : false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!(await puedeGestionarEscenario(gestor, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const data: { activo?: boolean; personaje?: string | null; guion?: Prisma.InputJsonValue | typeof Prisma.DbNull } = {};

  if (typeof body?.activo === "boolean") data.activo = body.activo;
  // Persona animada y diálogo de la práctica virtual (ver docs/escena.md).
  if (body && "personaje" in body) {
    if (body.personaje !== null && !obtenerPersonaje(body.personaje)) {
      return NextResponse.json({ error: "Ese personaje no existe" }, { status: 400 });
    }
    data.personaje = body.personaje;
  }
  if (body && "guion" in body) {
    const guion = body.guion === null ? null : normalizarGuion(body.guion);
    if (body.guion !== null && !guion) {
      return NextResponse.json({ error: "El diálogo necesita al menos la frase de entrada" }, { status: 400 });
    }
    data.guion = guion ?? Prisma.DbNull;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const escenario = await prisma.escenario.update({ where: { id }, data });
  return NextResponse.json({ escenario });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!(await puedeGestionarEscenario(gestor, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const tieneIntentos = await prisma.intento.findFirst({ where: { escenarioId: id } });
  if (tieneIntentos) {
    return NextResponse.json(
      { error: "No se puede eliminar: ya tiene intentos de estudiantes. Desactívalo en su lugar." },
      { status: 409 }
    );
  }

  await prisma.escenario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
