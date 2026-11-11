"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Leccion } from "@/lib/clase/tipos";
import Image from "next/image";
import Diapositiva from "./Diapositiva";

export function tituloDiapositiva(d: Leccion["diapositivas"][number]) {
  if (d.tipo === "pregunta") return `💭 ${d.pregunta}`;
  return "titulo" in d && d.titulo ? d.titulo : d.tipo;
}

/**
 * Marco común del presentador y del estudiante: barra superior, la diapositiva y la barra de
 * navegación. Las flechas del teclado (y los punteros de presentación, que mandan RePág/AvPág)
 * pasan de diapositiva, salvo cuando se está escribiendo en una caja de texto.
 */
export default function Visor({
  leccion,
  indice,
  onIr,
  arriba,
  abajo,
  aviso,
  zoom = 1,
  marcada,
  limite,
  sesionPresentador,
  modo = "vivo",
  motivoLimite = "Espera a que el profe avance",
}: {
  leccion: Leccion;
  indice: number;
  onIr: (i: number) => void;
  /** Contenido a la derecha de la barra superior. */
  arriba?: ReactNode;
  /** Botones extra en la barra inferior. */
  abajo?: ReactNode;
  /** Franja de aviso sobre la diapositiva (ej. "El profe avanzó"). */
  aviso?: ReactNode;
  zoom?: number;
  /** Diapositiva a resaltar en el índice (donde va el profe). */
  marcada?: number | null;
  /** Última diapositiva a la que se puede llegar (la del profe en una clase en vivo). */
  limite?: number | null;
  /** Solo en el modo presentador: las preguntas rápidas muestran el compilado de esta clase. */
  sesionPresentador?: string;
  /** "ritmo" = clase a tu ritmo: muestra la explicación del profe en cada diapositiva. */
  modo?: "vivo" | "ritmo";
  /** Por qué no se puede pasar del límite (aparece al pasar el mouse por «Siguiente»). */
  motivoLimite?: string;
}) {
  const total = leccion.diapositivas.length;
  const ultima = limite == null ? total - 1 : Math.min(limite, total - 1);
  const d = leccion.diapositivas[indice];
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const origen = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["ArrowRight", "PageDown"].includes(e.key) && indice < ultima) {
        e.preventDefault();
        onIr(indice + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key) && indice > 0) {
        e.preventDefault();
        onIr(indice - 1);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [indice, ultima, onIr]);

  // Índice agrupado por sección.
  const secciones: { nombre: string; items: { i: number; titulo: string }[] }[] = [];
  leccion.diapositivas.forEach((x, i) => {
    const nombre = x.seccion ?? "";
    const ultima = secciones[secciones.length - 1];
    if (!ultima || ultima.nombre !== nombre) secciones.push({ nombre, items: [] });
    secciones[secciones.length - 1].items.push({ i, titulo: tituloDiapositiva(x) });
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-blue-900 px-4 py-2.5 text-white">
        <Image src="/funca-logo-blanco.png" alt="FUNCA" width={800} height={157} priority className="h-6 w-auto shrink-0 sm:h-7" />
        <span className="hidden h-6 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate font-heading text-sm font-bold text-white">{leccion.titulo}</span>
          <span className="block text-[11px] text-gold-400">{modo === "ritmo" ? "Clase a tu ritmo" : "Clase en vivo"}</span>
        </span>
        <span className="ml-auto flex items-center gap-2">{arriba}</span>
      </header>
      <div className="h-1 bg-blue-100">
        <div className="h-full bg-gold-500 transition-all" style={{ width: `${((indice + 1) / total) * 100}%` }} />
      </div>
      {aviso}

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl" style={zoom !== 1 ? { zoom } : undefined}>
          {d.seccion && d.tipo !== "seccion" && d.tipo !== "portada" && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-500">{d.seccion}</p>
          )}
          {modo === "ritmo" && d.guia && (
            <div className="mb-6 flex gap-3 rounded-3xl border-2 border-gold-500/50 bg-gold-50 px-4 py-3 sm:px-5 sm:py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-900 text-xl" aria-hidden>
                🧑‍🏫
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-700">El profe te explica</p>
                <p className="mt-0.5 text-base text-blue-950 sm:text-lg">{d.guia}</p>
              </div>
            </div>
          )}
          <Diapositiva key={indice} d={d} origen={modo === "ritmo" ? undefined : origen} sesionPresentador={sesionPresentador} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-blue-200 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <button onClick={() => onIr(indice - 1)} disabled={indice === 0} className="btn-suave" aria-label="Diapositiva anterior">
            ← Anterior
          </button>
          <div className="relative">
            <button onClick={() => setIndiceAbierto((v) => !v)} className="rounded-full px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50" aria-expanded={indiceAbierto}>
              {indice + 1} / {total} ▾
            </button>
            {indiceAbierto && (
              <div className="absolute bottom-12 left-0 z-40 max-h-[60vh] w-80 overflow-y-auto rounded-2xl border border-blue-200 bg-white p-2 shadow-xl">
                {secciones.filter((s) => s.items[0].i <= ultima).map((s) => (
                  <div key={s.nombre + s.items[0].i} className="mb-1">
                    {s.nombre && <p className="px-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-blue-500">{s.nombre}</p>}
                    {s.items.filter((it) => it.i <= ultima).map((it) => (
                      <button
                        key={it.i}
                        onClick={() => {
                          onIr(it.i);
                          setIndiceAbierto(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                          it.i === indice ? "bg-blue-800 text-white" : "text-slate-700 hover:bg-blue-50"
                        }`}
                      >
                        <span className="w-6 shrink-0 text-xs opacity-60">{it.i + 1}</span>
                        <span className="truncate">{it.titulo}</span>
                        {marcada === it.i && <span className="ml-auto shrink-0 rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-blue-900">PROFE</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onIr(indice + 1)}
            disabled={indice >= ultima}
            className="btn-primario"
            aria-label="Diapositiva siguiente"
            title={indice >= ultima && ultima < total - 1 ? motivoLimite : undefined}
          >
            Siguiente →
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">{abajo}</div>
        </div>
      </footer>
    </div>
  );
}
