"use client";

import { useEffect, useState } from "react";
import { useProgreso, useRevelacion } from "./progreso";

type Props = {
  id: string;
  pregunta: string;
  opciones: string[];
  correcta?: number;
  explicacion?: string;
  /** Id de la clase en vivo si se está proyectando: muestra el compilado en lugar de los botones. */
  sesionPresentador?: string;
};

const LETRAS = ["A", "B", "C", "D", "E", "F"];

/** Pregunta rápida, no calificable. El estudiante elige (y puede cambiar); el docente ve el compilado. */
export default function Pregunta(props: Props) {
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
        💭 Pregunta rápida · no tiene nota
      </span>
      <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-blue-900 sm:text-5xl">{props.pregunta}</h2>
      {props.sesionPresentador ? <Compilado {...props} sesionId={props.sesionPresentador} /> : <Votar {...props} />}
    </div>
  );
}

function Votar({ id, opciones, correcta, explicacion }: Props) {
  const { datos, guardar } = useProgreso<{ opcion: number }>(id);
  const { reveladas } = useRevelacion();
  const elegida = datos?.opcion ?? null;
  // En clase en vivo, la respuesta aparece cuando el profe la revela. En modo repaso (sin clase),
  // apenas respondes.
  const revelada = reveladas === null ? elegida !== null : reveladas.includes(id);
  const hayCorrecta = correcta !== undefined;
  const acerto = hayCorrecta && elegida === correcta;

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {opciones.map((o, i) => {
          const esElegida = elegida === i;
          const esCorrecta = revelada && hayCorrecta && i === correcta;
          const esError = revelada && hayCorrecta && esElegida && i !== correcta;
          const estilo = esCorrecta
            ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-200"
            : esError
              ? "border-rose-400 bg-rose-50 text-rose-950"
              : esElegida
                ? "border-blue-800 bg-blue-800 text-white shadow-lg"
                : revelada
                  ? "border-blue-100 bg-white text-slate-400"
                  : "border-blue-200 bg-white text-blue-950 hover:border-blue-500";
          return (
            <button
              key={i}
              onClick={() => guardar({ opcion: i }, true)}
              disabled={revelada}
              aria-pressed={esElegida}
              className={`flex items-center gap-4 rounded-3xl border-2 px-5 py-4 text-left text-xl font-semibold transition-all disabled:cursor-default ${estilo} ${
                esElegida && !revelada ? "scale-[1.02]" : ""
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-heading font-bold ${
                  esCorrecta ? "bg-emerald-500 text-white" : esError ? "bg-rose-500 text-white" : esElegida ? "bg-gold-500 text-blue-900" : "bg-blue-100 text-blue-800"
                }`}
              >
                {esCorrecta ? "✓" : esError ? "✗" : LETRAS[i]}
              </span>
              <span className="flex-1">{o}</span>
              {revelada && esElegida && <span className="shrink-0 text-xs font-bold uppercase tracking-wider opacity-70">Tu respuesta</span>}
            </button>
          );
        })}
      </div>

      {!revelada && (
        <p className="mt-5 text-center text-slate-600">
          {elegida === null
            ? "Toca la opción que creas. No importa si no sabes: es para aprender."
            : "✓ Respuesta enviada. Puedes cambiarla hasta que el profe muestre la respuesta."}
        </p>
      )}

      {revelada && (
        <div className={`mt-5 rounded-3xl px-5 py-4 text-center ${!hayCorrecta ? "bg-blue-50" : acerto ? "bg-emerald-50" : "bg-gold-50"}`}>
          <p className={`font-heading text-xl font-bold ${!hayCorrecta ? "text-blue-900" : acerto ? "text-emerald-800" : "text-blue-950"}`}>
            {!hayCorrecta
              ? "¡Gracias por responder!"
              : elegida === null
                ? `La respuesta correcta era: ${opciones[correcta!]}`
                : acerto
                  ? "🎉 ¡Acertaste!"
                  : `Esta vez no. La correcta es: ${opciones[correcta!]}`}
          </p>
          {explicacion && <p className="mt-1 text-lg text-slate-700">{explicacion}</p>}
        </div>
      )}
    </div>
  );
}

/** Lo que se proyecta: cada opción crece según cuántos la eligieron (la más votada, la más grande). */
function Compilado({ id, opciones, correcta, explicacion, sesionId }: Props & { sesionId: string }) {
  const [conteo, setConteo] = useState<number[]>(opciones.map(() => 0));
  const [total, setTotal] = useState(0);
  const [asistentes, setAsistentes] = useState(0);
  const { reveladas, revelar } = useRevelacion();
  const revelada = !!reveladas?.includes(id);

  useEffect(() => {
    const cargar = () =>
      fetch(`/api/admin/clase/${sesionId}/respuestas?pregunta=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          setConteo(d.conteo);
          setTotal(d.total);
          setAsistentes(d.asistentes);
        })
        .catch(() => {});
    cargar();
    const t = setInterval(cargar, 2000);
    return () => clearInterval(t);
  }, [id, sesionId]);

  const max = Math.max(...conteo, 1);

  return (
    <div className="mt-6">
      <div className="flex min-h-[260px] flex-wrap items-center justify-center gap-4">
        {opciones.map((o, i) => {
          const votos = conteo[i] ?? 0;
          const peso = total > 0 ? votos / max : 0;
          const esLider = total > 0 && votos === max;
          const esCorrecta = revelada && correcta === i;
          const atenuada = revelada && correcta !== undefined && correcta !== i;
          // De 1.1rem (nadie la eligió) a 3.4rem (la más votada).
          const tamano = 1.1 + peso * 2.3;
          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded-3xl border-2 px-6 py-4 text-center transition-all duration-700 ${
                esCorrecta
                  ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300"
                  : esLider
                    ? "border-gold-500 bg-gold-50"
                    : "border-blue-200 bg-white"
              } ${atenuada ? "opacity-40" : ""}`}
              style={{ flexGrow: 1 + peso * 2, flexBasis: "200px" }}
            >
              <span className="font-heading text-sm font-bold text-blue-500">
                {LETRAS[i]} {esCorrecta && "· ✅ Correcta"}
              </span>
              <span className="font-heading font-extrabold leading-tight text-blue-950 transition-all duration-700" style={{ fontSize: `${tamano}rem` }}>
                {o}
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-600">
                {votos} {votos === 1 ? "voto" : "votos"}
                {total > 0 && ` · ${Math.round((votos / total) * 100)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-900">
          {total} de {asistentes} respondieron
        </span>
        {correcta !== undefined && (
          <button onClick={() => revelar?.(id, !revelada)} className={revelada ? "btn-suave" : "btn-cta"}>
            {revelada ? "Ocultar respuesta" : "Mostrar respuesta a todos"}
          </button>
        )}
      </div>
      {revelada && explicacion && <p className="mx-auto mt-4 max-w-3xl text-center text-xl text-blue-900">{explicacion}</p>}
    </div>
  );
}
