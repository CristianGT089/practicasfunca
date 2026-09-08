import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";

// Catálogo real de medicamentos (origen = CATALOGO_REAL), de solo consulta para el
// estudiante — no está ligado a ningún Intento ni checklist, a diferencia de los
// medicamentos de práctica que usa FarmaciaSoftware.
export async function GET(req: Request) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const modulo = await prisma.modulo.findUnique({ where: { slug: "farmacia" } });
  if (!modulo) return NextResponse.json({ error: "Módulo de farmacia no configurado" }, { status: 404 });

  const matricula = await prisma.matricula.findUnique({
    where: { usuarioId_moduloId: { usuarioId: usuario.id, moduloId: modulo.id } },
  });
  if (!matricula && usuario.rol !== "ADMIN") {
    return NextResponse.json({ error: "No estás matriculado en el módulo de farmacia" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const medicamentos = await prisma.medicamento.findMany({
    where: {
      origen: "CATALOGO_REAL",
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { principioActivo: { contains: q, mode: "insensitive" } },
              { laboratorio: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { principioActivo: "asc" },
  });

  return NextResponse.json({ medicamentos });
}
