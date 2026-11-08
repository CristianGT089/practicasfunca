"use client";

import { useState } from "react";
import type { NodoArbol, PasoChecklist } from "@/lib/clase/tipos";
import { useProgreso } from "../progreso";
import Arbol from "../Arbol";

type Datos = { hechos: string[] };

/** Pasos que se hacen fuera de la plataforma (Archivos, Drive…) y se marcan al terminarlos. */
export default function Checklist({
  id,
  pasos,
  enlace,
  arbol,
}: {
  id: string;
  pasos: PasoChecklist[];
  enlace?: { href: string; texto: string };
  arbol?: NodoArbol;
}) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const [ayuda, setAyuda] = useState<string | null>(null);

  function alternar(paso: string) {
    const nuevos = new Set(hechos);
    if (nuevos.has(paso)) nuevos.delete(paso);
    else nuevos.add(paso);
    guardar({ hechos: [...nuevos] }, pasos.every((p) => nuevos.has(p.id)));
  }

  const listos = pasos.filter((p) => hechos.has(p.id)).length;

  return (
    <div className={`grid gap-5 ${arbol ? "lg:grid-cols-[1fr_260px]" : ""}`}>
      <div className="flex flex-col gap-3">
        {enlace && (
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="btn-cta self-start">
            {enlace.texto} ↗
          </a>
        )}
        <ol className="flex flex-col gap-2">
          {pasos.map((p, i) => {
            const hecho = hechos.has(p.id);
            return (
              <li key={p.id} className={`rounded-2xl border-2 transition-colors ${hecho ? "border-emerald-300 bg-emerald-50" : "border-blue-200 bg-white"}`}>
                <div className="flex items-start gap-3 px-4 py-2.5">
                  <button
                    onClick={() => alternar(p.id)}
                    aria-pressed={hecho}
                    aria-label={hecho ? `Desmarcar paso ${i + 1}` : `Marcar paso ${i + 1} como hecho`}
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-colors ${
                      hecho ? "border-emerald-500 bg-emerald-500 text-white" : "border-blue-300 text-blue-700 hover:border-blue-600"
                    }`}
                  >
                    {hecho ? "✓" : i + 1}
                  </button>
                  <div className="flex-1">
                    <button onClick={() => alternar(p.id)} className={`text-left font-medium ${hecho ? "text-emerald-900" : "text-blue-950"}`}>
                      {p.texto}
                    </button>
                    {p.ayuda && ayuda === p.id && <p className="mt-1 text-sm text-slate-600">{p.ayuda}</p>}
                  </div>
                  {p.ayuda && (
                    <button
                      onClick={() => setAyuda(ayuda === p.id ? null : p.id)}
                      className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-200"
                    >
                      {ayuda === p.id ? "Ocultar" : "¿Cómo?"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className={`text-sm font-semibold ${listos === pasos.length ? "text-emerald-700" : "text-slate-500"}`}>
          {listos === pasos.length ? "¡Listo! Completaste todos los pasos." : `${listos} de ${pasos.length} pasos`}
        </p>
      </div>
      {arbol && (
        <div className="tarjeta-sm self-start p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700">Así debe quedar</p>
          <Arbol nodo={arbol} />
        </div>
      )}
    </div>
  );
}
