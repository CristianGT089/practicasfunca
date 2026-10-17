"use client";

import AgendaCitas from "@/components/modulos/odontologia/AgendaCitas";
import { OPORTUNIDAD_DIAS_HABILES } from "@/lib/modulos/odontologia/agenda";

/**
 * Agenda real del consultorio de práctica de Salud Oral: una agenda por unidad (silla), de
 * lunes a viernes hábiles. Las jornadas tienen su propia agenda de práctica, aparte.
 */
export default function AgendaOdontologiaPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Odontología</p>
      <h1 className="titulo-pagina mt-1">Agenda de citas</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-slate-500">
        Citas del consultorio por unidad. Sin cruces y sin festivos. Por norma (Res. 1552 de 2013), la cita de odontología general se asigna
        en máximo {OPORTUNIDAD_DIAS_HABILES} días hábiles desde que se pide, salvo que el paciente pida otra fecha: márcalo en la cita cuando
        sea así. Toca una cita para confirmarla, registrar si asistió, reprogramarla o cancelarla.
      </p>
      <AgendaCitas jornada={null} />
    </div>
  );
}
