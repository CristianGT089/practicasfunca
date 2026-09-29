import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { jornadaActiva } from "@/lib/modulos/odontologia/jornada";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const j = await jornadaActiva(usuario);
  return NextResponse.json({
    jornada: j ? { id: j.id, nombre: j.nombre, unidades: j.turnero.numeroEspacios, pacientesReales: j.pacientesReales } : null,
    usuario: {
      nombre: usuario.nombre,
      temporal: usuario.temporal,
      rutaDirecta: usuario.rutaDirecta,
      espacioNumero: usuario.espacioNumero,
    },
  });
}
