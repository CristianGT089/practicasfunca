"use client";

import { useState } from "react";
import { ANIMOS, normalizarGuion, type Guion, type MomentoFrase, type MomentoRespuesta, type OpcionGuion } from "@/lib/escena/guion";
import { PERSONAJES } from "@/lib/escena/personajes";

const FRASES: { clave: MomentoFrase; etiqueta: string }[] = [
  { clave: "pedirCedula", etiqueta: "Al entregar la cédula" },
  { clave: "negarCedula", etiqueta: "Al negarse a mostrar la cédula" },
  { clave: "entregarReceta", etiqueta: "Al entregar la fórmula" },
  { clave: "sinReceta", etiqueta: "Si no trae fórmula" },
  { clave: "error", etiqueta: "Cuando el estudiante se equivoca" },
  { clave: "venta", etiqueta: "Al completar la venta (despedida)" },
  { clave: "rechazo", etiqueta: "Cuando no le venden" },
];

const RESPUESTAS: { clave: MomentoRespuesta; etiqueta: string; ayuda: string }[] = [
  { clave: "saludo", etiqueta: "Saludo", ayuda: "Al llegar la persona, cómo la recibe el estudiante." },
  { clave: "alNegarCedula", etiqueta: "Si se niega a dar la cédula", ayuda: "Cómo le explica por qué la necesita." },
  { clave: "alRechazar", etiqueta: "Al no venderle o escalar", ayuda: "Cómo le explica la decisión." },
];

const EFECTOS = [
  { valor: 2, etiqueta: "Muy bien (+2)" },
  { valor: 1, etiqueta: "Bien (+1)" },
  { valor: 0, etiqueta: "Neutra (0)" },
  { valor: -1, etiqueta: "Mal (−1)" },
  { valor: -2, etiqueta: "Muy mal (−2)" },
];

const guionVacio = (): Guion => ({ animoInicial: 2, entrada: "", frases: {}, respuestas: {} });

const claseInput =
  "w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500";

/**
 * Persona animada y diálogo de un caso de práctica virtual. El estudiante ve a la persona
 * en la ventanilla, lee lo que dice y elige sus respuestas; el trato cuenta el 15 % de la
 * nota. Sin persona, el caso se ve como siempre.
 */
export default function EditorGuion({
  escenarioId,
  personajeInicial,
  guionInicial,
  onGuardado,
  onCancelar,
}: {
  escenarioId: string;
  personajeInicial: string | null;
  guionInicial: unknown;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [personaje, setPersonaje] = useState(personajeInicial ?? "");
  const [guion, setGuion] = useState<Guion>(() => normalizarGuion(guionInicial) ?? guionVacio());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const setFrase = (k: MomentoFrase, v: string) => setGuion((g) => ({ ...g, frases: { ...g.frases, [k]: v } }));
  const setOpciones = (k: MomentoRespuesta, lista: OpcionGuion[]) => setGuion((g) => ({ ...g, respuestas: { ...g.respuestas, [k]: lista } }));

  async function guardar() {
    setError(null);
    if (personaje && !guion.entrada.trim()) {
      setError("Escribe al menos lo primero que dice la persona al llegar.");
      return;
    }
    setGuardando(true);
    const res = await fetch(`/api/admin/escenarios/${escenarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaje: personaje || null, guion: personaje ? guion : null }),
    });
    setGuardando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo guardar");
      return;
    }
    onGuardado();
  }

  return (
    <div className="mt-3 flex flex-col gap-4 border-t border-slate-100 pt-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Persona en la ventanilla
          <select value={personaje} onChange={(e) => setPersonaje(e.target.value)} className={`${claseInput} mt-1`}>
            <option value="">Ninguna (el caso se ve sin escena)</option>
            {Object.values(PERSONAJES).map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.slug.charAt(0).toUpperCase() + p.slug.slice(1)}: {p.descripcion}
              </option>
            ))}
          </select>
        </label>
        {personaje && (
          <label className="text-xs font-medium text-slate-600">
            Ánimo al llegar
            <select
              value={guion.animoInicial}
              onChange={(e) => setGuion((g) => ({ ...g, animoInicial: Number(e.target.value) }))}
              className={`${claseInput} mt-1`}
            >
              {ANIMOS.map((a, i) => (
                <option key={a.texto} value={i}>
                  {a.texto}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {personaje && (
        <>
          <label className="text-xs font-medium text-slate-600">
            Lo primero que dice al llegar
            <textarea
              rows={2}
              value={guion.entrada}
              onChange={(e) => setGuion((g) => ({ ...g, entrada: e.target.value }))}
              className={`${claseInput} mt-1`}
              placeholder="¡Por fin! Llevo media hora esperando…"
            />
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Frases según lo que pase (opcionales)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FRASES.map((f) => (
                <label key={f.clave} className="text-xs text-slate-600">
                  {f.etiqueta}
                  <input value={guion.frases[f.clave] ?? ""} onChange={(e) => setFrase(f.clave, e.target.value)} className={`${claseInput} mt-1`} />
                </label>
              ))}
            </div>
          </div>

          {RESPUESTAS.map((r) => {
            const lista = guion.respuestas[r.clave] ?? [];
            return (
              <div key={r.clave} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Respuestas del estudiante: {r.etiqueta}</p>
                    <p className="text-[11px] text-slate-500">{r.ayuda}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpciones(r.clave, [...lista, { texto: "", efecto: 0, respuesta: "" }])}
                    className="rounded-md border border-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    + Opción
                  </button>
                </div>
                {lista.length === 0 ? (
                  <p className="mt-2 text-[11px] text-slate-400">Sin opciones: en este momento no se le pregunta nada al estudiante.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {lista.map((o, i) => {
                      const cambiar = (c: Partial<OpcionGuion>) => setOpciones(r.clave, lista.map((x, j) => (j === i ? { ...x, ...c } : x)));
                      return (
                        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto] items-start">
                          <input value={o.texto} onChange={(e) => cambiar({ texto: e.target.value })} placeholder="Lo que dice el estudiante" className={claseInput} />
                          <input value={o.respuesta} onChange={(e) => cambiar({ respuesta: e.target.value })} placeholder="Lo que contesta la persona" className={claseInput} />
                          <select value={o.efecto} onChange={(e) => cambiar({ efecto: Number(e.target.value) })} className={claseInput} aria-label="Efecto en el ánimo">
                            {EFECTOS.map((ef) => (
                              <option key={ef.valor} value={ef.valor}>
                                {ef.etiqueta}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setOpciones(r.clave, lista.filter((_, j) => j !== i))}
                            className="py-2 text-xs text-slate-400 hover:text-red-600"
                          >
                            Quitar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-slate-500">
            Consejo: que la respuesta amable no sea siempre la más larga, o el estudiante aprende a reconocer el patrón en vez de a comunicarse.
          </p>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-full font-heading bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Guardar persona y diálogo"}
        </button>
        <button type="button" onClick={onCancelar} className="text-xs text-slate-500">
          Cancelar
        </button>
      </div>
    </div>
  );
}
