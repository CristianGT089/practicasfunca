"use client";

import { useState } from "react";
import HojaEnfermeriaFormulario from "@/components/modulos/enfermeria/HojaEnfermeria";
import { hojaVacia, type HojaEnfermeria } from "@/lib/modulos/enfermeria/hoja";

/** Caso de ejemplo para ver la hoja diligenciada: adulto mayor con digoxina y bradicardia. */
function ejemplo(): HojaEnfermeria {
  return {
    ...hojaVacia(),
    servicio: "Medicina interna",
    cama: "305-B",
    turno: "MANANA",
    diagnosticoMedico: "Insuficiencia cardiaca descompensada",
    alergias: "Penicilina",
    signos: [{ hora: "07:30", tas: 150, tad: 92, fc: 52, fr: 22, temperatura: 36.8, satO2: 93, glucometria: 128, dolor: 3 }],
    conciencia: "alerta",
    valoracion: ["orientado_tiempo", "orientado_espacio", "orientado_persona", "palidez", "edema", "disnea", "o2_canula", "deambula_ayuda", "cateter_periferico", "liquidos_ev"],
    escalas: {
      braden: { percepcion: 3, humedad: 3, actividad: 2, movilidad: 3, nutricion: 2, friccion: 2 },
      glasgow: { ocular: 4, verbal: 5, motora: 6 },
      downton: ["med_diureticos", "med_hipotensores", "def_visual", "deamb_ayuda"],
    },
    balance: { ingresos: { via_oral: 400, endovenosos: 500 }, egresos: { diuresis: 650 }, horas: 6 },
    medicamentos: [
      { medicamento: "Digoxina 0,25 mg", dosis: "0,25 mg", via: "Oral", frecuencia: "Cada 24 h", hora: "08:00", administrado: "NO", observacion: "FC 52 lpm. No se administra; se informa al médico de turno." },
      { medicamento: "Furosemida", dosis: "40 mg", via: "Intravenosa", frecuencia: "Cada 12 h", hora: "08:00", administrado: "SI", observacion: "" },
    ],
    nota: {
      s: "Refiere sentirse \"más ahogado al caminar\".",
      o: "TA 150/92, FC 52, FR 22, SatO₂ 93 % con cánula a 2 L/min. Edema en miembros inferiores.",
      a: "Bradicardia en paciente con digoxina; riesgo de caída (Downton 4).",
      p: "Suspender la dosis de digoxina hasta valoración médica; control de líquidos.",
      i: "08:00 no se administra digoxina, se informa al médico. 08:05 furosemida 40 mg IV. Barandas arriba.",
      e: "Paciente tranquilo; diuresis de 650 ml en el turno.",
    },
  };
}

export default function HojaEnfermeriaPage() {
  const [hoja, setHoja] = useState<HojaEnfermeria>(hojaVacia);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Enfermería</p>
          <h1 className="titulo-pagina mt-1">Hoja de enfermería</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Formato del registro del turno del Auxiliar en Enfermería. Calcula solo las escalas y el balance, e interpreta los signos
            vitales. Aquí puedes probarlo; no se guarda.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setHoja(ejemplo())} className="btn-secundario px-4 py-2">
            Llenar con un ejemplo
          </button>
          <button type="button" onClick={() => setHoja(hojaVacia())} className="btn text-slate-600 hover:bg-blue-50">
            Limpiar
          </button>
        </div>
      </div>
      <HojaEnfermeriaFormulario
        h={hoja}
        set={(c) => setHoja((h) => ({ ...h, ...c }))}
        paciente={{ nombre: "Rosa Elvira Martínez", edad: 78, documento: "CC 41.234.567" }}
      />
    </div>
  );
}
