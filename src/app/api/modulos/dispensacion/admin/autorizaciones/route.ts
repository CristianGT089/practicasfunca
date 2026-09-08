import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [autorizaciones, pacientes, medicamentos] = await Promise.all([
    prisma.recetaElectronica.findMany({
      orderBy: { creadoEn: "desc" },
      include: { paciente: { select: { nombre: true, cedula: true } }, medicamento: { select: { nombre: true } } },
    }),
    prisma.paciente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, cedula: true } }),
    prisma.medicamento.findMany({
      where: { origen: "PRACTICA" },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, presentacion: true },
    }),
  ]);

  return NextResponse.json({ autorizaciones, pacientes, medicamentos });
}

const schema = z.object({
  pacienteId: z.string().min(1),
  medicamentoId: z.string().min(1),
  medico: z.string().trim().min(1).max(80),
  cantidadAutorizada: z.number().int().min(1),
  cantidadRedimida: z.number().int().min(0).default(0),
  fechaEmision: z.string(), // ISO date
  fechaVigencia: z.string(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });

  const { fechaEmision, fechaVigencia, ...resto } = parsed.data;
  const autorizacion = await prisma.recetaElectronica.create({
    data: { ...resto, fechaEmision: new Date(fechaEmision), fechaVigencia: new Date(fechaVigencia) },
  });
  return NextResponse.json({ autorizacion }, { status: 201 });
}
