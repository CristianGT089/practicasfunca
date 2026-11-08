"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useProgreso } from "../progreso";

type Datos = { hechos: string[] };

// Parte 1: se detectan al presionarlos en la página. Los marcados con `prevenir` se bloquean para
// que no abran el diálogo de guardar/imprimir/buscar del navegador.
const DETECTABLES = [
  { id: "c", teclas: "Ctrl + C", accion: "Copiar" },
  { id: "v", teclas: "Ctrl + V", accion: "Pegar" },
  { id: "x", teclas: "Ctrl + X", accion: "Cortar" },
  { id: "z", teclas: "Ctrl + Z", accion: "Deshacer" },
  { id: "y", teclas: "Ctrl + Y", accion: "Rehacer" },
  { id: "a", teclas: "Ctrl + A", accion: "Seleccionar todo" },
  { id: "s", teclas: "Ctrl + S", accion: "Guardar", prevenir: true },
  { id: "f", teclas: "Ctrl + F", accion: "Buscar", prevenir: true },
  { id: "p", teclas: "Ctrl + P", accion: "Imprimir", prevenir: true },
  { id: "b", teclas: "Ctrl + B", accion: "Negrita", prevenir: true },
  { id: "i", teclas: "Ctrl + I", accion: "Cursiva", prevenir: true },
  { id: "u", teclas: "Ctrl + U", accion: "Subrayado", prevenir: true },
];

// Parte 3: atajos del sistema que el navegador no deja detectar: se marcan a mano.
const CHROMEBOOK = [
  { id: "cb-alt-tab", teclas: "Alt + Tab", texto: "Cambia a otra ventana y vuelve a esta." },
  { id: "cb-ventanas", teclas: "Tecla ▭", texto: "La tecla de «mostrar ventanas» (fila de arriba): ve todas las ventanas abiertas." },
  { id: "cb-captura", teclas: "Ctrl + ▭", texto: "Toma una captura de pantalla. Queda en Descargas." },
  { id: "cb-archivos", teclas: "Alt + Shift + M", texto: "Abre la app Archivos. Ciérrala con Ctrl + W." },
  { id: "cb-pestanas", teclas: "Ctrl + T · Ctrl + W · Ctrl + Shift + T", texto: "Abre una pestaña, ciérrala y recupérala." },
  { id: "cb-zoom", teclas: "Ctrl + «+» · Ctrl + «−» · Ctrl + 0", texto: "Agranda, achica y vuelve al tamaño normal." },
  { id: "cb-mayus", teclas: "Alt + 🔍", texto: "Activa y desactiva Bloq Mayús (el Chromebook no tiene esa tecla)." },
  { id: "cb-lista", teclas: "Ctrl + Alt + /", texto: "Muestra la lista de todos los atajos del Chromebook. Búscalos ahí cuando no recuerdes uno." },
];

const TAREAS = ["t-copiar", "t-borrar", "t-cortar", "t-deshacer"];
const NECESARIOS = [...DETECTABLES.map((d) => d.id), ...TAREAS];

const ORIGINAL_DESHACER = "Signos vitales: pulso, temperatura, presión arterial y frecuencia respiratoria.";
const FRASE_COPIAR = "El lavado de manos dura entre 40 y 60 segundos.";

export default function Atajos({ id }: { id: string }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  // Copia al día para marcar varios atajos seguidos antes de que se vuelva a pintar.
  const hechosRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    hechosRef.current = new Set(datos?.hechos ?? []);
  }, [datos]);
  const [parte, setParte] = useState<1 | 2 | 3>(1);
  const [ultimo, setUltimo] = useState<string | null>(null);

  function marcar(ids: string[], valor = true) {
    const nuevos = new Set(hechosRef.current);
    let cambio = false;
    for (const i of ids) {
      if (valor && !nuevos.has(i)) {
        nuevos.add(i);
        cambio = true;
      }
      if (!valor && nuevos.has(i)) {
        nuevos.delete(i);
        cambio = true;
      }
    }
    if (!cambio) return;
    hechosRef.current = nuevos;
    guardar({ hechos: [...nuevos] }, NECESARIOS.every((n) => nuevos.has(n)));
  }
  const alPresionar = useEffectEvent((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const d = DETECTABLES.find((x) => x.id === e.key.toLowerCase());
    if (!d) return;
    if (d.prevenir) e.preventDefault();
    setUltimo(d.id);
    marcar([d.id]);
  });

  useEffect(() => {
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  const cuenta = (ids: string[]) => ids.filter((i) => hechos.has(i)).length;
  const partes = [
    { n: 1 as const, titulo: "1 · Pruébalos", hechos: cuenta(DETECTABLES.map((d) => d.id)), total: DETECTABLES.length },
    { n: 2 as const, titulo: "2 · Úsalos", hechos: cuenta(TAREAS), total: TAREAS.length },
    { n: 3 as const, titulo: "3 · Los del Chromebook", hechos: cuenta(CHROMEBOOK.map((c) => c.id)), total: CHROMEBOOK.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {partes.map((p) => (
          <button
            key={p.n}
            role="tab"
            aria-selected={parte === p.n}
            onClick={() => setParte(p.n)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              parte === p.n ? "bg-blue-800 text-white" : "bg-blue-100 text-blue-800 hover:bg-blue-200"
            }`}
          >
            {p.titulo}{" "}
            <span className={p.hechos === p.total ? "text-emerald-400" : "opacity-70"}>
              {p.hechos === p.total ? "✓" : `${p.hechos}/${p.total}`}
            </span>
          </button>
        ))}
      </div>

      {parte === 1 && (
        <>
          <p className="text-slate-700">Mantén apretada <b>Ctrl</b> y toca la letra. Cada atajo que presiones se pone en verde.</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {DETECTABLES.map((d) => {
              const hecho = hechos.has(d.id);
              return (
                <div
                  key={d.id}
                  className={`rounded-2xl border-2 px-3 py-3 text-center transition-all ${
                    hecho ? "border-emerald-400 bg-emerald-50" : "border-blue-200 bg-white"
                  } ${ultimo === d.id ? "scale-105 shadow-lg" : ""}`}
                >
                  <kbd className="font-mono text-lg font-bold text-blue-950">{d.teclas}</kbd>
                  <div className={`text-sm ${hecho ? "text-emerald-800" : "text-slate-600"}`}>
                    {hecho ? "✓ " : ""}
                    {d.accion}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">
            En un Mac sería ⌘ en vez de Ctrl. Aquí bloqueamos Guardar, Buscar e Imprimir para que no se abran ventanas del navegador.
          </p>
        </>
      )}

      {parte === 2 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <TareaCopiar hecho={hechos.has("t-copiar")} onListo={() => marcar(["t-copiar"])} />
          <TareaBorrar hecho={hechos.has("t-borrar")} onListo={() => marcar(["t-borrar"])} />
          <TareaCortar hecho={hechos.has("t-cortar")} onListo={() => marcar(["t-cortar"])} />
          <TareaDeshacer hecho={hechos.has("t-deshacer")} onListo={() => marcar(["t-deshacer"])} />
        </div>
      )}

      {parte === 3 && (
        <>
          <p className="text-slate-700">
            Estos son del <b>sistema operativo</b>: en Windows o Mac son distintos. El navegador no los puede detectar, así que pruébalos y márcalos tú.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHROMEBOOK.map((c) => {
              const hecho = hechos.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => marcar([c.id], !hecho)}
                  aria-pressed={hecho}
                  className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                    hecho ? "border-emerald-400 bg-emerald-50" : "border-blue-200 bg-white hover:border-blue-400"
                  }`}
                >
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-xs font-bold ${hecho ? "border-emerald-500 bg-emerald-500 text-white" : "border-blue-300"}`}>
                    {hecho ? "✓" : ""}
                  </span>
                  <span>
                    <kbd className="font-mono font-bold text-blue-950">{c.teclas}</kbd>
                    <span className="block text-sm text-slate-600">{c.texto}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {NECESARIOS.every((n) => hechos.has(n)) && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center font-semibold text-emerald-800">
          ¡Muy bien! Ya dominas los atajos esenciales. {cuenta(CHROMEBOOK.map((c) => c.id)) < CHROMEBOOK.length ? "Te faltan algunos del Chromebook (parte 3)." : ""}
        </p>
      )}
    </div>
  );
}

function Tarea({ titulo, instrucciones, hecho, children }: { titulo: string; instrucciones: string; hecho: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${hecho ? "border-emerald-400 bg-emerald-50" : "border-blue-200 bg-white"}`}>
      <p className="font-heading font-bold text-blue-950">
        {hecho ? "✅ " : ""}
        {titulo}
      </p>
      <p className="mb-2 text-sm text-slate-600">{instrucciones}</p>
      {children}
    </div>
  );
}

const claseCaja = "w-full resize-none rounded-xl border-2 border-blue-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-blue-600";

function TareaCopiar({ hecho, onListo }: { hecho: boolean; onListo: () => void }) {
  return (
    <Tarea titulo="Copiar y pegar" instrucciones="Selecciona la frase gris, cópiala con Ctrl + C y pégala en la caja con Ctrl + V." hecho={hecho}>
      <p className="mb-2 rounded-xl bg-slate-100 px-3 py-2 text-[15px] text-slate-800 selection:bg-gold-100">{FRASE_COPIAR}</p>
      <textarea
        rows={2}
        className={claseCaja}
        placeholder="Pega aquí…"
        onInput={(e) => e.currentTarget.value.includes(FRASE_COPIAR) && onListo()}
      />
    </Tarea>
  );
}

function TareaBorrar({ hecho, onListo }: { hecho: boolean; onListo: () => void }) {
  return (
    <Tarea titulo="Seleccionar todo y borrar" instrucciones="Haz clic en la caja, Ctrl + A para seleccionar todo, Retroceso para borrar, y escribe: listo" hecho={hecho}>
      <textarea
        rows={3}
        className={claseCaja}
        defaultValue="sdkfj wqoeiru zmxncb laksjd qpwoeiru alskdj zmxnc qwe rty uio asd fgh jkl zxc vbn qwerty asdfgh zxcvbn"
        onInput={(e) => e.currentTarget.value.trim().toLowerCase() === "listo" && onListo()}
      />
    </Tarea>
  );
}

function TareaCortar({ hecho, onListo }: { hecho: boolean; onListo: () => void }) {
  return (
    <Tarea
      titulo="Cortar y pegar"
      instrucciones="Ordena la lista para que quede «guantes, tapabocas, bata»: selecciona «guantes», córtalo con Ctrl + X y pégalo al inicio con Ctrl + V."
      hecho={hecho}
    >
      <textarea
        rows={2}
        className={claseCaja}
        defaultValue="tapabocas, bata, guantes"
        onInput={(e) => {
          const palabras = e.currentTarget.value.toLowerCase().match(/[a-záéíóúñ]+/g) ?? [];
          if (palabras.join(" ") === "guantes tapabocas bata") onListo();
        }}
      />
    </Tarea>
  );
}

function TareaDeshacer({ hecho, onListo }: { hecho: boolean; onListo: () => void }) {
  const vacio = useRef(false);
  return (
    <Tarea titulo="Deshacer" instrucciones="Borra todo el texto (Ctrl + A y Retroceso). ¡Uy! Ahora recupéralo con Ctrl + Z." hecho={hecho}>
      <textarea
        rows={3}
        className={claseCaja}
        defaultValue={ORIGINAL_DESHACER}
        onInput={(e) => {
          const v = e.currentTarget.value;
          if (v.trim() === "") vacio.current = true;
          else if (vacio.current && v === ORIGINAL_DESHACER) onListo();
        }}
      />
      {!hecho && <p className="mt-1 text-xs text-slate-500">Si se te dañó, recarga la página para empezar de nuevo.</p>}
    </Tarea>
  );
}
