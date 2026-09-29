import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { generarPassword } from "@/lib/nucleo/passwords";

const schema = z.object({
  activo: z.boolean().optional(),
  // Reemplaza los módulos que enseña.
  moduloIds: z.array(z.string().min(1)).optional(),
  // true = genera una contraseña temporal nueva y la devuelve.
  restablecerPassword: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const docente = await prisma.usuario.findUnique({ where: { id } });
  if (!docente || docente.rol !== "DOCENTE") return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { activo, moduloIds, restablecerPassword } = parsed.data;

  let passwordTemporal: string | undefined;
  if (restablecerPassword) passwordTemporal = generarPassword();

  await prisma.$transaction([
    ...(moduloIds
      ? [
          prisma.matricula.deleteMany({ where: { usuarioId: id, moduloId: { notIn: moduloIds } } }),
          ...moduloIds.map((moduloId) =>
            prisma.matricula.upsert({
              where: { usuarioId_moduloId: { usuarioId: id, moduloId } },
              update: {},
              create: { usuarioId: id, moduloId },
            })
          ),
        ]
      : []),
    prisma.usuario.update({
      where: { id },
      data: {
        ...(activo !== undefined ? { activo } : {}),
        ...(passwordTemporal ? { passwordHash: await bcrypt.hash(passwordTemporal, 10) } : {}),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, passwordTemporal });
}
