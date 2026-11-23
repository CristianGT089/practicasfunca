"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type TouchEvent } from "react";
import type { Leccion } from "@/lib/clase/tipos";
import Image from "next/image";
import { adaptarAtajos, DISPOSITIVOS, elegirDispositivo, useDispositivo } from "@/lib/clase/dispositivo";
import Diapositiva from "./Diapositiva";

/** Escala según el ancho: 1 hasta 1600 px y crece en monitores grandes y proyectores (máx. 2). */
const zoomPorAncho = (ancho: number) => (ancho < 1600 ? 1 : Math.min(2, ancho / 1390));
/** Por debajo de esto ya no se encoge: se lee mal. Si aun así no cabe, se hace scroll. */
const ZOOM_MINIMO = 0.6;
/** Por debajo de este ancho (celulares) las diapositivas no se encogen: zoom 1 y scroll natural. */
const ANCHO_CELULAR = 640;

export function tituloDiapositiva(d: Leccion["diapositivas"][number]) {
  if (d.tipo === "pregunta") return `💭 ${d.pregunta}`;
  return "titulo" in d && d.titulo ? d.titulo : d.tipo;
}

/** Si una consulta de medios se cumple (p. ej. pantalla estrecha o pantalla táctil). */
function useMedio(consulta: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(consulta);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(consulta).matches,
    () => false
  );
}

// El aviso «Estás en el celular» sale una sola vez por navegador.
const AVISO_CELULAR = "clase-aviso-celular";
function suscribirAviso(cb: () => void) {
  window.addEventListener(AVISO_CELULAR, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(AVISO_CELULAR, cb);
    window.removeEventListener("storage", cb);
  };
}
function avisoVisto() {
  try {
    return localStorage.getItem(AVISO_CELULAR) === "1";
  } catch {
    return true;
  }
}
function descartarAviso() {
  try {
    localStorage.setItem(AVISO_CELULAR, "1");
  } catch {}
  window.dispatchEvent(new Event(AVISO_CELULAR));
}

/** ¿El elemento recibe texto? (abre el teclado en pantalla del celular). */
function esCajaDeTexto(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t.tagName === "TEXTAREA") return true;
  return t.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes((t as HTMLInputElement).type);
}

/**
 * ¿El toque empezó en algo que se desplaza de lado (una tabla ancha) o en un control? Ahí el
 * deslizamiento es del contenido, no para cambiar de diapositiva.
 */
function tocaAlgoDesplazable(el: Element | null, tope: Element | null) {
  for (let n = el; n && n !== tope; n = n.parentElement) {
    if (n.matches("input, textarea, select, [contenteditable], [data-sin-deslizar]")) return true;
    if (n.scrollWidth > n.clientWidth + 1) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
  }
  return false;
}

/** Ícono de salir (puerta con flecha). */
function IconoSalir() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/** «Salir» de la barra superior: en el celular, solo el ícono. */
export function BotonSalir({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Salir de la clase"
      className="inline-flex min-h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-blue-100 hover:bg-white/10 sm:px-2.5 pointer-coarse:min-h-10 pointer-coarse:min-w-10"
    >
      <IconoSalir />
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}

/**
 * Marco común del presentador y del estudiante: barra superior, la diapositiva y la barra de
 * navegación. Las flechas del teclado (y los punteros de presentación, que mandan RePág/AvPág)
 * pasan de diapositiva, salvo cuando se está escribiendo en una caja de texto. En el celular
 * también se pasa deslizando de lado (solo en las presentaciones, no en las actividades).
 */
export default function Visor({
  leccion,
  indice: indicePedido,
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
  /** Por qué no se puede pasar del límite (aparece en el pie, junto a «Siguiente»). */
  motivoLimite?: string;
}) {
  const total = leccion.diapositivas.length;
  const ultima = limite == null ? total - 1 : Math.min(limite, total - 1);
  // Una posición guardada puede quedar fuera si la lección cambió de tamaño: se acota.
  const indice = Math.min(Math.max(indicePedido, 0), total - 1);
  const d = leccion.diapositivas[indice];
  const [menu, setMenu] = useState<"indice" | "equipo" | null>(null);
  const origen = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
  const dispositivo = useDispositivo();
  const equipo = DISPOSITIVOS.find((x) => x.id === dispositivo) ?? DISPOSITIVOS[0];
  const estudiante = !sesionPresentador;
  const visto = useSyncExternalStore(suscribirAviso, avisoVisto, () => true);
  const estrecho = useMedio(`(max-width: ${ANCHO_CELULAR - 0.02}px)`);
  const tactil = useMedio("(pointer: coarse)");

  // Cada diapositiva se ajusta a la pantalla: las de presentación se encogen hasta caber sin
  // scroll; las actividades (juegos), las preguntas y el cierre de la clase a tu ritmo solo
  // escalan con el ancho y se recorren con scroll. En el celular nada se encoge (el texto
  // quedaría diminuto): zoom 1 y scroll natural.
  const area = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const esActividad = d.tipo === "actividad";
  const seEncoge = !esActividad && d.tipo !== "pregunta" && d.tipo !== "terminar";
  useLayoutEffect(() => {
    const main = area.current;
    const el = lienzo.current;
    if (!main || !el) return;
    // Síncrono (sin requestAnimationFrame, que el navegador pausa en pestañas de fondo).
    let ajustando = false;
    const ajustar = () => {
      if (ajustando) return;
      ajustando = true;
      const base = zoomPorAncho(window.innerWidth) * zoom;
      el.style.zoom = String(base);
      if (seEncoge && window.innerWidth >= ANCHO_CELULAR) {
        const estilo = getComputedStyle(main);
        const disponible = main.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
        let z = base;
        // Al encoger cambia el ancho útil y el texto se reacomoda: se ajusta en pocos pasos.
        for (let i = 0; i < 5; i++) {
          const alto = el.getBoundingClientRect().height;
          if (alto <= disponible + 1 || z <= ZOOM_MINIMO) break;
          z = Math.max(ZOOM_MINIMO, z * (disponible / alto) * 0.985);
          el.style.zoom = String(z);
        }
      }
      // Los cambios de zoom disparan el observador: se ignoran hasta el siguiente cambio real.
      queueMicrotask(() => setTimeout(() => (ajustando = false), 0));
    };
    ajustar();
    const obs = new ResizeObserver(() => ajustar());
    obs.observe(main);
    if (el.firstElementChild) obs.observe(el.firstElementChild);
    // Las imágenes y fuentes que cargan tarde cambian el alto.
    document.fonts?.ready.then(() => ajustar());
    return () => obs.disconnect();
  }, [indice, zoom, seEncoge, modo]);

  // En las simulaciones, la hoja (`.hoja-scroll`) mide lo que queda libre bajo el bloque fijo del
  // reto: así, aunque la página baje del todo, las letras y la fila 1 inmovilizadas siguen a la vista.
  useLayoutEffect(() => {
    const main = area.current;
    const el = lienzo.current;
    if (!esActividad || !main || !el) return;
    const medir = () => {
      const bloque = el.querySelector<HTMLElement>(".sticky");
      const z = parseFloat(el.style.zoom || "1") || 1;
      const estilo = getComputedStyle(main);
      const disponible = main.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
      const alto = bloque ? bloque.getBoundingClientRect().height : 0;
      el.style.setProperty("--alto-hoja", `${Math.max(160, (disponible - alto - 12) / z)}px`);
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(main);
    const bloque = el.querySelector<HTMLElement>(".sticky");
    if (bloque) obs.observe(bloque);
    if (el.firstElementChild) obs.observe(el.firstElementChild);
    return () => obs.disconnect();
  }, [indice, zoom, esActividad]);

  // Al cambiar de diapositiva se vuelve arriba y se cierran los menús.
  useEffect(() => {
    area.current?.scrollTo({ top: 0 });
  }, [indice]);
  const [indiceMenu, setIndiceMenu] = useState(indice);
  if (indiceMenu !== indice) {
    setIndiceMenu(indice);
    setMenu(null);
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") return setMenu(null);
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

  // Con el teclado en pantalla abierto (celular o tableta) se oculta el pie: gana espacio.
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    const entra = (e: FocusEvent) => esCajaDeTexto(e.target) && setEscribiendo(true);
    const sale = (e: FocusEvent) => !esCajaDeTexto(e.relatedTarget) && setEscribiendo(false);
    document.addEventListener("focusin", entra);
    document.addEventListener("focusout", sale);
    return () => {
      document.removeEventListener("focusin", entra);
      document.removeEventListener("focusout", sale);
    };
  }, []);
  const sinPie = escribiendo && (estrecho || tactil);

  // Deslizar de lado pasa de diapositiva (solo presentaciones; no en tablas que se desplazan).
  const toque = useRef<{ x: number; y: number; t: number } | null>(null);
  function alTocar(e: TouchEvent) {
    toque.current = null;
    if (esActividad || e.touches.length !== 1) return;
    const t = e.touches[0];
    // Los bordes de la pantalla son del navegador (gesto de «atrás»).
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    if (tocaAlgoDesplazable(e.target as Element, area.current)) return;
    toque.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function alSoltar(e: TouchEvent) {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Date.now() - inicio.t > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (window.getSelection()?.toString()) return;
    if (dx < 0 && indice < ultima) onIr(indice + 1);
    else if (dx > 0 && indice > 0) onIr(indice - 1);
  }

  // Índice agrupado por sección.
  const secciones: { nombre: string; items: { i: number; titulo: string }[] }[] = [];
  leccion.diapositivas.forEach((x, i) => {
    const nombre = x.seccion ?? "";
    const ultima = secciones[secciones.length - 1];
    if (!ultima || ultima.nombre !== nombre) secciones.push({ nombre, items: [] });
    secciones[secciones.length - 1].items.push({ i, titulo: tituloDiapositiva(x) });
  });

  const bloqueado = indice >= ultima && ultima < total - 1;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)]">
      <header className="relative z-30 flex shrink-0 items-center gap-2 bg-blue-900 px-3 py-1.5 text-white sm:gap-3 sm:px-4 sm:py-2">
        <Image
          src="/funca-logo-blanco.png"
          alt="FUNCA"
          width={800}
          height={157}
          priority
          className="h-5 w-auto shrink-0 sm:h-7"
        />
        <span className="hidden h-6 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate font-heading text-sm font-bold text-white">{leccion.titulo}</span>
          <span className="block text-[11px] text-gold-400">{modo === "ritmo" ? "Clase a tu ritmo" : "Clase en vivo"}</span>
        </span>
        <span className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          {estudiante && (
            <span className="sm:relative">
              <button
                onClick={() => setMenu((m) => (m === "equipo" ? null : "equipo"))}
                aria-expanded={menu === "equipo"}
                aria-label={`Entras desde: ${equipo.nombre}. Cambiar`}
                className={`inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-full px-1.5 py-1 text-xs font-semibold text-blue-100 hover:bg-white/10 pointer-coarse:min-h-10 pointer-coarse:min-w-10 ${
                  menu === "equipo" ? "bg-white/15" : ""
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {equipo.icono}
                </span>
                <span className="hidden lg:inline">{equipo.nombre}</span>
              </button>
              {menu === "equipo" && (
                <div className="absolute inset-x-2 top-full z-40 mt-1 rounded-2xl border border-blue-200 bg-white p-2 text-slate-800 shadow-xl sm:left-auto sm:right-0 sm:w-64">
                  <p className="px-2 pb-1 pt-1 font-heading text-sm font-bold text-blue-900">¿Desde dónde entras?</p>
                  <p className="px-2 pb-2 text-xs text-slate-500">Así te mostramos los atajos y las instrucciones de tu equipo.</p>
                  {DISPOSITIVOS.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => {
                        elegirDispositivo(x.id);
                        setMenu(null);
                      }}
                      aria-pressed={x.id === dispositivo}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm pointer-coarse:min-h-11 ${
                        x.id === dispositivo ? "bg-blue-800 font-semibold text-white" : "hover:bg-blue-50"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        {x.icono}
                      </span>
                      {x.nombre}
                      {x.id === dispositivo && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      elegirDispositivo(null);
                      setMenu(null);
                    }}
                    className="mt-1 w-full rounded-xl border-t border-blue-100 px-2 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50 pointer-coarse:min-h-11"
                  >
                    🔄 Detectar solo
                  </button>
                </div>
              )}
            </span>
          )}
          {arriba}
        </span>
      </header>
      <div className="h-1 shrink-0 bg-blue-100">
        <div className="h-full bg-gold-500 transition-all" style={{ width: `${((indice + 1) / total) * 100}%` }} />
      </div>
      <div className="shrink-0">{aviso}</div>
      {estudiante && dispositivo === "celular" && !visto && (
        <div className="flex shrink-0 items-center gap-2 bg-blue-50 px-3 py-1.5 text-sm text-blue-950 sm:justify-center sm:px-4">
          <span aria-hidden>📱</span>
          <span className="min-w-0 flex-1 sm:flex-none">Estás en el celular: las actividades se adaptan; las que necesitan teclado te lo dirán.</span>
          <button onClick={descartarAviso} className="shrink-0 rounded-full bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white pointer-coarse:min-h-10">
            Entendido
          </button>
        </div>
      )}

      {/* El área de la diapositiva es la que hace scroll (si hace falta); arriba y abajo quedan fijos. */}
      <main
        ref={area}
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        onTouchCancel={() => (toque.current = null)}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8 ${esActividad ? "py-4" : "py-5 [@media(max-height:720px)]:py-3"}`}
      >
        <div ref={lienzo} className={`mx-auto w-full max-w-6xl max-sm:break-words ${esActividad ? "" : "my-auto"}`}>
          <div>
            {d.seccion && d.tipo !== "seccion" && d.tipo !== "portada" && (
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-500">{d.seccion}</p>
            )}
            {modo === "ritmo" && d.guia && (
              <div className="mb-4 flex gap-3 rounded-3xl border-2 border-gold-500/50 bg-gold-50 px-4 py-2.5 sm:px-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-900 text-lg" aria-hidden>
                  🧑‍🏫
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold-700">El profe te explica</p>
                  <p className="mt-0.5 text-base text-blue-950">{adaptarAtajos(d.guia, dispositivo)}</p>
                </div>
              </div>
            )}
            <Diapositiva key={indice} d={d} origen={modo === "ritmo" ? undefined : origen} sesionPresentador={sesionPresentador} />
          </div>
        </div>
      </main>

      {/* Un toque fuera de un menú abierto lo cierra. */}
      {menu && <button className="fixed inset-0 z-20 cursor-default" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMenu(null)} />}

      <footer className={`relative z-30 shrink-0 border-t border-blue-200 bg-white/95 px-3 py-1.5 backdrop-blur sm:px-4 ${sinPie ? "hidden" : ""}`}>
        <div className="lienzo-clase mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1">
          <button onClick={() => onIr(indice - 1)} disabled={indice === 0} className="btn-suave max-[399px]:!px-4" aria-label="Diapositiva anterior">
            ← <span className="hidden min-[400px]:inline">Anterior</span>
          </button>
          <div className="sm:relative">
            <button
              onClick={() => setMenu((m) => (m === "indice" ? null : "indice"))}
              className="rounded-full px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 pointer-coarse:min-h-10"
              aria-expanded={menu === "indice"}
              aria-label={`Diapositiva ${indice + 1} de ${total}. Ver el índice`}
            >
              {indice + 1} / {total} ▾
            </button>
            {menu === "indice" && (
              <div className="absolute inset-x-2 bottom-full z-40 mb-2 max-h-[65dvh] overflow-y-auto rounded-2xl border border-blue-200 bg-white p-2 shadow-xl sm:inset-x-auto sm:bottom-12 sm:left-0 sm:mb-0 sm:max-h-[60vh] sm:w-80">
                {secciones.filter((s) => s.items[0].i <= ultima).map((s) => (
                  <div key={s.nombre + s.items[0].i} className="mb-1">
                    {s.nombre && <p className="px-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-blue-500">{s.nombre}</p>}
                    {s.items.filter((it) => it.i <= ultima).map((it) => (
                      <button
                        key={it.i}
                        onClick={() => {
                          onIr(it.i);
                          setMenu(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm pointer-coarse:min-h-10 ${
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
          <button onClick={() => onIr(indice + 1)} disabled={indice >= ultima} className="btn-primario" aria-label="Diapositiva siguiente">
            Siguiente →
          </button>
          {bloqueado && (
            <p className="order-last basis-full text-xs font-semibold text-blue-700 sm:order-none sm:basis-auto sm:text-sm">🔒 {motivoLimite}</p>
          )}
          {abajo && <div className="ml-auto flex flex-wrap items-center gap-2">{abajo}</div>}
        </div>
      </footer>
    </div>
  );
}
