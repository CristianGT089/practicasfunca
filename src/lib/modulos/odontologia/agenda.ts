/**
 * Agenda de citas de Salud Oral: reglas puras (sin Prisma), para el servidor, la pantalla y
 * las pruebas. La usan la agenda real del consultorio y la práctica de las jornadas.
 *
 * - Horario: lunes a viernes hábiles, de 7:00 a 17:00, en bloques de 20 minutos, una agenda
 *   por unidad (silla). Los festivos de Colombia no son hábiles (Ley 51 de 1983, "Ley Emiliani").
 * - Oportunidad (Res. 1552 de 2013, art. 1, parágrafo 3): la cita de odontología general se
 *   asigna en máximo 3 días hábiles desde la solicitud, salvo que el paciente pida
 *   expresamente otra fecha.
 * - Las horas se manejan en la hora de Colombia (UTC-5, sin horario de verano).
 */

export const HORA_INICIO = 7;
export const HORA_FIN = 17;
export const BLOQUE_MIN = 20;
export const OPORTUNIDAD_DIAS_HABILES = 3;
/** Colombia no tiene horario de verano: siempre UTC-5. */
const OFFSET_MS = -5 * 3_600_000;

export type TipoCita = "VALORACION" | "CONTROL" | "TRATAMIENTO" | "URGENCIA";
export type EstadoCita = "PROGRAMADA" | "CONFIRMADA" | "ATENDIDA" | "NO_ASISTIO" | "CANCELADA";

export const TIPOS_CITA: { codigo: TipoCita; nombre: string; minutos: number; ayuda: string }[] = [
  { codigo: "VALORACION", nombre: "Valoración (primera vez)", minutos: 40, ayuda: "Historia clínica y odontograma completos." },
  { codigo: "TRATAMIENTO", nombre: "Tratamiento", minutos: 40, ayuda: "Procedimientos del plan: resinas, exodoncias, endodoncias…" },
  { codigo: "CONTROL", nombre: "Control", minutos: 20, ayuda: "Revisión de un tratamiento o después de una interconsulta." },
  { codigo: "URGENCIA", nombre: "Urgencia", minutos: 20, ayuda: "Dolor, trauma o infección: se atiende el mismo día." },
];

export const ESTADOS_CITA: { codigo: EstadoCita; nombre: string }[] = [
  { codigo: "PROGRAMADA", nombre: "Programada" },
  { codigo: "CONFIRMADA", nombre: "Confirmada" },
  { codigo: "ATENDIDA", nombre: "Atendida" },
  { codigo: "NO_ASISTIO", nombre: "No asistió" },
  { codigo: "CANCELADA", nombre: "Cancelada" },
];

export const nombreTipo = (t: string) => TIPOS_CITA.find((x) => x.codigo === t)?.nombre ?? t;
export const nombreEstado = (e: string) => ESTADOS_CITA.find((x) => x.codigo === e)?.nombre ?? e;

/** Duración sugerida por lo que se va a hacer (texto del plan de tratamiento). */
export function duracionSugerida(tipo: TipoCita, procedimiento = ""): number {
  const p = procedimiento.toLowerCase();
  if (tipo === "TRATAMIENTO") {
    if (/endodoncia|conducto/.test(p)) return 60;
    if (/profilaxis|detartraje|limpieza|sellante/.test(p)) return 40;
  }
  return TIPOS_CITA.find((t) => t.codigo === tipo)?.minutos ?? 20;
}

// ---------------------------------------------------------------------------
// Fechas en hora de Colombia
// ---------------------------------------------------------------------------

/** "AAAA-MM-DD" del día en Colombia de un instante. */
export function diaColombia(instante: Date): string {
  return new Date(instante.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** El instante de un día ("AAAA-MM-DD") a una hora y minuto de Colombia. */
export function instanteColombia(dia: string, hora: number, minuto = 0): Date {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hora, minuto) - OFFSET_MS);
}

/** Hora y minuto en Colombia de un instante. */
export function horaColombia(instante: Date): { hora: number; minuto: number } {
  const l = new Date(instante.getTime() + OFFSET_MS);
  return { hora: l.getUTCHours(), minuto: l.getUTCMinutes() };
}

const sumarDias = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
const diaSemana = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
};

// ---------------------------------------------------------------------------
// Festivos de Colombia
// ---------------------------------------------------------------------------

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function pascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Al lunes siguiente si no cae en lunes (Ley Emiliani). */
function alLunes(dia: string): string {
  const ds = diaSemana(dia);
  return ds === 1 ? dia : sumarDias(dia, (8 - ds) % 7);
}

const cacheFestivos = new Map<number, Set<string>>();

export function festivosColombia(anio: number): Set<string> {
  const guardado = cacheFestivos.get(anio);
  if (guardado) return guardado;
  const f = (mes: number, dia: number) => `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const p = pascua(anio);
  const festivos = new Set<string>([
    // Fijos
    f(1, 1), f(5, 1), f(7, 20), f(8, 7), f(12, 8), f(12, 25),
    // Se trasladan al lunes
    alLunes(f(1, 6)), alLunes(f(3, 19)), alLunes(f(6, 29)), alLunes(f(8, 15)),
    alLunes(f(10, 12)), alLunes(f(11, 1)), alLunes(f(11, 11)),
    // Según la Pascua
    sumarDias(p, -3), sumarDias(p, -2), // jueves y viernes santo
    sumarDias(p, 43), sumarDias(p, 64), sumarDias(p, 71), // Ascensión, Corpus Christi, Sagrado Corazón (lunes)
  ]);
  cacheFestivos.set(anio, festivos);
  return festivos;
}

export const esDiaHabil = (dia: string) => {
  const ds = diaSemana(dia);
  return ds !== 0 && ds !== 6 && !festivosColombia(Number(dia.slice(0, 4))).has(dia);
};

/** Los próximos `n` días hábiles a partir de `dia` (incluido si es hábil). */
export function diasHabilesDesde(dia: string, n: number): string[] {
  const dias: string[] = [];
  let d = dia;
  while (dias.length < n) {
    if (esDiaHabil(d)) dias.push(d);
    d = sumarDias(d, 1);
  }
  return dias;
}

/**
 * Días hábiles entre la solicitud y la cita, sin contar el día de la solicitud (pedirla un
 * lunes y que sea el jueves son 3 días hábiles; el mismo día, 0).
 */
export function diasHabilesEntre(solicitud: Date, cita: Date): number {
  const desde = diaColombia(solicitud);
  const hasta = diaColombia(cita);
  if (hasta <= desde) return 0;
  let n = 0;
  for (let d = sumarDias(desde, 1); d <= hasta; d = sumarDias(d, 1)) if (esDiaHabil(d)) n++;
  return n;
}

export const cumpleOportunidad = (solicitud: Date, cita: Date) => diasHabilesEntre(solicitud, cita) <= OPORTUNIDAD_DIAS_HABILES;

// ---------------------------------------------------------------------------
// Horario y cruces
// ---------------------------------------------------------------------------

export type CitaSlot = { id?: string; unidad: number; inicio: Date; duracionMin: number; estado?: string };

/** Por qué no se puede agendar en ese horario (null = se puede). */
export function problemaHorario(inicio: Date, duracionMin: number): string | null {
  if (duracionMin < BLOQUE_MIN || duracionMin % BLOQUE_MIN !== 0) return `La duración va en bloques de ${BLOQUE_MIN} minutos`;
  const dia = diaColombia(inicio);
  if (!esDiaHabil(dia)) return "Ese día no es hábil (fin de semana o festivo)";
  const { hora, minuto } = horaColombia(inicio);
  if (minuto % BLOQUE_MIN !== 0) return `Las citas empiezan cada ${BLOQUE_MIN} minutos`;
  const desde = hora * 60 + minuto;
  if (desde < HORA_INICIO * 60 || desde + duracionMin > HORA_FIN * 60) return `El consultorio atiende de ${HORA_INICIO}:00 a ${HORA_FIN}:00`;
  return null;
}

/** Las citas activas de la misma unidad que se cruzan con esta (las canceladas no ocupan). */
export function cruces<T extends CitaSlot>(nueva: CitaSlot, existentes: T[]): T[] {
  const ini = nueva.inicio.getTime();
  const fin = ini + nueva.duracionMin * 60_000;
  return existentes.filter((c) => {
    if (c.id && c.id === nueva.id) return false;
    if (c.unidad !== nueva.unidad || c.estado === "CANCELADA") return false;
    const ci = c.inicio.getTime();
    return ci < fin && ini < ci + c.duracionMin * 60_000;
  });
}

/** Los inicios de bloque de un día (7:00, 7:20, …, 16:40). */
export function bloquesDelDia(dia: string): Date[] {
  const bloques: Date[] = [];
  for (let m = HORA_INICIO * 60; m < HORA_FIN * 60; m += BLOQUE_MIN) bloques.push(instanteColombia(dia, Math.floor(m / 60), m % 60));
  return bloques;
}

export const textoHora = (instante: Date) => {
  const { hora, minuto } = horaColombia(instante);
  const h12 = ((hora + 11) % 12) + 1;
  return `${h12}:${String(minuto).padStart(2, "0")} ${hora < 12 ? "a. m." : "p. m."}`;
};

// ---------------------------------------------------------------------------
// Calificación en la jornada
// ---------------------------------------------------------------------------

/**
 * La cita que agendó el estudiante al cerrar la historia. Solo se exige cuando la conducta
 * correcta es atender en la consulta (el paciente sigue su tratamiento aquí): cita de
 * tratamiento dentro de los 3 días hábiles, con teléfono para confirmar y, si es menor, a
 * nombre de su acudiente. null = no se califica.
 */
export function revisarCitaDeAtencion(opts: {
  conductaEsperada: string;
  citas: { tipo: string; inicio: Date; pacienteTelefono: string | null; acudienteNombre: string | null }[];
  cerradaEn: Date;
  esMenor: boolean;
}): { puntaje: number; lineas: { descripcion: string; cumplido: boolean }[] } | null {
  if (opts.conductaEsperada !== "ATENCION_EN_CONSULTA") return null;
  const cita = opts.citas.find((c) => c.tipo === "TRATAMIENTO") ?? opts.citas[0] ?? null;
  if (!cita) {
    return { puntaje: 0, lineas: [{ descripcion: "Agenda: faltó agendar la cita de tratamiento", cumplido: false }] };
  }
  const lineas = [
    { descripcion: "Agenda: cita de tratamiento", cumplido: cita.tipo === "TRATAMIENTO" },
    {
      descripcion: `Agenda: dentro de los ${OPORTUNIDAD_DIAS_HABILES} días hábiles (Res. 1552 de 2013)`,
      cumplido: cumpleOportunidad(opts.cerradaEn, cita.inicio),
    },
    { descripcion: "Agenda: teléfono para confirmar la cita", cumplido: Boolean(cita.pacienteTelefono?.trim()) },
  ];
  if (opts.esMenor) lineas.push({ descripcion: "Agenda: a nombre del acudiente del menor", cumplido: Boolean(cita.acudienteNombre?.trim()) });
  return { puntaje: Math.round((lineas.filter((l) => l.cumplido).length / lineas.length) * 100), lineas };
}
