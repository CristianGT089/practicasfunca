import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { marcarPuestoListo } from "@/lib/turnero/operaciones";
import { jornadaActiva } from "@/lib/modulos/enfermeria/jornada";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await marcarPuestoListo(usuario);
  const j = await jornadaActiva(usuario);
  return NextResponse.json({
    jornada: j ? { id: j.id, nombre: j.nombre, estaciones: j.turnero.numeroEspacios } : null,
    usuario: { nombre: usuario.nombre, temporal: usuario.temporal, espacioNumero: usuario.espacioNumero },
  });
}
