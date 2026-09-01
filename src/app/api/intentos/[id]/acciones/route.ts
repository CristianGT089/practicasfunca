import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import * as farmacia from "@/lib/modulos/farmacia/reglas";
import * as enfermeria from "@/lib/modulos/enfermeria/reglas";
import * as infancia from "@/lib/modulos/primera-infancia/reglas";
import { perderCorazon } from "@/lib/vidas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: {
      escenario: {
        include: {
          modulo: true,
          pasos: true,
          farmacia: { include: { paciente: true } },
          enfermeria: { include: { paciente: true, ordenMedica: true } },
          infancia: { include: { nino: true } },
        },
      },
      acciones: true,
    },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const tipo = body?.tipo as string | undefined;
  const payload = (body?.payload as Record<string, unknown> | undefined) ?? undefined;

  if (!tipo) {
    return NextResponse.json({ error: "Tipo de acción inválido" }, { status: 400 });
  }

  // ---------- Evaluar si esta acción es un error en tiempo real (reglas por módulo) ----------
  let peligros: string[] = [];
  let fueraDeChecklist = false;
  const slug = intento.escenario.modulo.slug;

  if (slug === "farmacia" && intento.escenario.farmacia) {
    if (tipo === "AGREGAR_A_VENTA" && payload?.medicamentoId) {
      const medicamento = await prisma.medicamento.findUnique({ where: { id: payload.medicamentoId as string } });
      if (medicamento) {
        peligros = farmacia.evaluarPeligroAgregar(
          medicamento,
          { recetaPresentada: intento.escenario.farmacia.recetaPresentada, paciente: intento.escenario.farmacia.paciente },
          intento.acciones
        );
      }
    }
    if (intento.modo === "DIFICIL") {
      fueraDeChecklist = farmacia.estaFueraDeChecklist(tipo, payload ?? null, intento.escenario.pasos);
    }
  } else if (slug === "enfermeria" && intento.escenario.enfermeria) {
    if (tipo === "REGISTRAR_ADMINISTRACION" && payload?.medicamento) {
      peligros = enfermeria.evaluarPeligroAdministrar(
        payload.medicamento as string,
        (payload.dosis as string) ?? "",
        (payload.via as string) ?? "",
        {
          paciente: intento.escenario.enfermeria.paciente,
          ordenMedica: intento.escenario.enfermeria.ordenMedica,
        }
      );
    }
    if (intento.modo === "DIFICIL") {
      fueraDeChecklist = enfermeria.estaFueraDeChecklist(tipo, payload ?? null, intento.escenario.pasos);
    }
  } else if (slug === "primera_infancia" && intento.escenario.infancia) {
    if (tipo === "VALORAR_HITO") {
      peligros = infancia.evaluarPeligroValorarHito(intento.escenario.infancia.nino, intento.acciones);
    }
    if (intento.modo === "DIFICIL") {
      fueraDeChecklist = infancia.estaFueraDeChecklist(tipo, payload ?? null, intento.escenario.pasos);
    }
  }

  const esError = peligros.length > 0 || fueraDeChecklist;

  const accion = await prisma.accion.create({
    data: { intentoId, tipo, payload: payload as object | undefined, esError },
  });

  let vidas = intento.vidas;
  let estado: "EN_PROGRESO" | "PERDIDO" = "EN_PROGRESO";

  if (esError) {
    ({ vidas, estado } = await perderCorazon(intentoId, intento));
  }

  const todasLasAcciones = [...intento.acciones, accion];
  const progreso =
    slug === "farmacia"
      ? farmacia.contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones)
      : slug === "enfermeria"
        ? enfermeria.contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones)
        : infancia.contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones);
  const erroresTotales = todasLasAcciones.filter((a) => a.esError).length;
  const precision = Math.round(((todasLasAcciones.length - erroresTotales) / todasLasAcciones.length) * 100);

  return NextResponse.json({
    accion,
    vidas,
    estado,
    error: esError ? { peligros, fueraDeChecklist } : null,
    progreso,
    precision,
  });
}
