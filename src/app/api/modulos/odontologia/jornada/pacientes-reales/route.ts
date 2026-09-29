import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { abrirAtencionReal, jornadaActiva } from "@/lib/modulos/odontologia/jornada";

/**
 * Jornada con pacientes reales: el estudiante registra al compañero que va a examinar y abre
 * su historia. Solo datos mínimos (sin dirección ni teléfono), con su consentimiento; se
 * borran al cerrar la jornada.
 */
const texto = (max: number) => z.string().trim().max(max);
const schema = z.object({
  consentimiento: z.literal(true),
  unidad: z.number().int().min(1).max(40),
  denticion: z.enum(["PERMANENTE", "TEMPORAL", "MIXTA"]).default("PERMANENTE"),
  paciente: z.object({
    nombres: texto(80).min(1),
    primerApellido: texto(60).min(1),
    segundoApellido: texto(60).nullable().default(null),
    tipoDocumento: z.enum(["CC", "TI", "RC", "CE"]),
    documento: texto(20).min(3),
    sexo: z.enum(["M", "F"]),
    fechaNacimiento: z.string().min(8),
    eps: texto(60).nullable().default(null),
    ocupacion: texto(60).nullable().default(null),
  }),
});

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const jornada = await jornadaActiva(usuario);
  if (!jornada) return NextResponse.json({ error: "No hay una jornada de odontología abierta" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const sinConsentimiento = parsed.error.issues.some((i) => i.path[0] === "consentimiento");
    return NextResponse.json(
      { error: sinConsentimiento ? "Falta el consentimiento del compañero" : "Revisa los datos del paciente" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  try {
    const a = await abrirAtencionReal(usuario, jornada.id, d.paciente, d.denticion, d.unidad);
    return NextResponse.json({ atencion: { id: a.id, historia: a.historia, denticion: a.denticion, paciente: a.pacienteReal } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
