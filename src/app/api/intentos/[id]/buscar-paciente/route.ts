import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TipoAccion } from "@prisma/client";
import { estaFueraDeChecklist, contarPasosCumplidos } from "@/lib/peligros";
import { perderCorazon } from "@/lib/vidas";

// La ficha del paciente (nombre, alergias, antecedentes) nunca se entrega de gratis: se busca
// en el sistema por el número de cédula que el estudiante leyó en la identificación física, no
// por el vínculo interno del escenario. Si algún día una cédula mostrada no coincide con el
// registro real, esta búsqueda simplemente no encontrará nada o traerá a otra persona — el
// mecanismo ya soporta esa discrepancia sin lógica especial.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { escenario: { include: { pasos: true } }, acciones: true },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const cedulaEntregada = intento.acciones.some(
    (a) => a.tipo === TipoAccion.SOLICITAR_CEDULA && (a.payload as { entregada?: boolean } | null)?.entregada
  );
  if (!cedulaEntregada) {
    return NextResponse.json(
      { error: "No puedes buscar la ficha del paciente sin haber validado primero su identidad." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const cedula = body?.cedula as string | undefined;
  if (!cedula) {
    return NextResponse.json({ error: "Falta el número de cédula a buscar." }, { status: 400 });
  }

  const paciente = await prisma.paciente.findUnique({ where: { cedula } });
  const payload = { cedula, encontrado: !!paciente };

  let fueraDeChecklist = false;
  if (intento.modo === "DIFICIL") {
    fueraDeChecklist = estaFueraDeChecklist(TipoAccion.VER_FICHA_PACIENTE, payload, intento.escenario.pasos);
  }

  const accion = await prisma.accion.create({
    data: { intentoId, tipo: TipoAccion.VER_FICHA_PACIENTE, payload, esError: fueraDeChecklist },
  });

  let vidas = intento.vidas;
  let estado: "EN_PROGRESO" | "PERDIDO" = "EN_PROGRESO";
  if (fueraDeChecklist) {
    ({ vidas, estado } = await perderCorazon(intentoId, intento));
  }

  const todasLasAcciones = [...intento.acciones, accion];
  const progreso = contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones);
  const erroresTotales = todasLasAcciones.filter((a) => a.esError).length;
  const precision = Math.round(((todasLasAcciones.length - erroresTotales) / todasLasAcciones.length) * 100);

  return NextResponse.json({
    encontrado: !!paciente,
    paciente: paciente
      ? {
          nombre: paciente.nombre,
          cedula: paciente.cedula,
          edad: paciente.edad,
          alergias: paciente.alergias,
          antecedentes: paciente.antecedentes,
        }
      : null,
    vidas,
    estado,
    progreso,
    precision,
  });
}
