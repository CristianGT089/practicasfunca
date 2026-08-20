import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TipoAccion, ResultadoEsperado } from "@prisma/client";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const escenarios = await prisma.escenario.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      paciente: { select: { nombre: true } },
      pasos: true,
      items: { include: { medicamento: { select: { nombre: true } } } },
      _count: { select: { intentos: true } },
    },
  });

  return NextResponse.json({ escenarios });
}

type PasoEntrada = {
  orden: number;
  tipoAccion: TipoAccion;
  descripcion: string;
  medicamentoId?: string;
  obligatorio?: boolean;
  peso?: number;
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const titulo = (body?.titulo as string | undefined)?.trim();
  const descripcion = (body?.descripcion as string | undefined)?.trim();
  const resultadoEsperado = body?.resultadoEsperado as ResultadoEsperado | undefined;
  const pacienteId = (body?.pacienteId as string | undefined)?.trim() || null;
  const medicamentoIds = (body?.medicamentoIds as string[] | undefined) ?? [];
  const pasos = (body?.pasos as PasoEntrada[] | undefined) ?? [];

  if (!titulo || !descripcion || !resultadoEsperado || !(resultadoEsperado in ResultadoEsperado)) {
    return NextResponse.json(
      { error: "Título, descripción y resultado esperado son requeridos" },
      { status: 400 }
    );
  }
  if (pasos.length === 0) {
    return NextResponse.json({ error: "El escenario debe tener al menos un paso esperado" }, { status: 400 });
  }
  for (const p of pasos) {
    if (!p.tipoAccion || !(p.tipoAccion in TipoAccion) || !p.descripcion?.trim()) {
      return NextResponse.json({ error: "Cada paso necesita tipo de acción y descripción" }, { status: 400 });
    }
  }

  const escenario = await prisma.escenario.create({
    data: {
      titulo,
      descripcion,
      resultadoEsperado,
      pacienteId,
      items: {
        create: medicamentoIds.map((medicamentoId) => ({ medicamentoId })),
      },
      pasos: {
        create: pasos.map((p, i) => ({
          orden: p.orden ?? i + 1,
          tipoAccion: p.tipoAccion,
          descripcion: p.descripcion.trim(),
          parametros: p.medicamentoId ? { medicamentoId: p.medicamentoId } : undefined,
          obligatorio: p.obligatorio ?? true,
          peso: p.peso ?? 1,
        })),
      },
    },
    include: { pasos: true, items: true },
  });

  return NextResponse.json({ escenario });
}
