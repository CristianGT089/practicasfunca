import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { prisma } from "@/lib/nucleo/prisma";
import { leccionPorSlug } from "@/lib/clase/lecciones";

/** Las clases a tu ritmo que el docente le habilitó a este estudiante (para el panel). */
export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const recorridos = await prisma.recorridoClase.findMany({
    where: { usuarioId: usuario.id, asignacion: { activa: true } },
    include: { asignacion: { select: { leccion: true, creadoEn: true } } },
    orderBy: { asignacion: { creadoEn: "desc" } },
  });
  return NextResponse.json({
    recorridos: recorridos.flatMap((r) => {
      const leccion = leccionPorSlug(r.asignacion.leccion, "ritmo");
      if (!leccion) return [];
      return [
        {
          id: r.id,
          titulo: leccion.titulo,
          diapositiva: r.diapositiva,
          maxima: r.maxima,
          total: leccion.diapositivas.length,
          iniciadoEn: r.iniciadoEn,
          terminadoEn: r.terminadoEn,
          habilitada: r.asignacion.creadoEn,
        },
      ];
    }),
  });
}
