import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { marcarPuestoListo } from "@/lib/turnero/operaciones";
import { jornadaRecepcionActiva } from "@/lib/simulacion/recepcionJornada";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await marcarPuestoListo(usuario);
  const jornada = await jornadaRecepcionActiva(usuario);
  return NextResponse.json({
    jornada,
    usuario: { nombre: usuario.nombre, rutaDirecta: usuario.rutaDirecta, espacioNumero: usuario.espacioNumero },
  });
}
