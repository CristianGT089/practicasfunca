import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { validarPasswordNueva } from "@/lib/nucleo/passwords";

/** Cualquier usuario cambia su propia contraseña, confirmando la actual. */

const schema = z.object({
  actual: z.string().min(1),
  nueva: z.string(),
});

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Las cuentas de puesto (sala de cómputo) son compartidas y se borran tras la sesión.
  if (usuario.temporal) {
    return NextResponse.json({ error: "Las cuentas de puesto no pueden cambiar su contraseña" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { actual, nueva } = parsed.data;

  if (!(await bcrypt.compare(actual, usuario.passwordHash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }
  const motivo = validarPasswordNueva(nueva, usuario.usuario);
  if (motivo) return NextResponse.json({ error: motivo }, { status: 400 });

  await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash: await bcrypt.hash(nueva, 10) } });
  return NextResponse.json({ ok: true });
}
