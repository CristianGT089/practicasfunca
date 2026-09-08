import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { casoSchema } from "@/lib/modulos/dispensacion/esquemas";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [casos, pacientes, medicamentos] = await Promise.all([
    prisma.casoDispensacion.findMany({
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      include: {
        paciente: { select: { nombre: true, cedula: true } },
        formulas: { include: { renglones: { include: { medicamento: { select: { nombre: true } } } } } },
      },
    }),
    prisma.paciente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, cedula: true } }),
    prisma.medicamento.findMany({
      where: { origen: "PRACTICA" },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, presentacion: true },
    }),
  ]);

  return NextResponse.json({ casos, pacientes, medicamentos });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = casoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });

  const { formulas, ...caso } = parsed.data;
  const creado = await prisma.casoDispensacion.create({
    data: {
      ...caso,
      formulas: {
        create: formulas.map((f) => ({
          medico: f.medico,
          registroMedico: f.registroMedico,
          ips: f.ips,
          fechaEmision: new Date(f.fechaEmision),
          diasVigencia: f.diasVigencia,
          cargadaEnSistema: f.cargadaEnSistema,
          nota: f.nota,
          renglones: { create: f.renglones },
        })),
      },
    },
  });
  return NextResponse.json({ casoId: creado.id }, { status: 201 });
}
