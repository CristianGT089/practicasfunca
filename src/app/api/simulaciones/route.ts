import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { crearSimulacionBorrador } from "@/lib/simulacion/operaciones";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const simulaciones = await prisma.simulacion.findMany({
    orderBy: { creadaEn: "desc" },
    take: 30,
    select: {
      id: true,
      nombre: true,
      tipo: true,
      estado: true,
      creadaEn: true,
      abiertaEn: true,
      cerradaEn: true,
      turnero: { select: { nombre: true } },
      _count: { select: { pacientes: true } },
    },
  });

  return NextResponse.json({ simulaciones });
}

const pacienteSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).nullable().default(null),
});

const crearSchema = z
  .object({
    nombre: z.string().trim().min(1).max(80),
    tipo: z.enum(["FARMACIA", "DISPENSARIO"]),
    // Uno de los dos: nombres puntuales de los pacientes, o solo una cantidad al azar.
    pacientes: z.array(pacienteSchema).max(60).optional(),
    cantidadPacientes: z.number().int().min(1).max(60).optional(),
    numeroEspacios: z.number().int().min(1).max(20).default(3),
  })
  .refine((d) => (d.pacientes && d.pacientes.length > 0) || (d.cantidadPacientes ?? 0) > 0, {
    message: "Agrega nombres o una cantidad de pacientes",
  });

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }

  try {
    const simulacion = await crearSimulacionBorrador(parsed.data);
    return NextResponse.json({ simulacion }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
