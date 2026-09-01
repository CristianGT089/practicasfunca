import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizarClaveUnica } from "@/lib/modulos/farmacia/catalogoReal";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const medicamentos = await prisma.medicamento.findMany({
    where: { origen: "CATALOGO_REAL" },
    orderBy: { principioActivo: "asc" },
  });
  return NextResponse.json({ medicamentos });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const principioActivo = (body?.principioActivo as string | undefined)?.trim();
  const presentacion = (body?.presentacion as string | undefined)?.trim();
  const nombre = (body?.nombre as string | undefined)?.trim() || principioActivo;
  const numeroLote = (body?.numeroLote as string | undefined)?.trim() || null;

  if (!principioActivo || !presentacion) {
    return NextResponse.json({ error: "Principio activo y presentación son requeridos" }, { status: 400 });
  }

  const laboratorio = (body?.laboratorio as string | undefined)?.trim() || null;
  const formaFarmaceutica = (body?.formaFarmaceutica as string | undefined)?.trim() || null;
  const concentracion = (body?.concentracion as string | undefined)?.trim() || null;
  const registroInvima = (body?.registroInvima as string | undefined)?.trim() || null;
  const loteVencimiento = body?.loteVencimiento ? new Date(body.loteVencimiento) : null;
  const stock = Number(body?.stock ?? 0);

  const claveUnica = normalizarClaveUnica(principioActivo, presentacion, numeroLote);

  // Validación a nivel de aplicación: da un mensaje claro antes de tocar la base.
  const existente = await prisma.medicamento.findFirst({
    where: { origen: "CATALOGO_REAL", claveUnica },
  });
  if (existente) {
    return NextResponse.json(
      { error: `Ya existe un medicamento con ese principio activo, presentación y lote: "${existente.nombre}"` },
      { status: 409 }
    );
  }

  try {
    const medicamento = await prisma.medicamento.create({
      data: {
        origen: "CATALOGO_REAL",
        nombre: nombre!,
        principioActivo,
        presentacion,
        laboratorio,
        formaFarmaceutica,
        concentracion,
        registroInvima,
        numeroLote,
        claveUnica,
        loteVencimiento,
        stock: Number.isFinite(stock) ? stock : 0,
        precio: 0,
        requiereReceta: false,
        esControlado: false,
        tags: [],
      },
    });
    return NextResponse.json({ medicamento });
  } catch (e) {
    // Respaldo ante condición de carrera: dos solicitudes casi simultáneas pasan la
    // validación de arriba y chocan en el índice único parcial de la base.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese medicamento ya existe en el catálogo (mismo lote)" }, { status: 409 });
    }
    throw e;
  }
}
