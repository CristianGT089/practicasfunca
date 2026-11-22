"use client";

import type { Diapositiva as TipoDiapositiva, Tarjeta } from "@/lib/clase/tipos";
import Arbol from "./Arbol";
import Atajos from "./actividades/Atajos";
import Checklist from "./actividades/Checklist";
import Celdas from "./actividades/Celdas";
import Clasificar from "./actividades/Clasificar";
import Condicional from "./actividades/Condicional";
import Dinamica from "./actividades/Dinamica";
import Formulas from "./actividades/Formulas";
import Grafico from "./actividades/Grafico";
import Interfaz from "./actividades/Interfaz";
import OrdenarFiltrar from "./actividades/OrdenarFiltrar";
import Mecanografia from "./actividades/Mecanografia";
import Pregunta from "./Pregunta";
import Terminar from "./Terminar";
import Visuales from "./Visuales";

/** Pinta una diapositiva de la lección. La misma para el proyector y para el estudiante. */
export default function Diapositiva({ d, origen, sesionPresentador }: { d: TipoDiapositiva; origen?: string; sesionPresentador?: string }) {
  switch (d.tipo) {
    case "portada":
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="eyebrow">FUNCA · TICs</span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-blue-900 sm:text-6xl">{d.titulo}</h1>
          {d.subtitulo && <p className="mt-4 text-xl text-blue-700 sm:text-2xl">{d.subtitulo}</p>}
          {d.mostrarAcceso && origen && (
            <div className="mt-8 rounded-3xl bg-blue-900 px-8 py-5 text-white">
              <p className="text-sm text-blue-200">Entra desde tu Chromebook a</p>
              <p className="font-mono text-2xl font-bold text-gold-400 sm:text-3xl">{origen.replace(/^https?:\/\//, "")}</p>
              <p className="text-sm text-blue-200">con el usuario y la contraseña que te doy</p>
            </div>
          )}
          {d.pie && <p className="mt-8 text-lg font-semibold text-blue-800">{d.pie}</p>}
        </div>
      );

    case "seccion":
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          {d.icono && <div className="text-7xl sm:text-8xl" aria-hidden>{d.icono}</div>}
          <span className="mt-6 font-heading text-lg font-bold uppercase tracking-[0.25em] text-gold-600">Bloque {d.numero}</span>
          <h2 className="mt-2 font-heading text-4xl font-extrabold tracking-tight text-blue-900 sm:text-6xl">{d.titulo}</h2>
          {d.subtitulo && <p className="mt-4 text-xl text-blue-700">{d.subtitulo}</p>}
        </div>
      );

    case "agenda":
      return (
        <div>
          <Titulo titulo={d.titulo} />
          <ol className={`mt-5 grid gap-2 sm:grid-cols-2 ${d.bloques.length > 10 ? "lg:grid-cols-3" : ""}`}>
            {d.bloques.map((b, i) => (
              <li
                key={i}
                className={`flex items-center gap-4 rounded-2xl px-4 py-2.5 ${
                  b.pausa ? "bg-gold-50 border-2 border-dashed border-gold-500/60" : b.externo ? "bg-blue-900 text-white" : "tarjeta-sm"
                }`}
              >
                <span className={`min-w-14 shrink-0 whitespace-nowrap font-heading text-lg font-bold ${b.externo ? "text-gold-400" : "text-blue-800"}`}>{b.hora}</span>
                <span className="text-2xl" aria-hidden>{b.icono}</span>
                <span className={`font-semibold ${b.externo ? "" : "text-blue-950"}`}>{b.tema}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "contenido":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} intro={d.intro} />
          {d.tarjetas && <Rejilla tarjetas={d.tarjetas} columnas={d.columnas ?? 2} />}
          {d.cierre && <Cierre texto={d.cierre} />}
        </div>
      );

    case "perfil":
      return (
        <div>
          <span className="eyebrow">{d.eyebrow}</span>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 p-7 text-white">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gold-500 font-heading text-3xl font-extrabold text-blue-900">
                {d.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <h2 className="mt-5 font-heading text-4xl font-extrabold">{d.nombre}</h2>
              <p className="mt-1 font-semibold text-gold-400">{d.cargo}</p>
              <p className="mt-4 text-lg leading-relaxed text-blue-100">{d.resumen}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {d.datos.map((x) => (
                <div key={x.titulo} className="tarjeta p-5">
                  <div className="text-3xl" aria-hidden>{x.icono}</div>
                  <p className="mt-2 font-heading font-bold text-blue-900">{x.titulo}</p>
                  <p className="mt-1 text-slate-700">{x.texto}</p>
                </div>
              ))}
            </div>
          </div>
          {d.frase && <Cierre texto={d.frase} />}
        </div>
      );

    case "porcentajes":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} />
          <div className="mt-6 flex h-5 overflow-hidden rounded-full" aria-hidden>
            {d.partes.map((p, i) => (
              <div key={p.nombre} style={{ width: `${p.valor}%` }} className={["bg-gold-500", "bg-blue-600", "bg-blue-900"][i % 3]} />
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {d.partes.map((p, i) => (
              <div key={p.nombre} className="tarjeta p-6">
                <div className={`font-heading text-6xl font-extrabold ${["text-gold-600", "text-blue-600", "text-blue-900"][i % 3]}`}>{p.valor}%</div>
                <p className="mt-1 font-heading text-2xl font-bold text-blue-950">{p.nombre}</p>
                <p className="mt-2 text-slate-700">{p.texto}</p>
                {p.desglose && (
                  <div className="mt-4 space-y-2 rounded-2xl bg-blue-50 p-3">
                    {p.desglose.map((x) => (
                      <div key={x.nombre}>
                        <div className="flex justify-between text-sm font-semibold text-blue-900">
                          <span>{x.nombre}</span>
                          <span>{x.valor}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div className="h-full rounded-full bg-blue-800" style={{ width: `${x.valor}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {d.notas_pie && (
            <ul className="mt-5 space-y-1.5">
              {d.notas_pie.map((n) => (
                <li key={n} className="flex gap-2 text-slate-700">
                  <span className="text-gold-600">●</span>
                  {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "visual":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} intro={d.intro} />
          <Visuales visual={d.visual} />
          {d.cierre && <Cierre texto={d.cierre} />}
        </div>
      );

    case "flujo":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} intro={d.intro} />
          <div className="mt-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {d.pasos.map((p, i) => (
              <div key={p.titulo} className="contents">
                {i > 0 && <span className="self-center text-3xl text-gold-500 md:rotate-0 rotate-90" aria-hidden>➜</span>}
                <TarjetaVista t={p} grande />
              </div>
            ))}
          </div>
          {d.extra && (
            <div className="mt-4 md:mx-auto md:w-1/2">
              <TarjetaVista t={d.extra} />
            </div>
          )}
        </div>
      );

    case "tabla":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} intro={d.intro} />
          <div className="mt-4 overflow-x-auto rounded-2xl border border-blue-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-blue-900 text-white">
                <tr>
                  {d.columnas.map((c, i) => (
                    <th key={i} className="px-4 py-2.5 font-heading font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.filas.map((f, i) => (
                  <tr key={i} className="border-t border-blue-100 even:bg-blue-50/60">
                    {f.map((c, j) => (
                      <td key={j} className={`px-4 py-2 text-base ${j === 0 || (d.columnas.length === 4 && j === 2 && d.columnas[0] === "Atajo") ? "font-mono font-bold text-blue-900" : "text-slate-800"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.cierre && <Cierre texto={d.cierre} />}
        </div>
      );

    case "arbol":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} intro={d.intro} />
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="tarjeta p-6 text-lg">
              <Arbol nodo={d.raiz} />
            </div>
            {d.lado && (
              <div className="flex flex-col gap-3">
                {d.lado.map((t) => (
                  <TarjetaVista key={t.titulo} t={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      );

    case "externo":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} />
          <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-3xl bg-blue-900 p-6 text-center text-white">
              <span className="text-sm text-blue-200">Se hace en</span>
              <span className="font-heading text-5xl font-extrabold text-gold-400">{d.plataforma}</span>
              <span className="mt-3 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">⏱ {d.duracion}</span>
            </div>
            <ol className="tarjeta flex flex-col gap-3 p-6">
              {d.pasos.map((p, i) => (
                <li key={i} className="flex gap-3 text-lg text-slate-800">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 font-heading font-bold text-blue-800">{i + 1}</span>
                  {p}
                </li>
              ))}
              {d.enlace && (
                <a href={d.enlace.href} target="_blank" rel="noopener noreferrer" className="btn-cta mt-2 self-start">
                  {d.enlace.texto} ↗
                </a>
              )}
            </ol>
          </div>
          {d.aviso && <Cierre texto={d.aviso} />}
        </div>
      );

    case "actividad":
      return (
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900">
                ✋ Actividad · a tu ritmo
              </span>
              <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-blue-900">{d.titulo}</h2>
              {d.intro && <p className="mt-1 text-slate-700">{d.intro}</p>}
            </div>
          </div>
          {d.actividad === "clasificar" && <Clasificar id={d.id} categorias={d.categorias} items={d.items} />}
          {d.actividad === "checklist" && <Checklist id={d.id} pasos={d.pasos} enlace={d.enlace} archivos={d.archivos} arbol={d.arbol} />}
          {d.actividad === "atajos" && <Atajos id={d.id} />}
          {d.actividad === "mecanografia" && <Mecanografia id={d.id} />}
          {d.actividad === "interfaz" && <Interfaz id={d.id} app={d.app} retos={d.retos} />}
          {d.actividad === "celdas" && <Celdas id={d.id} retos={d.retos} datos={d.datos} columnas={d.columnas} filas={d.filas} />}
          {d.actividad === "ordenar" && <OrdenarFiltrar id={d.id} datos={d.datos} retos={d.retos} />}
          {d.actividad === "condicional" && <Condicional id={d.id} datos={d.datos} retos={d.retos} />}
          {d.actividad === "formulas" && <Formulas id={d.id} datos={d.datos} retos={d.retos} />}
          {d.actividad === "grafico" && <Grafico id={d.id} datos={d.datos} retos={d.retos} />}
          {d.actividad === "dinamica" && <Dinamica id={d.id} datos={d.datos} retos={d.retos} />}
        </div>
      );

    case "video":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} />
          <div className="mt-4 grid gap-4 rounded-3xl bg-blue-950 p-5 text-white lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4 lg:border-r lg:border-white/15 lg:pr-6">
              {d.ficha.map((f) => (
                <div key={f.etiqueta}>
                  <dt className="text-xs uppercase tracking-wider text-blue-300">{f.etiqueta}</dt>
                  <dd className="whitespace-nowrap font-semibold">{f.valor}</dd>
                </div>
              ))}
            </dl>
            <p className="leading-relaxed text-blue-100">{d.sinopsis}</p>
          </div>
          <p className="mt-4 font-heading font-bold text-blue-900">Mientras la ven, fíjense en…</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {d.observar.map((t) => (
              <TarjetaVista key={t.titulo} t={t} />
            ))}
          </div>
          {d.aviso && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">
              <b>Aviso:</b> {d.aviso}
            </p>
          )}
        </div>
      );

    case "tarea":
      return (
        <div>
          <Titulo eyebrow={d.eyebrow} titulo={d.titulo} />
          <p className="mt-3 inline-flex rounded-full bg-gold-500 px-4 py-1.5 font-heading font-bold text-blue-900">📅 Entrega: {d.entrega}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="tarjeta p-5">
              <p className="text-slate-700">{d.intro}</p>
              <ol className="mt-3 flex flex-col gap-2">
                {d.preguntas.map((p, i) => (
                  <li key={i} className="flex gap-3 text-base text-slate-900">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-800 font-heading font-bold text-white">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-3xl bg-blue-50 p-5">
              <p className="font-heading font-bold text-blue-900">Formato</p>
              <ul className="mt-2 flex flex-col gap-2">
                {d.formato.map((f) => (
                  <li key={f} className="flex gap-2 text-slate-800">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );

    case "pregunta":
      return (
        <Pregunta
          id={d.id}
          pregunta={d.pregunta}
          opciones={d.opciones}
          correcta={d.correcta}
          explicacion={d.explicacion}
          sesionPresentador={sesionPresentador}
        />
      );

    case "repaso":
      return (
        <div>
          <Titulo titulo={d.titulo} />
          <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${d.preguntas.length > 4 ? "lg:grid-cols-3" : ""}`}>
            {d.preguntas.map((p) => (
              <div key={p.tema} className="tarjeta p-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>{p.icono}</span>
                  <span className="font-heading text-xl font-bold text-blue-900">{p.tema}</span>
                </div>
                <p className="mt-2 text-lg text-slate-800">{p.pregunta}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "gracias":
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <h2 className="font-heading text-6xl font-extrabold text-blue-900 sm:text-7xl">{d.titulo}</h2>
          {d.proxima && <p className="mt-6 text-2xl text-blue-700">{d.proxima}</p>}
        </div>
      );

    case "terminar":
      return <Terminar titulo={d.titulo} proxima={d.proxima} />;
  }
}

function Titulo({ eyebrow, titulo, intro }: { eyebrow?: string; titulo: string; intro?: string }) {
  return (
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-blue-900 sm:text-4xl">{titulo}</h2>
      {intro && <p className="mt-3 max-w-4xl text-lg text-slate-700 sm:text-xl">{intro}</p>}
    </div>
  );
}

function Cierre({ texto }: { texto: string }) {
  return <p className="mt-5 border-l-4 border-gold-500 pl-4 text-lg font-semibold text-blue-800">{texto}</p>;
}

const COLUMNAS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

function Rejilla({ tarjetas, columnas, compacta }: { tarjetas: Tarjeta[]; columnas: 1 | 2 | 3 | 4; compacta?: boolean }) {
  // Dos columnas con 4 o 6 tarjetas quedan muy altas: en pantallas anchas se reparten en 4 o 3.
  const n = tarjetas.length;
  const ancho = !compacta && columnas === 2 && n >= 4 ? (n % 3 === 0 ? "lg:grid-cols-3" : n % 4 === 0 ? "lg:grid-cols-4" : "") : "";
  return (
    <div className={`${compacta ? "" : "mt-5"} grid gap-3 ${COLUMNAS[columnas]} ${ancho}`}>
      {tarjetas.map((t) => (
        <TarjetaVista key={t.titulo} t={t} />
      ))}
    </div>
  );
}

function TarjetaVista({ t, grande }: { t: Tarjeta; grande?: boolean }) {
  const fondo =
    t.color === "amarilla" ? "bg-gold-50 border-2 border-gold-500/50 rounded-3xl" : t.color === "navy" ? "bg-blue-900 text-white rounded-3xl" : "tarjeta";
  return (
    <div className={`${fondo} flex-1 p-4 ${grande ? "text-center" : ""}`}>
      {t.icono && <div className={grande ? "text-5xl" : "text-3xl"} aria-hidden>{t.icono}</div>}
      <p className={`mt-2 font-heading font-bold ${grande ? "text-2xl" : "text-lg"} ${t.color === "navy" ? "text-white" : "text-blue-900"}`}>{t.titulo}</p>
      {t.texto && <p className={`mt-1 ${t.color === "navy" ? "text-blue-100" : "text-slate-700"}`}>{t.texto}</p>}
      {t.items && (
        <ul className="mt-2 space-y-1">
          {t.items.map((i) => (
            <li key={i} className="flex gap-2 text-slate-800">
              <span className="text-gold-600">•</span>
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
