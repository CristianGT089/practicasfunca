"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useProgreso } from "../progreso";
import { teclaCtrl, useDispositivo, type Dispositivo } from "@/lib/clase/dispositivo";

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

const WINDOWS = [
  { id: "w-alt-tab", teclas: "Alt + Tab", texto: "Cambia a otra ventana y vuelve a esta." },
  { id: "w-tab", teclas: "Windows + Tab", texto: "Muestra todas las ventanas abiertas." },
  { id: "w-captura", teclas: "Windows + Shift + S", texto: "Toma una captura de una parte de la pantalla. Pégala con Ctrl + V." },
  { id: "w-archivos", teclas: "Windows + E", texto: "Abre el Explorador de archivos." },
  { id: "w-escritorio", teclas: "Windows + D", texto: "Muestra el escritorio (y vuelve)." },
  { id: "w-pestanas", teclas: "Ctrl + T · Ctrl + W · Ctrl + Shift + T", texto: "Abre una pestaña, ciérrala y recupérala." },
  { id: "w-zoom", teclas: "Ctrl + «+» · Ctrl + «−» · Ctrl + 0", texto: "Agranda, achica y vuelve al tamaño normal." },
  { id: "w-bloquear", teclas: "Windows + L", texto: "Bloquea el equipo. Hazlo siempre que te pares del puesto." },
];
const MAC = [
  { id: "m-cmd-tab", teclas: "⌘ + Tab", texto: "Cambia a otra aplicación y vuelve a esta." },
  { id: "m-buscar", teclas: "⌘ + Espacio", texto: "Abre Spotlight: escribe el nombre de una app o archivo y Enter." },
  { id: "m-captura", teclas: "⌘ + Shift + 4", texto: "Toma una captura de una parte de la pantalla (queda en el escritorio)." },
  { id: "m-finder", teclas: "⌘ + Option + Espacio", texto: "Abre una ventana del Finder (los archivos)." },
  { id: "m-cerrar", teclas: "⌘ + Q", texto: "Cierra la aplicación del todo (⌘ + W solo cierra la ventana)." },
  { id: "m-pestanas", teclas: "⌘ + T · ⌘ + W · ⌘ + Shift + T", texto: "Abre una pestaña, ciérrala y recupérala." },
  { id: "m-zoom", teclas: "⌘ + «+» · ⌘ + «−» · ⌘ + 0", texto: "Agranda, achica y vuelve al tamaño normal." },
  { id: "m-bloquear", teclas: "Ctrl + ⌘ + Q", texto: "Bloquea el equipo." },
];
const LINUX = [
  { id: "l-alt-tab", teclas: "Alt + Tab", texto: "Cambia a otra ventana y vuelve a esta." },
  { id: "l-super", teclas: "Tecla Super (la de Windows)", texto: "Muestra las actividades y el buscador de aplicaciones." },
  { id: "l-captura", teclas: "Impr Pant", texto: "Toma una captura de pantalla." },
  { id: "l-terminal", teclas: "Ctrl + Alt + T", texto: "Abre la terminal (en Ubuntu y otras)." },
  { id: "l-pestanas", teclas: "Ctrl + T · Ctrl + W · Ctrl + Shift + T", texto: "Abre una pestaña, ciérrala y recupérala." },
  { id: "l-zoom", teclas: "Ctrl + «+» · Ctrl + «−» · Ctrl + 0", texto: "Agranda, achica y vuelve al tamaño normal." },
  { id: "l-bloquear", teclas: "Super + L", texto: "Bloquea el equipo." },
];
/** En el celular no hay atajos de teclado: hay gestos y botones que hacen lo mismo. */
const CELULAR = [
  { id: "c-captura", teclas: "Encendido + bajar volumen", texto: "Toma una captura de pantalla (en casi todos los Android y en iPhone con Face ID: lateral + subir volumen)." },
  { id: "c-apps", teclas: "Desliza desde abajo y mantén", texto: "Muestra las apps abiertas para cambiar entre ellas (o el botón ▢ si tu celular tiene botones)." },
  { id: "c-dictado", teclas: "🎤 en el teclado", texto: "Dicta en vez de escribir: sirve en Docs, WhatsApp y el correo." },
  { id: "c-buscar", teclas: "⋮ › Buscar en la página", texto: "En Chrome, busca una palabra dentro de la página (lo que en el computador es Ctrl + F)." },
  { id: "c-lens", teclas: "Google Lens", texto: "Copia el texto de una foto (una fórmula médica, un aviso) sin volver a escribirlo." },
  { id: "c-dividir", teclas: "Pantalla dividida", texto: "Dos apps a la vez: en las apps abiertas, toca el ícono de la app › Pantalla dividida." },
];
const DEL_SISTEMA: Record<Dispositivo, { id: string; teclas: string; texto: string }[]> = {
  chromebook: CHROMEBOOK,
  windows: WINDOWS,
  mac: MAC,
  linux: LINUX,
  celular: CELULAR,
};
const NOMBRE_SISTEMA: Record<Dispositivo, string> = { chromebook: "Chromebook", windows: "Windows", mac: "Mac", linux: "Linux", celular: "celular" };

/** En el celular, la parte 1 es reconocer qué hace cada atajo (en el trabajo usarán computador). */
const QUIZ = DETECTABLES.slice(0, 9).map((d, i) => {
  const otras = DETECTABLES.filter((x) => x.id !== d.id);
  const opciones = [d.accion, otras[(i * 3 + 1) % otras.length].accion, otras[(i * 3 + 5) % otras.length].accion];
  // Orden fijo pero no siempre con la correcta de primera.
  const giro = i % 3;
  return { id: `q-${d.id}`, letra: d.id.toUpperCase(), correcta: d.accion, opciones: [...opciones.slice(giro), ...opciones.slice(0, giro)] };
});

const TAREAS = ["t-copiar", "t-borrar", "t-cortar", "t-deshacer"];
const TAREAS_CELULAR = ["t-copiar", "t-borrar", "t-cortar"];
const necesarios = (d: Dispositivo) =>
  d === "celular" ? [...QUIZ.map((q) => q.id), ...TAREAS_CELULAR] : [...DETECTABLES.map((x) => x.id), ...TAREAS];

const ORIGINAL_DESHACER = "Signos vitales: pulso, temperatura, presión arterial y frecuencia respiratoria.";
const FRASE_COPIAR = "El lavado de manos dura entre 40 y 60 segundos.";

export default function Atajos({ id }: { id: string }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const dispositivo = useDispositivo();
  const celular = dispositivo === "celular";
  const ctrl = teclaCtrl(dispositivo);
  const NECESARIOS = necesarios(dispositivo);
  const sistema = DEL_SISTEMA[dispositivo];
  const [fallo, setFallo] = useState<string | null>(null);
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
    if (celular || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
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
    celular
      ? { n: 1 as const, titulo: "1 · ¿Qué hace?", hechos: cuenta(QUIZ.map((q) => q.id)), total: QUIZ.length }
      : { n: 1 as const, titulo: "1 · Pruébalos", hechos: cuenta(DETECTABLES.map((d) => d.id)), total: DETECTABLES.length },
    { n: 2 as const, titulo: "2 · Úsalos", hechos: cuenta(celular ? TAREAS_CELULAR : TAREAS), total: (celular ? TAREAS_CELULAR : TAREAS).length },
    { n: 3 as const, titulo: celular ? "3 · Gestos del celular" : `3 · Los de ${NOMBRE_SISTEMA[dispositivo]}`, hechos: cuenta(sistema.map((c) => c.id)), total: sistema.length },
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

      {parte === 1 && celular && (
        <>
          <p className="text-slate-700">
            En el celular no hay tecla Ctrl, pero en el trabajo vas a usar computador. Toca qué hace cada atajo. Si tienes un computador cerca, pruébalos allá también.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {QUIZ.map((q) => {
              const hecho = hechos.has(q.id);
              return (
                <div key={q.id} className={`rounded-2xl border-2 px-3 py-3 ${hecho ? "border-emerald-400 bg-emerald-50" : "border-blue-200 bg-white"}`}>
                  <kbd className="font-mono text-lg font-bold text-blue-950">Ctrl + {q.letra}</kbd>
                  {hecho ? (
                    <p className="text-sm font-semibold text-emerald-800">✓ {q.correcta}</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.opciones.map((o) => (
                        <button
                          key={o}
                          onClick={() => {
                            if (o === q.correcta) {
                              setFallo(null);
                              marcar([q.id]);
                            } else setFallo(`${q.id}:${o}`);
                          }}
                          className={`min-h-10 rounded-full px-3 text-sm font-semibold ${
                            fallo === `${q.id}:${o}` ? "bg-rose-100 text-rose-800" : "bg-blue-50 text-blue-900 active:bg-blue-100"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {fallo?.startsWith(`${q.id}:`) && !hecho && <p className="mt-1 text-xs text-rose-700">Esa no. Pista: piensa en la letra {q.letra}.</p>}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">En Mac se usa ⌘ (Cmd) en vez de Ctrl: ⌘ + C, ⌘ + V…</p>
        </>
      )}

      {parte === 1 && !celular && (
        <>
          <p className="text-slate-700">
            Mantén apretada <b>{ctrl === "⌘" ? "⌘ (Cmd)" : "Ctrl"}</b> y toca la letra. Cada atajo que presiones se pone en verde.
          </p>
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
                  <kbd className="font-mono text-lg font-bold text-blue-950">{d.teclas.replace("Ctrl", ctrl)}</kbd>
                  <div className={`text-sm ${hecho ? "text-emerald-800" : "text-slate-600"}`}>
                    {hecho ? "✓ " : ""}
                    {d.accion}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">
            {ctrl === "⌘" ? "En Windows y Chromebook sería Ctrl en vez de ⌘." : "En un Mac sería ⌘ en vez de Ctrl."} Aquí bloqueamos Guardar, Buscar e Imprimir para que no se abran ventanas del navegador.
          </p>
        </>
      )}

      {parte === 2 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {celular && (
            <p className="text-slate-700 lg:col-span-2">
              En el celular se hace lo mismo con el dedo: <b>mantén presionado</b> el texto para seleccionarlo y aparece el menú con Copiar, Cortar, Pegar y Seleccionar todo.
            </p>
          )}
          <TareaCopiar ctrl={ctrl} celular={celular} hecho={hechos.has("t-copiar")} onListo={() => marcar(["t-copiar"])} />
          <TareaBorrar ctrl={ctrl} celular={celular} hecho={hechos.has("t-borrar")} onListo={() => marcar(["t-borrar"])} />
          <TareaCortar ctrl={ctrl} celular={celular} hecho={hechos.has("t-cortar")} onListo={() => marcar(["t-cortar"])} />
          {!celular && <TareaDeshacer ctrl={ctrl} hecho={hechos.has("t-deshacer")} onListo={() => marcar(["t-deshacer"])} />}
        </div>
      )}

      {parte === 3 && (
        <>
          <p className="text-slate-700">
            {celular
              ? "Lo que en el computador se hace con atajos, en el celular se hace con gestos y botones. Pruébalos y márcalos tú."
              : `Estos son del sistema operativo (${NOMBRE_SISTEMA[dispositivo]}): en otros computadores cambian. El navegador no los puede detectar, así que pruébalos y márcalos tú.`}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sistema.map((c) => {
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
          ¡Muy bien! Ya dominas los atajos esenciales. {cuenta(sistema.map((c) => c.id)) < sistema.length ? `Te faltan algunos ${celular ? "gestos del celular" : `de ${NOMBRE_SISTEMA[dispositivo]}`} (parte 3).` : ""}
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

const claseCaja = "w-full resize-none rounded-xl border-2 border-blue-200 bg-white px-3 py-2 text-base outline-none focus:border-blue-600";

type PropsTarea = { hecho: boolean; onListo: () => void; ctrl: string; celular?: boolean };

function TareaCopiar({ hecho, onListo, ctrl, celular }: PropsTarea) {
  return (
    <Tarea
      titulo="Copiar y pegar"
      instrucciones={
        celular
          ? "Mantén presionada la frase gris, arrastra los tiradores para tomarla toda y toca Copiar. Luego mantén presionada la caja y toca Pegar."
          : `Selecciona la frase gris, cópiala con ${ctrl} + C y pégala en la caja con ${ctrl} + V.`
      }
      hecho={hecho}
    >
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

function TareaBorrar({ hecho, onListo, ctrl, celular }: PropsTarea) {
  return (
    <Tarea
      titulo="Seleccionar todo y borrar"
      instrucciones={
        celular
          ? "Mantén presionado el texto de la caja, toca Seleccionar todo, bórralo con ⌫ y escribe: listo"
          : `Haz clic en la caja, ${ctrl} + A para seleccionar todo, Retroceso para borrar, y escribe: listo`
      }
      hecho={hecho}
    >
      <textarea
        rows={3}
        className={claseCaja}
        defaultValue="sdkfj wqoeiru zmxncb laksjd qpwoeiru alskdj zmxnc qwe rty uio asd fgh jkl zxc vbn qwerty asdfgh zxcvbn"
        onInput={(e) => e.currentTarget.value.trim().toLowerCase() === "listo" && onListo()}
      />
    </Tarea>
  );
}

function TareaCortar({ hecho, onListo, ctrl, celular }: PropsTarea) {
  return (
    <Tarea
      titulo="Cortar y pegar"
      instrucciones={
        celular
          ? "Ordena la lista para que quede «guantes, tapabocas, bata»: mantén presionado «guantes», toca Cortar, pon el cursor al inicio y toca Pegar."
          : `Ordena la lista para que quede «guantes, tapabocas, bata»: selecciona «guantes», córtalo con ${ctrl} + X y pégalo al inicio con ${ctrl} + V.`
      }
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

function TareaDeshacer({ hecho, onListo, ctrl }: PropsTarea) {
  const vacio = useRef(false);
  return (
    <Tarea titulo="Deshacer" instrucciones={`Borra todo el texto (${ctrl} + A y Retroceso). ¡Uy! Ahora recupéralo con ${ctrl} + Z.`} hecho={hecho}>
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
