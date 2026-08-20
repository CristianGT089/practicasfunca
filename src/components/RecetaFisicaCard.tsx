export type DatosRecetaFisica = {
  pacienteNombre: string;
  medicamento: string;
  posologia: string;
  cantidad: string;
  cantidadTachada?: string | null;
  medico: string;
  registroMedico: string;
  fechaEmision: string;
  diasVigencia: number;
  controlado?: boolean;
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function fechaVigencia(fechaEmisionISO: string, diasVigencia: number): { fecha: Date; vencida: boolean } {
  const fecha = new Date(fechaEmisionISO);
  fecha.setDate(fecha.getDate() + diasVigencia);
  return { fecha, vencida: fecha < new Date() };
}

/**
 * Receta médica física con aspecto de documento real (membrete, posología, firma
 * manuscrita), para que el estudiante tenga que leerla y contrastarla en vez de
 * confiar en una frase tipo "el cliente presenta una receta médica vigente".
 */
export default function RecetaFisicaCard({ datos, className = "" }: { datos: DatosRecetaFisica; className?: string }) {
  const { fecha: vence, vencida } = fechaVigencia(datos.fechaEmision, datos.diasVigencia);

  return (
    <div
      className={`relative w-full rounded-lg bg-[#fffdf7] border border-slate-300 shadow-lg overflow-hidden text-left ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(27,58,107,0.06) 28px)",
      }}
    >
      {datos.controlado && (
        <div
          className="absolute top-3 right-3 rounded-full border-2 border-red-600 text-red-600 text-[9px] font-bold w-16 h-16 flex items-center justify-center text-center leading-tight rotate-12 opacity-80 pointer-events-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          CONTROL ESPECIAL
        </div>
      )}

      <div className="bg-blue-900 px-4 py-2 flex items-center justify-between">
        <span className="font-heading text-xs font-bold tracking-wide text-white">RECETA MÉDICA</span>
        <span className="text-[10px] font-semibold text-gold-500">Rep. de Colombia · Salud</span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5">
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Paciente</p>
          <p className="text-sm font-semibold text-slate-800">{datos.pacienteNombre}</p>
        </div>

        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Medicamento</p>
          <p className="text-sm font-semibold text-blue-900">{datos.medicamento}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Posología</p>
            <p className="text-xs text-slate-700">{datos.posologia}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Cantidad</p>
            <p className="text-xs text-slate-700">
              {datos.cantidadTachada && (
                <span className="line-through text-red-500 mr-1.5">{datos.cantidadTachada}</span>
              )}
              <span className={datos.cantidadTachada ? "font-firma text-base text-red-700" : ""}>
                {datos.cantidad}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-300">
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Emitida</p>
            <p className="text-xs text-slate-700">{formatearFecha(datos.fechaEmision)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Vigente hasta</p>
            <p className={`text-xs ${vencida ? "text-red-600 font-semibold" : "text-slate-700"}`}>
              {vence.toLocaleDateString("es-CO")}
              {vencida ? " (vencida)" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between pt-2 mt-1">
          <div>
            <p className="font-firma text-2xl text-blue-900 leading-none">{datos.medico}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {datos.medico} · Reg. Médico {datos.registroMedico}
            </p>
          </div>
          <div className="rounded-full border border-slate-300 text-slate-400 text-[8px] w-12 h-12 flex items-center justify-center text-center leading-tight -rotate-6">
            SELLO
            <br />
            IPS
          </div>
        </div>
      </div>
    </div>
  );
}
