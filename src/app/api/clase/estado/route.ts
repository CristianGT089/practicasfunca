import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { registrarAsistencia, sesionActivaPara } from "@/lib/clase/servidor";
import { esDispositivo } from "@/lib/clase/equipos";

/** ¿Hay una clase en vivo para mí? (el panel lo consulta para mostrar el aviso). */
export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ sesion: await sesionActivaPara(usuario) });
}

/**
 * El estudiante, cada pocos segundos: avisa en qué diapositiva va y recibe la del docente.
 * Si la sesión ya no está activa (o no es la suya), `sesion` es null.
 */
export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const sesion = await sesionActivaPara(usuario);
  if (sesion && usuario.rol === "ESTUDIANTE" && body?.sesionId === sesion.id) {
    const diapositiva = Number.isInteger(body?.diapositiva) ? Math.max(0, Math.min(body.diapositiva, sesion.maxima)) : 0;
    await registrarAsistencia(sesion.id, usuario.id, diapositiva, body?.siguiendo !== false, esDispositivo(body?.dispositivo) ? body.dispositivo : undefined);
  }
  return NextResponse.json({ sesion });
}
