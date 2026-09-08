"use client";

import { useState } from "react";

/**
 * Bocetos ASCII para la foto de la cédula. Elegidos a mano para que cada
 * paciente del simulador tenga un retrato reconocible sin depender de
 * imágenes externas (mantiene el componente autocontenido).
 */
export const RETRATOS_ASCII = {
  mujerJoven: [
    "   .-\"\"\"-.   ",
    "  /       \\  ",
    " |  o   o  | ",
    " |    >    | ",
    "  \\  ---  /  ",
    "   '-...-'   ",
    "  /|     |\\  ",
  ].join("\n"),
  mujerMayor: [
    "  .--\"\"\"\"--.  ",
    " /  ~~~~~~  \\ ",
    "|  o      o  |",
    "|     ^      |",
    "|   .----.   |",
    " \\  '----'  / ",
    "  '--------'  ",
  ].join("\n"),
  hombreJoven: [
    "   _______   ",
    "  /       \\  ",
    " | .     . | ",
    " |    _    | ",
    " |  \\___/  | ",
    "  \\_______/  ",
    "  |||   |||  ",
  ].join("\n"),
  hombreMayor: [
    "  _________  ",
    " /,-.,-.,-.\\ ",
    "| (o)   (o) |",
    "|     >     |",
    "|  ._____.  |",
    " \\_/¯¯¯¯¯\\_/ ",
    " /|| ||| ||\\ ",
  ].join("\n"),
  generico: [
    "   _______   ",
    "  /       \\  ",
    " |  ?   ?  | ",
    " |    __   | ",
    "  \\_______/  ",
    "  /|     |\\  ",
    "             ",
  ].join("\n"),
} as const;

export type RetratoId = keyof typeof RETRATOS_ASCII;

export type DatosCedula = {
  nombre: string;
  cedula: string;
  fechaNacimiento: string | null;
  lugarNacimiento: string | null;
  tipoSangre?: string | null;
  retrato?: RetratoId;
};

function edadDesdeFecha(fechaISO: string | null): number | null {
  if (!fechaISO) return null;
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const meses = hoy.getMonth() - fecha.getMonth();
  if (meses < 0 || (meses === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad;
}

/**
 * Tarjeta de cédula ficticia que se voltea al hacer clic (frente/reverso),
 * para que la entrega de identificación se sienta como un objeto físico
 * dentro del simulador y no como un simple texto en un modal.
 */
export default function CedulaCard({ datos, className = "" }: { datos: DatosCedula; className?: string }) {
  const [volteada, setVolteada] = useState(false);
  const retrato = RETRATOS_ASCII[datos.retrato ?? "generico"];
  const edad = edadDesdeFecha(datos.fechaNacimiento);

  return (
    <div className={`inline-block select-none ${className}`} style={{ perspective: "1200px" }}>
      <button
        type="button"
        onClick={() => setVolteada((v) => !v)}
        aria-label="Voltear cédula"
        className="relative block w-72 h-44 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: volteada ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ---------- Frente ---------- */}
        <div
          className="absolute inset-0 rounded-xl bg-white border border-slate-300 shadow-lg overflow-hidden text-left"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="bg-blue-900 px-3 py-1.5 flex items-center justify-between">
            <span className="font-heading text-[10px] font-bold tracking-wide text-white">
              REPÚBLICA DE COLOMBIA
            </span>
            <span className="text-[9px] font-semibold text-gold-500">CÉDULA DE CIUDADANÍA</span>
          </div>
          <div className="flex gap-3 p-3">
            <pre className="shrink-0 bg-blue-50 border border-blue-100 rounded-md text-blue-900 leading-[1.05] text-[8px] px-1.5 py-1 font-mono">
              {retrato}
            </pre>
            <div className="flex flex-col justify-center gap-0.5 text-slate-800 min-w-0">
              <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Nombre</p>
              <p className="text-xs font-semibold font-heading leading-tight truncate">{datos.nombre}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none mt-1.5">Número</p>
              <p className="text-sm font-bold text-blue-900 tracking-wider leading-none">{datos.cedula}</p>
            </div>
          </div>
          <div className="absolute bottom-1.5 right-2 text-[8px] text-slate-300">clic para voltear ↻</div>
        </div>

        {/* ---------- Reverso ---------- */}
        <div
          className="absolute inset-0 rounded-xl bg-white border border-slate-300 shadow-lg overflow-hidden text-left px-3 py-2.5"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="font-heading text-[10px] font-bold text-blue-900 mb-2 border-b border-slate-200 pb-1">
            DATOS ADICIONALES
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-700">
            <div>
              <p className="text-slate-400 uppercase tracking-wide leading-none text-[8px]">Fecha nacimiento</p>
              <p className="font-medium">
                {datos.fechaNacimiento ? new Date(datos.fechaNacimiento).toLocaleDateString("es-CO") : "No registrada"}
                {edad !== null ? ` (${edad} años)` : ""}
              </p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wide leading-none text-[8px]">Tipo de sangre</p>
              <p className="font-medium">{datos.tipoSangre ?? "No registrado"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 uppercase tracking-wide leading-none text-[8px]">Lugar de nacimiento</p>
              <p className="font-medium">{datos.lugarNacimiento ?? "No registrado"}</p>
            </div>
          </div>
          <div className="absolute bottom-2 left-3 right-3 h-6 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
          <div className="absolute bottom-1.5 right-2 text-[8px] text-slate-300">clic para voltear ↻</div>
        </div>
      </button>
    </div>
  );
}
