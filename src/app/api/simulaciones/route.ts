import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { puedeGestionarGrupo, requireGestor } from "@/lib/nucleo/permisos";
import { filtroJornadas, tiposJornadaPermitidos } from "@/lib/simulacion/permisos";
import { crearSimulacionBorrador } from "@/lib/simulacion/operaciones";
import { definicionSituacion, type CodigoSituacion } from "@/lib/simulacion/situaciones";

export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const simulaciones = await prisma.simulacion.findMany({
    where: await filtroJornadas(gestor),
    orderBy: { creadaEn: "desc" },
    take: 50,
    select: {
      id: true,
      nombre: true,
      tipo: true,
      estado: true,
      creadaEn: true,
      abiertaEn: true,
      cerradaEn: true,
      situaciones: true,
      pacientesReales: true,
      dictado: true,
      grupo: { select: { nombre: true } },
      turnero: { select: { nombre: true } },
      _count: { select: { pacientes: true, atenciones: true, participantes: true } },
    },
  });

  return NextResponse.json({ simulaciones, tiposPermitidos: await tiposJornadaPermitidos(gestor) });
}

const pacienteSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).nullable().default(null),
});

const crearSchema = z
  .object({
    nombre: z.string().trim().min(1).max(80),
    tipo: z.enum(["FARMACIA", "DISPENSARIO", "ODONTOLOGIA"]),
    // Uno de los dos: nombres puntuales de los pacientes, o solo una cantidad al azar.
    pacientes: z.array(pacienteSchema).max(60).optional(),
    cantidadPacientes: z.number().int().min(1).max(60).optional(),
    numeroEspacios: z.number().int().min(1).max(20).default(3),
    grupoId: z.string().min(1).nullable().default(null),
    situaciones: z.array(z.string()).max(20).default([]),
    proporcionNormales: z.number().min(0).max(0.9).default(0.33),
    // Odontología: casos de la práctica virtual que se atienden ese día.
    casosOdontologiaIds: z.array(z.string().min(1)).max(40).default([]),
    pacientesReales: z.boolean().default(false),
    // Dictado: un caso que lee el docente y todos registran a la vez (solo Odontología por ahora).
    dictado: z
      .object({
        secciones: z.enum(["ODONTOGRAMA", "COMPLETA"]),
        fuente: z.enum(["ALEATORIO", "PROPIO", "EXISTENTE"]),
        denticion: z.enum(["PERMANENTE", "TEMPORAL"]).default("PERMANENTE"),
        esperado: z.unknown().optional(),
        escenarioId: z.string().min(1).optional(),
      })
      .nullable()
      .default(null),
  })
  .refine((d) => d.tipo === "ODONTOLOGIA" || (d.pacientes && d.pacientes.length > 0) || (d.cantidadPacientes ?? 0) > 0, {
    message: "Agrega nombres o una cantidad de pacientes",
  });

export async function POST(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  if (!(await tiposJornadaPermitidos(gestor)).includes(d.tipo)) {
    return NextResponse.json({ error: "No gestionas el módulo de ese tipo de jornada" }, { status: 403 });
  }
  if (d.grupoId && !(await puedeGestionarGrupo(gestor, d.grupoId))) {
    return NextResponse.json({ error: "Ese grupo no es tuyo" }, { status: 403 });
  }
  if (gestor.rol === "DOCENTE" && !d.grupoId) {
    return NextResponse.json({ error: "Elige el grupo que hace la jornada" }, { status: 400 });
  }
  if (d.dictado && d.tipo !== "ODONTOLOGIA") {
    return NextResponse.json({ error: "Por ahora el dictado es solo de Odontología" }, { status: 400 });
  }
  const situaciones = d.situaciones.filter((c) => definicionSituacion(c)?.tipos.includes(d.tipo)) as CodigoSituacion[];

  try {
    const simulacion = await crearSimulacionBorrador({ ...d, situaciones, creadaPorId: gestor.id });
    return NextResponse.json({ simulacion }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
