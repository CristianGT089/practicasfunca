import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/nucleo/prisma";
import { createSession } from "@/lib/nucleo/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = body?.usuario as string | undefined;
  const password = body?.password as string | undefined;

  if (!usuario || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
  }

  const registro = await prisma.usuario.findUnique({ where: { usuario } });
  if (!registro || !registro.activo) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const valido = await bcrypt.compare(password, registro.passwordHash);
  if (!valido) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await createSession({ sub: registro.id, rol: registro.rol });

  return NextResponse.json({
    id: registro.id,
    nombre: registro.nombre,
    rol: registro.rol,
  });
}
