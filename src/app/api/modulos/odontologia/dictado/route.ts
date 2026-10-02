import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { dictadoActivo, entrarAlDictado } from "@/lib/modulos/odontologia/dictadoJornada";

/**
 * Estado del dictado para el estudiante (se consulta cada pocos segundos): si hay uno en
 * curso y si está en pausa. Si ya terminó, `dictado` es null.
 */
export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const d = await dictadoActivo(usuario);
  return NextResponse.json({
    dictado: d ? { id: d.id, nombre: d.nombre, secciones: d.dictadoSecciones ?? "ODONTOGRAMA", pausado: d.dictadoPausado } : null,
  });
}

/** Entra al dictado: su historia (se crea la primera vez) y el paciente. */
export async function POST() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const d = await dictadoActivo(usuario);
  if (!d) return NextResponse.json({ error: "No tienes ningún dictado en curso" }, { status: 404 });
  try {
    const datos = await entrarAlDictado(usuario, d.id);
    return NextResponse.json({
      dictado: { id: d.id, nombre: d.nombre, secciones: d.dictadoSecciones ?? "ODONTOGRAMA", pausado: d.dictadoPausado },
      ...datos,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
