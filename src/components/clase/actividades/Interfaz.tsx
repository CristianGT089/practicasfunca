"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { RetoInterfaz } from "@/lib/clase/tipos";
import { useProgreso } from "../progreso";

type Datos = { hechos: number[]; fallos: number };

/** Nombre de cada parte de las ventanas simuladas: se le muestra al estudiante cuando la toca. */
export const ZONAS: Record<string, string> = {
  logo: "el ícono de la app: te lleva a la lista de tus archivos",
  nombre: "el nombre del archivo: haz clic para cambiarlo",
  estrella: "la estrella: destaca el archivo para encontrarlo rápido",
  carpeta: "mover: cambia el archivo de carpeta en Drive",
  estado: "el estado de guardado: Google guarda solo, mientras escribes",
  historial: "el historial de versiones: muestra quién cambió qué y cuándo",
  comentarios: "los comentarios: abre todos los comentarios del archivo",
  compartir: "el botón Compartir: invita a otros a ver o editar",
  archivo: "el menú Archivo: nuevo, abrir, descargar (PDF, Word, Excel), imprimir",
  editar: "el menú Editar: deshacer, copiar, pegar, buscar y reemplazar",
  ver: "el menú Ver: mostrar la regla, el esquema, la cuadrícula, inmovilizar",
  insertar: "el menú Insertar: imágenes, tablas, gráficos, enlaces, comentarios",
  formato: "el menú Formato: texto, alineación, interlineado, números, colores alternos",
  datos: "el menú Datos: ordenar, filtrar, validar datos",
  herramientas: "el menú Herramientas: ortografía, contar palabras, dictado por voz",
  deshacer: "deshacer (Ctrl + Z) y rehacer (Ctrl + Y)",
  imprimir: "imprimir (Ctrl + P)",
  ortografia: "revisar ortografía y gramática",
  zoom: "el zoom: acerca o aleja la vista",
  estilos: "los estilos de párrafo: Texto normal, Título, Encabezado 1, 2…",
  fuente: "el tipo de letra (fuente)",
  tamano: "el tamaño de letra",
  negrita: "negrita (Ctrl + B)",
  cursiva: "cursiva (Ctrl + I)",
  subrayado: "subrayado (Ctrl + U)",
  color: "el color del texto (la A)",
  resaltar: "el resaltador (el lápiz): pinta el fondo del texto",
  relleno: "el color de relleno (el balde): pinta el fondo de la celda",
  enlace: "insertar enlace (Ctrl + K)",
  comentario: "agregar un comentario (Ctrl + Alt + M)",
  imagen: "insertar una imagen",
  alinear: "la alineación: izquierda, centro, derecha, justificado",
  interlineado: "el interlineado: el espacio entre líneas",
  vinetas: "lista con viñetas",
  numerada: "lista numerada",
  modo: "el modo: Editando, Sugiriendo (los cambios quedan como propuesta) o Viendo",
  regla: "la regla: márgenes y sangrías",
  esquema: "el esquema: el índice con los títulos del documento",
  hoja: "la hoja: donde escribes",
  moneda: "formato de moneda ($)",
  porcentaje: "formato de porcentaje (%)",
  decimales: "quitar o agregar decimales",
  bordes: "los bordes de las celdas",
  combinar: "combinar celdas: une varias celdas en una",
  ajuste: "el ajuste de texto: que el texto largo baje de línea dentro de la celda",
  filtro: "crear un filtro: muestra solo las filas que quieres",
  funciones: "las funciones (Σ): SUMA, PROMEDIO, MAX, MIN…",
  cuadro: "el cuadro de nombres: dice en qué celda estás (por ejemplo B3)",
  fx: "la barra de fórmulas: muestra lo que de verdad hay en la celda",
  columna: "el encabezado de columna: las columnas se nombran con letras",
  fila: "el encabezado de fila: las filas se nombran con números",
  celda: "una celda: el cruce de una columna y una fila",
  esquina: "la esquina: selecciona toda la hoja",
  pestana: "la pestaña de la hoja: un archivo (libro) puede tener varias hojas",
  "agregar-hoja": "agregar una hoja nueva (+)",
  "lista-hojas": "la lista de todas las hojas del libro",
  resumen: "el resumen de la selección: suma, promedio o conteo de lo que seleccionaste",
};

type CtxZona = {
  tocar: (zona: string) => void;
  marca: { zona: string; bien: boolean } | null;
};
const Ctx = createContext<CtxZona>({ tocar: () => {}, marca: null });

function Z({ zona, children, className = "", titulo }: { zona: string; children: ReactNode; className?: string; titulo?: string }) {
  const { tocar, marca } = useContext(Ctx);
  const m = marca?.zona === zona ? (marca.bien ? "ring-4 ring-emerald-400 bg-emerald-100" : "ring-4 ring-rose-400 bg-rose-100") : "";
  return (
    <button type="button" onClick={() => tocar(zona)} title={titulo} className={`rounded transition-colors hover:bg-slate-200/70 ${m} ${className}`}>
      {children}
    </button>
  );
}

/**
 * Una ventana de Google Docs o de Google Sheets dibujada aquí: el estudiante toca la parte que se
 * le pide. Si toca otra, se le dice qué es lo que tocó (así también aprende de los errores).
 */
export default function Interfaz({ id, app, retos }: { id: string; app: "docs" | "sheets"; retos: RetoInterfaz[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const [marca, setMarca] = useState<{ zona: string; bien: boolean } | null>(null);
  const [mensaje, setMensaje] = useState<{
    bien: boolean;
    texto: string;
  } | null>(null);

  function tocar(zona: string) {
    if (actual === -1) {
      setMarca({ zona, bien: true });
      setMensaje({ bien: true, texto: `Eso es ${ZONAS[zona] ?? zona}.` });
      return;
    }
    const reto = retos[actual];
    if (zona === reto.zona) {
      const nuevos = new Set(hechos).add(actual);
      guardar(
        { hechos: [...nuevos], fallos: datos?.fallos ?? 0 },
        retos.every((_, i) => nuevos.has(i)),
      );
      setMarca({ zona, bien: true });
      setMensaje({
        bien: true,
        texto: `¡Bien! ${reto.explicacion ?? `Eso es ${ZONAS[zona] ?? zona}.`}`,
      });
    } else {
      guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
      setMarca({ zona, bien: false });
      setMensaje({
        bien: false,
        texto: `Eso es ${ZONAS[zona] ?? zona}. Busca otra vez.`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* El reto y el mensaje quedan a la vista aunque haya que bajar para tocar algo. */}
      <div className="sticky top-11 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${actual === -1 ? "bg-emerald-50 text-emerald-800" : "bg-blue-900 text-white"}`}
          >
            {actual === -1 ? "🎉 ¡Encontraste todo! Puedes seguir tocando partes para ver qué es cada una." : `👆 ${retos[actual].pista}`}
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        <p className={`min-h-6 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
          {mensaje?.texto ?? "Toca la parte de la ventana que se pide. Si te equivocas, te digo qué tocaste."}
        </p>
      </div>
      <Ctx.Provider value={{ tocar, marca }}>{app === "docs" ? <VentanaDocs /> : <VentanaSheets />}</Ctx.Provider>
    </div>
  );
}

// ───────────────────────── Partes comunes ─────────────────────────

function Cabecera({ app, nombre }: { app: "docs" | "sheets"; nombre: string }) {
  const menus =
    app === "docs"
      ? ["archivo", "editar", "ver", "insertar", "formato", "herramientas"]
      : ["archivo", "editar", "ver", "insertar", "formato", "datos", "herramientas"];
  return (
    <div className="flex items-center gap-2 px-3 pt-2">
      <Z zona="logo" className="grid h-10 w-8 shrink-0 place-items-center">
        <span className={`grid h-9 w-7 place-items-center rounded-sm text-sm text-white ${app === "docs" ? "bg-[#4285F4]" : "bg-[#0F9D58]"}`}>
          {app === "docs" ? "≡" : "▦"}
        </span>
      </Z>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Z zona="nombre" className="truncate px-1 text-[17px] text-slate-800">
            {nombre}
          </Z>
          <Z zona="estrella" className="px-1 text-slate-500" titulo="Destacar">
            ☆
          </Z>
          <Z zona="carpeta" className="px-1 text-slate-500" titulo="Mover">
            📁
          </Z>
          <Z zona="estado" className="px-1 text-slate-500" titulo="Estado">
            ☁️✓
          </Z>
        </div>
        <div className="flex flex-wrap text-[13px] text-slate-700">
          {menus.map((m) => (
            <Z key={m} zona={m} className="px-1.5 py-0.5">
              {m === "archivo"
                ? "Archivo"
                : m === "editar"
                  ? "Editar"
                  : m === "ver"
                    ? "Ver"
                    : m === "insertar"
                      ? "Insertar"
                      : m === "formato"
                        ? "Formato"
                        : m === "datos"
                          ? "Datos"
                          : "Herramientas"}
            </Z>
          ))}
          <span className="px-1.5 py-0.5 text-slate-400">Extensiones</span>
          <span className="px-1.5 py-0.5 text-slate-400">Ayuda</span>
        </div>
      </div>
      <Z zona="historial" className="hidden h-9 w-9 shrink-0 place-items-center text-lg text-slate-600 sm:grid" titulo="Historial">
        🕘
      </Z>
      <Z zona="comentarios" className="hidden h-9 w-9 shrink-0 place-items-center text-lg text-slate-600 sm:grid" titulo="Comentarios">
        💬
      </Z>
      <Z zona="compartir" className="!rounded-full bg-[#C2E7FF] px-4 py-2 text-sm font-semibold text-slate-800 hover:!bg-[#a8dcff]">
        🔒 Compartir
      </Z>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-bold text-blue-900">T</span>
    </div>
  );
}

const sep = <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" aria-hidden />;

function Barra({ children }: { children: ReactNode }) {
  return <div className="mx-2 mt-1 flex items-center gap-0.5 overflow-x-auto rounded-full bg-[#EDF2FA] px-3 py-1 text-[13px] text-slate-700">{children}</div>;
}

const btn = "grid h-7 min-w-7 shrink-0 place-items-center px-1";

// ───────────────────────── Google Docs ─────────────────────────

function VentanaDocs() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-[#F9FBFD] shadow-lg">
      <Cabecera app="docs" nombre="Grupo1_TICs_1900_vs_hoy" />
      <Barra>
        <Z zona="deshacer" className={btn} titulo="Deshacer">
          ↶ ↷
        </Z>
        <Z zona="imprimir" className={btn} titulo="Imprimir">
          🖨
        </Z>
        <Z zona="ortografia" className={btn} titulo="Ortografía">
          A✓
        </Z>
        <Z zona="zoom" className={btn}>
          100% ▾
        </Z>
        {sep}
        <Z zona="estilos" className={`${btn} whitespace-nowrap`}>
          Texto normal ▾
        </Z>
        {sep}
        <Z zona="fuente" className={`${btn} whitespace-nowrap`}>
          Arial ▾
        </Z>
        {sep}
        <Z zona="tamano" className={btn}>
          − 11 +
        </Z>
        {sep}
        <Z zona="negrita" className={`${btn} font-bold`}>
          B
        </Z>
        <Z zona="cursiva" className={`${btn} italic`}>
          I
        </Z>
        <Z zona="subrayado" className={`${btn} underline`}>
          U
        </Z>
        <Z zona="color" className={`${btn} font-bold underline decoration-rose-500 decoration-4`}>
          A
        </Z>
        <Z zona="resaltar" className={btn}>
          🖍
        </Z>
        {sep}
        <Z zona="enlace" className={btn}>
          🔗
        </Z>
        <Z zona="comentario" className={btn}>
          ➕💬
        </Z>
        <Z zona="imagen" className={btn}>
          🖼
        </Z>
        {sep}
        <Z zona="alinear" className={btn}>
          ☰ ▾
        </Z>
        <Z zona="interlineado" className={btn}>
          ↕≡
        </Z>
        <Z zona="vinetas" className={btn}>
          •≡
        </Z>
        <Z zona="numerada" className={btn}>
          1≡
        </Z>
        <span className="flex-1" />
        <Z zona="modo" className={`${btn} whitespace-nowrap`}>
          ✏️ Editando ▾
        </Z>
      </Barra>
      <Z
        zona="regla"
        className="mx-auto mt-1 block h-5 w-[min(560px,80%)] !rounded-none border-b border-slate-300 bg-white text-[9px] tracking-[0.5em] text-slate-400"
      >
        ▾ · 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 11 · 12 · 13 ▾
      </Z>
      <div className="flex gap-3 px-3 pb-4 pt-2">
        <Z zona="esquema" className="hidden w-40 shrink-0 self-start p-2 text-left text-xs text-slate-500 md:block">
          <span className="block font-semibold text-slate-700">≡ Esquema</span>
          <span className="mt-1 block">TICs en 1900</span>
          <span className="block">TICs hoy</span>
          <span className="block">¿Qué mejoró?</span>
        </Z>
        <Z zona="hoja" className="mx-auto block min-h-56 w-[min(560px,100%)] !rounded-none bg-white p-6 text-left shadow">
          <span className="block text-center text-xl font-bold text-slate-800">Las TICs en 1900 y hoy</span>
          <span className="mt-1 block text-center text-xs text-slate-500">Grupo 1 · TICs para el área de la salud</span>
          <span className="mt-4 block text-sm text-slate-700">
            <b>¿Cómo guardaban la historia del paciente?</b> En The Knick se anota a mano en libros. Hoy…
          </span>
          <span className="mt-2 block text-sm text-slate-700">
            <b>¿Cómo se comunicaba el equipo?</b> <span className="bg-yellow-200">A gritos, en persona o con mensajeros.</span>
          </span>
        </Z>
      </div>
    </div>
  );
}

// ───────────────────────── Google Sheets ─────────────────────────

const DATOS_SHEETS = [
  ["Medicamento", "Unidades", "Precio"],
  ["Acetaminofén", "120", "$ 500"],
  ["Ibuprofeno", "80", "$ 800"],
  ["Loratadina", "45", "$ 1.200"],
  ["Suero oral", "30", "$ 2.500"],
];

function VentanaSheets() {
  const columnas = ["A", "B", "C", "D", "E"];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-[#F9FBFD] shadow-lg">
      <Cabecera app="sheets" nombre="Inventario_Farmacia" />
      <Barra>
        <Z zona="deshacer" className={btn}>
          ↶ ↷
        </Z>
        <Z zona="imprimir" className={btn}>
          🖨
        </Z>
        <Z zona="zoom" className={btn}>
          100% ▾
        </Z>
        {sep}
        <Z zona="moneda" className={btn}>
          $
        </Z>
        <Z zona="porcentaje" className={btn}>
          %
        </Z>
        <Z zona="decimales" className={btn}>
          .0 .00
        </Z>
        {sep}
        <Z zona="fuente" className={`${btn} whitespace-nowrap`}>
          Arial ▾
        </Z>
        <Z zona="tamano" className={btn}>
          − 10 +
        </Z>
        {sep}
        <Z zona="negrita" className={`${btn} font-bold`}>
          B
        </Z>
        <Z zona="cursiva" className={`${btn} italic`}>
          I
        </Z>
        <Z zona="color" className={`${btn} font-bold underline decoration-rose-500 decoration-4`}>
          A
        </Z>
        {sep}
        <Z zona="relleno" className={btn}>
          🪣
        </Z>
        <Z zona="bordes" className={btn}>
          ⊞
        </Z>
        <Z zona="combinar" className={btn}>
          ⇹
        </Z>
        {sep}
        <Z zona="alinear" className={btn}>
          ≡ ▾
        </Z>
        <Z zona="ajuste" className={btn}>
          ↵
        </Z>
        {sep}
        <Z zona="filtro" className={btn}>
          ⏷
        </Z>
        <Z zona="funciones" className={btn}>
          Σ
        </Z>
      </Barra>
      <div className="mt-1 flex items-center gap-1 border-y border-slate-200 bg-white px-2 py-1 text-sm">
        <Z zona="cuadro" className="w-20 shrink-0 border-r border-slate-200 px-2 py-0.5 text-left font-mono">
          B3 ▾
        </Z>
        <Z zona="fx" className="flex flex-1 items-center gap-2 px-2 py-0.5 text-left">
          <span className="italic text-slate-400">fx</span>
          <span className="font-mono">80</span>
        </Z>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-slate-200 bg-slate-100">
                <Z zona="esquina" className="block h-6 w-full !rounded-none">
                  {" "}
                </Z>
              </th>
              {columnas.map((c) => (
                <th key={c} className="border border-slate-200 bg-slate-100 p-0 font-normal text-slate-600">
                  <Z zona="columna" className={`block w-full !rounded-none py-0.5 ${c === "B" ? "bg-[#D3E3FD]" : ""}`}>
                    {c}
                  </Z>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DATOS_SHEETS.concat([
              ["", "", ""],
              ["", "", ""],
            ]).map((fila, f) => (
              <tr key={f}>
                <td className="border border-slate-200 bg-slate-100 p-0 text-center text-slate-600">
                  <Z zona="fila" className={`block w-full !rounded-none py-0.5 ${f === 2 ? "bg-[#D3E3FD]" : ""}`}>
                    {f + 1}
                  </Z>
                </td>
                {columnas.map((c, j) => {
                  const v = fila[j] ?? "";
                  const activa = f === 2 && j === 1;
                  const num = /^[$\d]/.test(v);
                  return (
                    <td key={c} className={`border border-slate-200 p-0 ${activa ? "outline outline-2 -outline-offset-1 outline-[#1A73E8]" : ""}`}>
                      <Z zona="celda" className={`block h-7 w-full !rounded-none px-2 ${num ? "text-right" : "text-left"} ${f === 0 ? "font-bold" : ""}`}>
                        {v}
                      </Z>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-1 border-t border-slate-200 bg-[#F9FBFD] px-2 py-1 text-sm">
        <Z zona="agregar-hoja" className="grid h-8 w-8 place-items-center text-lg text-slate-600">
          +
        </Z>
        <Z zona="lista-hojas" className="grid h-8 w-8 place-items-center text-slate-600">
          ≡
        </Z>
        <Z zona="pestana" className="!rounded-t-none bg-[#E1E9F7] px-4 py-1.5 font-semibold text-[#0B57D0]">
          Hoja 1 ▾
        </Z>
        <span className="px-3 text-slate-500">Hoja 2</span>
        <span className="flex-1" />
        <Z zona="resumen" className="px-3 py-1 text-slate-600">
          Suma: 80 ▾
        </Z>
      </div>
    </div>
  );
}
