"use client";

import type { ItemClasificar } from "@/lib/clase/tipos";
import { useProgreso } from "../progreso";

type Datos = { respuestas: Record<string, string> };

/** Cada elemento se clasifica tocando una categoría; si no es la correcta, puede volver a intentar. */
export default function Clasificar({
  id,
  categorias,
  items,
}: {
  id: string;
  categorias: { id: string; nombre: string; icono?: string }[];
  items: ItemClasificar[];
}) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const respuestas = datos?.respuestas ?? {};
  const correctas = items.filter((i) => respuestas[i.id] === i.correcta).length;

  function responder(item: ItemClasificar, categoria: string) {
    const nuevas = { ...respuestas, [item.id]: categoria };
    const todas = items.every((i) => nuevas[i.id] === i.correcta);
    guardar({ respuestas: nuevas }, todas);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(correctas / items.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-blue-900">
          {correctas} de {items.length}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const r = respuestas[item.id];
          const bien = r === item.correcta;
          const mal = r && !bien;
          return (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-2.5 transition-colors ${
                bien ? "border-emerald-400 bg-emerald-50" : mal ? "border-rose-300 bg-rose-50" : "border-blue-200 bg-white"
              }`}
            >
              <span className="font-semibold text-blue-950">
                {bien ? "✅ " : mal ? "🔄 " : ""}
                {item.texto}
              </span>
              <span className="flex gap-1.5">
                {categorias.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => responder(item, c.id)}
                    disabled={bien}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      r === c.id
                        ? bien
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-500 text-white"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-40"
                    }`}
                  >
                    {c.icono} {c.nombre}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {correctas === items.length && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center font-semibold text-emerald-800">¡Muy bien! Clasificaste todo correctamente.</p>
      )}
    </div>
  );
}
