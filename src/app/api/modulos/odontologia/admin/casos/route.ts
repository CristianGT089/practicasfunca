import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestorDeModulo } from "@/lib/nucleo/permisos";
import { casoOdontologiaSchema } from "@/lib/modulos/odontologia/esquemas";
import { crearCaso } from "@/lib/modulos/odontologia/admin";

export async function GET() {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const casos = await prisma.escenario.findMany({
    where: { modulo: { slug: "odontologia" } },
    orderBy: { creadoEn: "asc" },
    include: { odontologia: { include: { paciente: true } }, _count: { select: { intentos: true } } },
  });
  return NextResponse.json({ casos });
}

export async function POST(req: NextRequest) {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = casoOdontologiaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });

  const escenario = await crearCaso(prisma, parsed.data);
  return NextResponse.json({ id: escenario.id });
}
