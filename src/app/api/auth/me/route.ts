import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ usuario: null }, { status: 200 });

  const modulos =
    usuario.rol === "ADMIN"
      ? await prisma.modulo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
      : (
          await prisma.matricula.findMany({
            where: { usuarioId: usuario.id, modulo: { activo: true } },
            include: { modulo: true },
            orderBy: { modulo: { nombre: "asc" } },
          })
        ).map((m) => m.modulo);

  return NextResponse.json({
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    modulos: modulos.map((m) => ({ id: m.id, slug: m.slug, nombre: m.nombre, colorTema: m.colorTema })),
  });
}
