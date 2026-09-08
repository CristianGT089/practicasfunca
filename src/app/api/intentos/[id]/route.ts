import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { contarPasosCumplidos } from "@/lib/nucleo/checklist";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id },
    include: {
      escenario: {
        include: {
          modulo: true,
          farmacia: true,
          enfermeria: { include: { paciente: true } },
          infancia: { include: { nino: { include: { registrosCrecimiento: { orderBy: { fecha: "asc" } } } } } },
        },
      },
      acciones: { orderBy: { creadoEn: "asc" } },
    },
  });

  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let intentoTurnoInfo: { id: string; indice: number; total: number; vidas: number; titulo: string } | null = null;
  if (intento.intentoTurnoId) {
    const intentoTurno = await prisma.intentoTurno.findUnique({
      where: { id: intento.intentoTurnoId },
      include: { turno: { include: { items: true } } },
    });
    if (intentoTurno) {
      intentoTurnoInfo = {
        id: intentoTurno.id,
        indice: intentoTurno.indice,
        total: intentoTurno.turno.items.length,
        vidas: intentoTurno.vidas,
        titulo: intentoTurno.turno.titulo,
      };
    }
  }

  // Los pasos esperados nunca se exponen al cliente (revelarían el checklist);
  // solo se usan aquí para calcular el conteo de progreso.
  const pasos = await prisma.pasoEsperado.findMany({ where: { escenarioId: intento.escenarioId } });
  const progreso = contarPasosCumplidos(pasos, intento.acciones);
  const erroresTotales = intento.acciones.filter((a) => a.esError).length;
  const precision =
    intento.acciones.length > 0
      ? Math.round(((intento.acciones.length - erroresTotales) / intento.acciones.length) * 100)
      : 100;

  const { descripcionDificil, farmacia, enfermeria, infancia, ...escenarioBase } = intento.escenario;
  const descripcion = intento.modo === "DIFICIL" && descripcionDificil ? descripcionDificil : escenarioBase.descripcion;

  // No se envía el pacienteId ni la actitud ante la cédula: eso solo se revela cuando el
  // estudiante la solicita y busca al paciente en el sistema, para que la ficha no llegue
  // "gratis" con la carga inicial de la página.
  const escenarioSeguro =
    escenarioBase.modulo.slug === "farmacia"
      ? (() => {
          const { id: _fid, escenarioId: _feid, pacienteId: _pid, ...recetaFisica } = farmacia ?? ({} as NonNullable<typeof farmacia>);
          void _fid;
          void _feid;
          void _pid;
          return {
            ...escenarioBase,
            ...recetaFisica,
            descripcion,
            mostrarIdentidad: farmacia?.pacienteId !== null || farmacia?.actitudCedula !== null,
          };
        })()
      : {
          ...escenarioBase,
          descripcion,
          enfermeria: enfermeria ? { paciente: enfermeria.paciente, contexto: enfermeria.contexto } : null,
          infancia: infancia
            ? { nino: infancia.nino, contexto: infancia.contexto, hitosEsperados: infancia.hitosEsperados }
            : null,
        };

  const medicamentos =
    escenarioBase.modulo.slug === "farmacia" ? await prisma.medicamento.findMany({ orderBy: { nombre: "asc" } }) : [];

  return NextResponse.json({
    intento: {
      ...intento,
      escenario: escenarioSeguro,
      intentoTurno: intentoTurnoInfo,
    },
    medicamentos,
    progreso,
    precision,
  });
}
