import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/nucleo/auth";
import { prisma } from "@/lib/nucleo/prisma";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { sesionActivaPara } from "@/lib/clase/servidor";

/** Progreso propio en las actividades de una lección: { [actividad]: { datos, completado } }. */
export async function GET(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const leccion = req.nextUrl.searchParams.get("leccion");
  if (!leccionPorSlug(leccion)) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  const filas = await prisma.progresoClase.findMany({ where: { usuarioId: usuario.id, leccion: leccion! } });
  return NextResponse.json({
    progresos: Object.fromEntries(filas.map((f) => [f.actividad, { datos: f.datos, completado: f.completado }])),
  });
}

/** Guarda el progreso de una actividad (reemplaza `datos`; `completado` no se desmarca solo). */
export async function PUT(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const leccion = leccionPorSlug(body?.leccion);
  const actividad = typeof body?.actividad === "string" ? body.actividad : null;
  // Se guarda progreso de actividades y respuestas a preguntas rápidas (datos = { opcion }).
  if (!leccion || !actividad || !leccion.diapositivas.some((d) => (d.tipo === "actividad" || d.tipo === "pregunta") && d.id === actividad)) {
    return NextResponse.json({ error: "Actividad no válida" }, { status: 400 });
  }
  // Una pregunta cuya respuesta ya reveló el docente en la clase en vivo no se puede cambiar.
  const pregunta = leccion.diapositivas.find((d) => d.tipo === "pregunta" && d.id === actividad);
  if (pregunta) {
    const sesion = await sesionActivaPara(usuario);
    if (sesion?.leccion === leccion.slug && sesion.reveladas.includes(actividad)) {
      return NextResponse.json({ error: "El profe ya reveló la respuesta" }, { status: 409 });
    }
  }
  const datos = (body?.datos ?? {}) as Prisma.InputJsonValue;
  if (JSON.stringify(datos).length > 50_000) return NextResponse.json({ error: "Datos demasiado grandes" }, { status: 413 });
  const completado = body?.completado === true;
  const fila = await prisma.progresoClase.upsert({
    where: { usuarioId_leccion_actividad: { usuarioId: usuario.id, leccion: leccion.slug, actividad } },
    create: { usuarioId: usuario.id, leccion: leccion.slug, actividad, datos, completado },
    update: { datos, ...(completado ? { completado: true } : {}) },
  });
  return NextResponse.json({ datos: fila.datos, completado: fila.completado });
}
