import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { estaFueraDeChecklist, contarPasosCumplidos } from "@/lib/modulos/farmacia/reglas";
import { perderCorazon } from "@/lib/nucleo/vidas";
import type { RetratoId } from "@/components/modulos/farmacia/CedulaCard";

// Elige un boceto de foto determinístico (mismo paciente → siempre el mismo retrato)
// sin necesitar un campo de género en el modelo de datos.
function retratoParaPaciente(pacienteId: string, edad: number): RetratoId {
  const hash = [...pacienteId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const esMayor = edad >= 50;
  return hash % 2 === 0 ? (esMayor ? "hombreMayor" : "hombreJoven") : esMayor ? "mujerMayor" : "mujerJoven";
}

// El cliente nunca decide si "entrega" o "se rehúsa": eso lo determina el
// escenario en el servidor, para no revelar por adelantado el desenlace.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { escenario: { include: { farmacia: { include: { paciente: true } }, pasos: true } }, acciones: true },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const entregada = intento.escenario.farmacia?.actitudCedula !== "SE_REHUSA";
  const payload = { entregada };

  let fueraDeChecklist = false;
  if (intento.modo === "DIFICIL") {
    fueraDeChecklist = estaFueraDeChecklist("SOLICITAR_CEDULA", payload, intento.escenario.pasos);
  }

  const accion = await prisma.accion.create({
    data: { intentoId, tipo: "SOLICITAR_CEDULA", payload, esError: fueraDeChecklist },
  });

  let vidas = intento.vidas;
  let estado: "EN_PROGRESO" | "PERDIDO" = "EN_PROGRESO";
  if (fueraDeChecklist) {
    ({ vidas, estado } = await perderCorazon(intentoId, intento));
  }

  const paciente = intento.escenario.farmacia?.paciente ?? null;
  const todasLasAcciones = [...intento.acciones, accion];
  const progreso = contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones);
  const erroresTotales = todasLasAcciones.filter((a) => a.esError).length;
  const precision = Math.round(((todasLasAcciones.length - erroresTotales) / todasLasAcciones.length) * 100);

  return NextResponse.json({
    entregada,
    datos:
      entregada && paciente
        ? {
            nombre: paciente.nombre,
            cedula: paciente.cedula,
            fechaNacimiento: paciente.fechaNacimiento,
            lugarNacimiento: paciente.lugarNacimiento,
            tipoSangre: paciente.tipoSangre,
            retrato: retratoParaPaciente(paciente.id, paciente.edad),
          }
        : null,
    vidas,
    estado,
    progreso,
    precision,
  });
}
