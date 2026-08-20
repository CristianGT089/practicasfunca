import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ usuario: null }, { status: 200 });
  return NextResponse.json({
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
  });
}
