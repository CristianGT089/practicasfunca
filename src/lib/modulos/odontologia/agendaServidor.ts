/**
 * Agenda de citas de Salud Oral con base de datos: listar, agendar (validando horario,
 * festivos y cruces), reprogramar o cambiar el estado, y rellenar la agenda de práctica de
 * una jornada. Las reglas puras están en agenda.ts.
 */
import type { EstadoCita, Prisma, TipoCita, Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { puedeGestionarModulo } from "@/lib/nucleo/permisos";
import { puedeGestionarJornada } from "@/lib/simulacion/permisos";
import { APELLIDOS, NOMBRES_FEMENINOS, NOMBRES_MASCULINOS } from "@/lib/simulacion/bancos";
import { BLOQUE_MIN, bloquesDelDia, cruces, diaColombia, diasHabilesDesde, instanteColombia, problemaHorario } from "./agenda";
import { jornadaActiva } from "./jornada";

/** Unidades (sillas) del consultorio de práctica de FUNCA: la agenda real. */
export const UNIDADES_CONSULTORIO = 3;

export type AlcanceAgenda = { simulacionId: string | null; unidades: number; usuario: Usuario };

/**
 * Quién puede ver y escribir en qué agenda:
 * - Agenda real (sin simulación): docentes de Odontología y coordinación.
 * - Agenda de una jornada: el docente de la jornada, y los computadores y estudiantes que
 *   están en ella mientras está abierta.
 */
export async function alcanceAgenda(simulacionId: string | null): Promise<AlcanceAgenda | null> {
  const usuario = await requireUser();
  if (!usuario) return null;
  const gestor = usuario.rol === "ADMIN" || usuario.rol === "DOCENTE" ? (usuario as Usuario & { rol: "ADMIN" | "DOCENTE" }) : null;
  if (!simulacionId) {
    if (!gestor || !(await puedeGestionarModulo(gestor, "odontologia"))) return null;
    return { simulacionId: null, unidades: UNIDADES_CONSULTORIO, usuario };
  }
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId }, include: { turnero: true } });
  if (!simulacion || simulacion.tipo !== "ODONTOLOGIA") return null;
  const permitido = gestor
    ? await puedeGestionarJornada(gestor, simulacionId)
    : (await jornadaActiva(usuario))?.id === simulacionId;
  if (!permitido) return null;
  return { simulacionId, unidades: simulacion.turnero.numeroEspacios, usuario };
}

export async function listarCitas(simulacionId: string | null, desde: Date, hasta: Date) {
  return prisma.citaOdontologia.findMany({
    where: { simulacionId, inicio: { gte: desde, lt: hasta } },
    orderBy: [{ inicio: "asc" }, { unidad: "asc" }],
  });
}

export type DatosCita = {
  unidad: number;
  inicio: Date;
  duracionMin: number;
  tipo: TipoCita;
  motivo: string;
  pacienteNombre: string;
  pacienteDocumento: string;
  pacienteTelefono: string | null;
  acudienteNombre: string | null;
  solicitadaEn: Date | null;
  fechaPedidaPorPaciente: boolean;
  observaciones: string | null;
  atencionId: string | null;
};

/** Agenda una cita nueva o reprograma una (`id`), validando horario, unidad y cruces. */
export async function guardarCita(alcance: AlcanceAgenda, datos: DatosCita, id?: string) {
  if (datos.unidad < 1 || datos.unidad > alcance.unidades) throw new Error(`La unidad debe estar entre 1 y ${alcance.unidades}`);
  const problema = problemaHorario(datos.inicio, datos.duracionMin);
  if (problema) throw new Error(problema);
  if (!datos.pacienteNombre.trim() || !datos.pacienteDocumento.trim()) throw new Error("Registra el nombre y el documento del paciente");
  if (!datos.motivo.trim()) throw new Error("Escribe el motivo de la cita");
  if (datos.atencionId) {
    const atencion = await prisma.atencionJornada.findUnique({ where: { id: datos.atencionId }, select: { simulacionId: true } });
    if (!atencion || atencion.simulacionId !== alcance.simulacionId) throw new Error("La atención no es de esta jornada");
  }

  const dia = diaColombia(datos.inicio);
  const delDia = await prisma.citaOdontologia.findMany({
    where: {
      simulacionId: alcance.simulacionId,
      unidad: datos.unidad,
      inicio: { gte: instanteColombia(dia, 0), lt: instanteColombia(dia, 23, 59) },
    },
  });
  const choca = cruces({ id, unidad: datos.unidad, inicio: datos.inicio, duracionMin: datos.duracionMin }, delDia);
  if (choca.length) throw new Error(`Se cruza con la cita de ${choca[0].pacienteNombre} en la unidad ${datos.unidad}`);

  const data = {
    unidad: datos.unidad,
    inicio: datos.inicio,
    duracionMin: datos.duracionMin,
    tipo: datos.tipo,
    motivo: datos.motivo.trim(),
    pacienteNombre: datos.pacienteNombre.trim(),
    pacienteDocumento: datos.pacienteDocumento.trim(),
    pacienteTelefono: datos.pacienteTelefono?.trim() || null,
    acudienteNombre: datos.acudienteNombre?.trim() || null,
    fechaPedidaPorPaciente: datos.fechaPedidaPorPaciente,
    observaciones: datos.observaciones?.trim() || null,
  };
  if (id) {
    const previa = await prisma.citaOdontologia.findUnique({ where: { id } });
    if (!previa || previa.simulacionId !== alcance.simulacionId) throw new Error("Cita no encontrada");
    if (previa.deRelleno) throw new Error("Esa cita es de otro paciente");
    return prisma.citaOdontologia.update({ where: { id }, data });
  }
  return prisma.citaOdontologia.create({
    data: {
      ...data,
      simulacionId: alcance.simulacionId,
      solicitadaEn: datos.solicitadaEn ?? new Date(),
      atencionId: datos.atencionId,
      creadaPorId: alcance.usuario.id,
    },
  });
}

export async function cambiarEstadoCita(alcance: AlcanceAgenda, id: string, estado: EstadoCita) {
  const cita = await prisma.citaOdontologia.findUnique({ where: { id } });
  if (!cita || cita.simulacionId !== alcance.simulacionId) throw new Error("Cita no encontrada");
  if (cita.deRelleno) throw new Error("Esa cita es de otro paciente");
  return prisma.citaOdontologia.update({ where: { id }, data: { estado } });
}

const elegir = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)];

/**
 * La agenda de práctica de una jornada empieza con otros pacientes ya citados (más llena los
 * primeros días), para que encontrar un espacio dentro de los 3 días hábiles cueste un poco.
 */
export async function rellenarAgendaJornada(simulacionId: string, unidades: number) {
  const dias = diasHabilesDesde(diaColombia(new Date()), 6);
  const motivos: [TipoCita, string, number][] = [
    ["CONTROL", "Control de resinas", 20],
    ["TRATAMIENTO", "Resina en molar", 40],
    ["TRATAMIENTO", "Profilaxis y detartraje", 40],
    ["VALORACION", "Valoración de primera vez", 40],
    ["CONTROL", "Control posexodoncia", 20],
    ["TRATAMIENTO", "Endodoncia", 60],
  ];
  const citas: Prisma.CitaOdontologiaCreateManyInput[] = [];
  dias.forEach((dia, i) => {
    const ocupacion = i === 0 ? 0.75 : i < 3 ? 0.55 : 0.35;
    for (let unidad = 1; unidad <= unidades; unidad++) {
      const bloques = bloquesDelDia(dia);
      for (let b = 0; b < bloques.length; ) {
        const [tipo, motivo, minutos] = elegir(motivos);
        const n = minutos / BLOQUE_MIN;
        if (Math.random() < ocupacion && b + n <= bloques.length) {
          const mujer = Math.random() < 0.5;
          citas.push({
            simulacionId,
            unidad,
            inicio: bloques[b],
            duracionMin: minutos,
            tipo,
            motivo,
            pacienteNombre: `${elegir(mujer ? NOMBRES_FEMENINOS : NOMBRES_MASCULINOS)} ${elegir(APELLIDOS)}`,
            pacienteDocumento: String(1_000_000_000 + Math.floor(Math.random() * 99_999_999)),
            estado: "PROGRAMADA",
            deRelleno: true,
          });
          b += n;
        } else b += 1;
      }
    }
  });
  if (citas.length) await prisma.citaOdontologia.createMany({ data: citas });
}
