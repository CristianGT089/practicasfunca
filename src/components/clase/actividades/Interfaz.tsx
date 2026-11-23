"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { RetoInterfaz } from "@/lib/clase/tipos";
import { useDispositivo } from "@/lib/clase/dispositivo";
import { useProgreso } from "../progreso";

/**
 * `hechos` son los retos de la ventana de computador y `hechosCelular` los de la app del
 * celular (se agregó después: los datos viejos solo traen `hechos` y `fallos`).
 */
type Datos = { hechos: number[]; fallos: number; hechosCelular?: number[] };

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

  // App del celular (Docs y Sheets para Android y iPhone).
  "m-atras": "la flecha atrás: vuelves a la lista de tus archivos",
  "m-listo": "el ✓ (listo): sales del modo edición; el archivo se guarda solo",
  "m-lapiz": "el lápiz: activa la edición para poder escribir",
  "m-deshacer": "deshacer y rehacer (las flechas curvas)",
  "m-formato": "la «A» de formato: negrita, color, tamaño, alineación…",
  "m-insertar": "el «+» de insertar: tabla, imagen, enlace, comentario…",
  "m-comentarios": "los comentarios: lees, respondes o agregas comentarios",
  "m-mas": "⋮ más opciones: compartir y exportar, buscar, detalles…",
  "m-hoja": "el documento: donde escribes",
  "m-compartir": "Compartir y exportar: invitar a otros, enviar una copia en PDF o Word, imprimir",
  "m-impresion": "Diseño de impresión: ves las páginas como saldrán impresas",
  "m-sugerir": "Sugerir cambios: lo que escribes queda como propuesta",
  "m-buscar": "Buscar y reemplazar",
  "m-contar": "Contar palabras",
  "m-pagina": "Configurar página: orientación, tamaño del papel, márgenes",
  "m-detalles": "Detalles: dueño, ubicación, fecha de creación y de cambios",
  "m-nombre": "el nombre del archivo",
  "m-celda": "una celda: tócala para seleccionarla; tócala dos veces para escribir",
  "m-fx": "la barra de fórmulas (fx): aparece abajo al tocar una celda y muestra lo que de verdad hay en ella",
  "m-columna": "el encabezado de columna (la letra): tócalo para seleccionar toda la columna",
  "m-fila": "el encabezado de fila (el número): tócalo para seleccionar toda la fila",
  "m-pestana": "la pestaña de la hoja: un libro puede tener varias hojas",
  "m-agregar-hoja": "agregar una hoja nueva (+)",
  "m-resumen": "el resumen de la selección: la suma de lo que seleccionaste",
  "m-ordenar": "Ordenar rango: de la A a la Z o al revés",
  "m-filtro": "Crear un filtro: muestra solo las filas que quieres",
};

/** Partes del celular que solo cambian lo que se ve (abrir la edición, escoger una celda): no restan. */
const SIN_FALLO = new Set(["m-lapiz", "m-listo", "m-celda"]);
/** Opciones que están dentro de un menú: tocar el menú es ir por buen camino. */
const PADRE: Record<string, string> = {
  "m-compartir": "m-mas",
  "m-impresion": "m-mas",
  "m-sugerir": "m-mas",
  "m-buscar": "m-mas",
  "m-contar": "m-mas",
  "m-pagina": "m-mas",
  "m-detalles": "m-mas",
  "m-ordenar": "m-mas",
  "m-filtro": "m-mas",
};
/** Botones de la app de Docs que solo aparecen al editar (con el lápiz). */
const SOLO_EDITANDO = new Set(["m-listo", "m-deshacer", "m-formato", "m-insertar"]);

type CtxZona = {
  tocar: (zona: string) => void;
  marca: { zona: string; bien: boolean } | null;
};
const Ctx = createContext<CtxZona>({ tocar: () => {}, marca: null });

function Z({
  zona,
  children,
  className = "",
  titulo,
  accion,
}: {
  zona: string;
  children: ReactNode;
  className?: string;
  /** Nombre para lectores de pantalla (lo visible ya debe bastar: en táctil no hay hover). */
  titulo?: string;
  /** Lo que cambia en la simulación al tocarla (abrir un menú, activar la edición…). */
  accion?: () => void;
}) {
  const { tocar, marca } = useContext(Ctx);
  const m = marca?.zona === zona ? (marca.bien ? "ring-4 ring-emerald-400 bg-emerald-100" : "ring-4 ring-rose-400 bg-rose-100") : "";
  return (
    <button
      type="button"
      onClick={() => {
        tocar(zona);
        accion?.();
      }}
      aria-label={titulo}
      className={`rounded transition-colors hover:bg-slate-200/70 ${m} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Una ventana de Google Docs o de Google Sheets dibujada aquí: el estudiante toca la parte que se
 * le pide. Si toca otra, se le dice qué es lo que tocó (así también aprende de los errores).
 * En el celular se simula la app de Docs o Sheets (otra interfaz), con sus propios retos.
 */
export default function Interfaz({
  id,
  app,
  retos,
  retosCelular,
}: {
  id: string;
  app: "docs" | "sheets";
  retos: RetoInterfaz[];
  retosCelular?: RetoInterfaz[];
}) {
  const dispositivo = useDispositivo();
  const celular = dispositivo === "celular";
  const hayApp = !!retosCelular?.length;
  const [eleccion, setEleccion] = useState<"celular" | "computador" | null>(null);
  const movil = hayApp && (eleccion ?? (celular ? "celular" : "computador")) === "celular";
  const lista = movil ? retosCelular! : retos;

  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set((movil ? datos?.hechosCelular : datos?.hechos) ?? []);
  const actual = lista.findIndex((_, i) => !hechos.has(i));
  const [marca, setMarca] = useState<{ zona: string; bien: boolean } | null>(null);
  const [mensaje, setMensaje] = useState<{
    bien: boolean;
    texto: string;
  } | null>(null);
  // Estado de la app simulada del celular.
  const [editando, setEditando] = useState(false);
  const [celda, setCelda] = useState<[number, number] | null>(null);

  function cambiarVista(v: "celular" | "computador") {
    setEleccion(v);
    setMarca(null);
    setMensaje(null);
  }

  function tocar(zona: string) {
    if (actual === -1) {
      setMarca({ zona, bien: true });
      setMensaje({ bien: true, texto: `Eso es ${ZONAS[zona] ?? zona}.` });
      return;
    }
    const reto = lista[actual];
    if (zona === reto.zona) {
      const nuevos = [...new Set(hechos).add(actual)];
      const completo = lista.every((_, i) => nuevos.includes(i));
      guardar(
        movil
          ? { ...datos, hechos: datos?.hechos ?? [], fallos: datos?.fallos ?? 0, hechosCelular: nuevos }
          : { ...datos, hechos: nuevos, fallos: datos?.fallos ?? 0 },
        completo,
      );
      setMarca({ zona, bien: true });
      setMensaje({
        bien: true,
        texto: `¡Bien! ${reto.explicacion ?? `Eso es ${ZONAS[zona] ?? zona}.`}`,
      });
    } else if (SIN_FALLO.has(zona) || PADRE[reto.zona] === zona) {
      // No es la respuesta, pero tampoco un error: cambia lo que se ve o es el camino.
      setMarca(null);
      setMensaje({
        bien: true,
        texto: PADRE[reto.zona] === zona ? "Vas bien: busca la opción dentro de este menú." : `Eso es ${ZONAS[zona] ?? zona}.`,
      });
    } else {
      guardar({ ...datos, hechos: datos?.hechos ?? [], fallos: (datos?.fallos ?? 0) + 1 }, false);
      setMarca({ zona, bien: false });
      let pista = "";
      if (movil && app === "docs" && SOLO_EDITANDO.has(reto.zona) && !editando) pista = " Pista: primero activa la edición con el lápiz.";
      if (movil && reto.zona === "m-fx" && !celda) pista = " Pista: primero toca una celda.";
      setMensaje({
        bien: false,
        texto: `Eso es ${ZONAS[zona] ?? zona}. Busca otra vez.${pista}`,
      });
    }
  }

  const enlace = "rounded font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950 pointer-coarse:min-h-10 pointer-coarse:px-1";

  return (
    <div className="flex flex-col gap-3">
      {/* El reto y el mensaje quedan a la vista aunque haya que bajar para tocar algo. */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-1.5 bg-[var(--background)] px-1 pb-2 pt-2 sm:gap-2 sm:pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex-1 rounded-2xl px-3 py-2 font-heading text-base font-bold sm:px-4 sm:py-3 sm:text-lg ${actual === -1 ? "bg-emerald-50 text-emerald-800" : "bg-blue-900 text-white"}`}
          >
            {actual === -1 ? "🎉 ¡Encontraste todo! Puedes seguir tocando partes para ver qué es cada una." : `👆 ${lista[actual].pista}`}
          </div>
          <span className="shrink-0 text-sm font-semibold text-blue-900">
            {hechos.size} de {lista.length}
          </span>
        </div>
        <p className={`min-h-5 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
          {mensaje?.texto ??
            (celular
              ? `Toca la parte de la ${movil ? "pantalla" : "ventana"} que se pide. Si te equivocas, te digo qué tocaste.`
              : `Haz clic en la parte de la ${movil ? "pantalla" : "ventana"} que se pide. Si te equivocas, te digo qué era.`)}
        </p>
      </div>
      {hayApp && (
        <p className="-mt-1 flex flex-wrap items-center gap-x-1 text-xs text-slate-500">
          {movil ? (
            <>
              <span>Simulamos la app {app === "docs" ? "Google Docs" : "Google Sheets"} del celular ·</span>
              <button type="button" className={enlace} onClick={() => cambiarVista("computador")}>
                Ver la de computador
              </button>
            </>
          ) : (
            <>
              <span>Simulamos {app === "docs" ? "Google Docs" : "Google Sheets"} en el computador ·</span>
              <button type="button" className={enlace} onClick={() => cambiarVista("celular")}>
                Ver la app del celular
              </button>
            </>
          )}
        </p>
      )}
      <Ctx.Provider value={{ tocar, marca }}>
        {movil ? (
          app === "docs" ? (
            <DocsMovil editando={editando} setEditando={setEditando} />
          ) : (
            <SheetsMovil celda={celda} setCelda={setCelda} />
          )
        ) : app === "docs" ? (
          <VentanaDocs />
        ) : (
          <VentanaSheets />
        )}
      </Ctx.Provider>
    </div>
  );
}

// ───────────────────────── Partes comunes (computador) ─────────────────────────

/** En pantallas táctiles, cada parte mide al menos 40 px: un toque errado cuenta como fallo. */
const toque = "pointer-coarse:min-h-10 pointer-coarse:min-w-10";

const NOMBRE_MENU: Record<string, string> = {
  archivo: "Archivo",
  editar: "Editar",
  ver: "Ver",
  insertar: "Insertar",
  formato: "Formato",
  datos: "Datos",
  herramientas: "Herramientas",
};

function Cabecera({ app, nombre }: { app: "docs" | "sheets"; nombre: string }) {
  const menus =
    app === "docs"
      ? ["archivo", "editar", "ver", "insertar", "formato", "herramientas"]
      : ["archivo", "editar", "ver", "insertar", "formato", "datos", "herramientas"];
  return (
    // Hace wrap en pantallas angostas: ninguna parte se esconde ni se encoge a cero.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2">
      <Z zona="logo" className={`grid h-10 w-8 shrink-0 place-items-center ${toque}`} titulo="Inicio">
        <span className={`grid h-9 w-7 place-items-center rounded-sm text-sm text-white ${app === "docs" ? "bg-[#4285F4]" : "bg-[#0F9D58]"}`}>
          {app === "docs" ? "≡" : "▦"}
        </span>
      </Z>
      <div className="min-w-0 flex-1 basis-52">
        <div className="flex flex-wrap items-center gap-1">
          <Z zona="nombre" className={`max-w-full truncate px-1 text-left text-[17px] text-slate-800 ${toque}`}>
            {nombre}
          </Z>
          <Z zona="estrella" className={`px-1 text-slate-500 ${toque}`} titulo="Destacar">
            ☆
          </Z>
          <Z zona="carpeta" className={`px-1 text-slate-500 ${toque}`} titulo="Mover">
            📁
          </Z>
          <Z zona="estado" className={`px-1 text-slate-500 ${toque}`} titulo="Estado de guardado">
            ☁️✓
          </Z>
        </div>
        <div className="flex flex-wrap text-[13px] text-slate-700">
          {menus.map((m) => (
            <Z key={m} zona={m} className={`px-1.5 py-0.5 ${toque}`}>
              {NOMBRE_MENU[m]}
            </Z>
          ))}
          <span className="grid place-items-center px-1.5 py-0.5 text-slate-400">Extensiones</span>
          <span className="grid place-items-center px-1.5 py-0.5 text-slate-400">Ayuda</span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Z zona="historial" className={`grid h-9 w-9 place-items-center text-lg text-slate-600 ${toque}`} titulo="Historial de versiones">
          🕘
        </Z>
        <Z zona="comentarios" className={`grid h-9 w-9 place-items-center text-lg text-slate-600 ${toque}`} titulo="Comentarios">
          💬
        </Z>
        <Z zona="compartir" className={`!rounded-full bg-[#C2E7FF] px-4 py-2 text-sm font-semibold text-slate-800 hover:!bg-[#a8dcff] ${toque}`}>
          🔒 Compartir
        </Z>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-bold text-blue-900">T</span>
      </div>
    </div>
  );
}

const sep = <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" aria-hidden />;

/** La barra de herramientas hace wrap: en pantallas angostas ningún botón queda escondido. */
function Barra({ children }: { children: ReactNode }) {
  return <div className="mx-2 mt-1 flex flex-wrap items-center gap-0.5 rounded-3xl bg-[#EDF2FA] px-3 py-1 text-[13px] text-slate-700">{children}</div>;
}

const btn = `grid h-7 min-w-7 shrink-0 place-items-center px-1 ${toque}`;

// ───────────────────────── Google Docs (computador) ─────────────────────────

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
        className="mx-auto mt-1 block h-6 w-[min(560px,90%)] !rounded-none border-b border-slate-300 bg-white text-[9px] tracking-[0.3em] text-slate-400 pointer-coarse:h-10 sm:tracking-[0.5em]"
      >
        <span className="block truncate">▾ · 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 11 · 12 · 13 ▾</span>
      </Z>
      <div className="flex flex-col gap-3 px-3 pb-4 pt-2 md:flex-row">
        <Z zona="esquema" className="w-full shrink-0 self-start p-2 text-left text-xs text-slate-500 md:w-40">
          <span className="block font-semibold text-slate-700">≡ Esquema</span>
          <span className="mt-1 hidden md:block">TICs en 1900</span>
          <span className="hidden md:block">TICs hoy</span>
          <span className="hidden md:block">¿Qué mejoró?</span>
        </Z>
        <Z zona="hoja" className="mx-auto block min-h-56 w-[min(560px,100%)] !rounded-none bg-white p-4 text-left shadow sm:p-6">
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

// ───────────────────────── Google Sheets (computador) ─────────────────────────

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
        <Z zona="cuadro" className={`w-20 shrink-0 border-r border-slate-200 px-2 py-0.5 text-left font-mono ${toque}`}>
          B3 ▾
        </Z>
        <Z zona="fx" className={`flex flex-1 items-center gap-2 px-2 py-0.5 text-left ${toque}`}>
          <span className="italic text-slate-400">fx</span>
          <span className="font-mono">80</span>
        </Z>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-slate-200 bg-slate-100 p-0">
                <Z zona="esquina" className="block h-6 w-full !rounded-none pointer-coarse:h-10" titulo="Seleccionar toda la hoja">
                  {" "}
                </Z>
              </th>
              {columnas.map((c) => (
                <th key={c} className="border border-slate-200 bg-slate-100 p-0 font-normal text-slate-600">
                  <Z zona="columna" className={`block w-full !rounded-none py-0.5 pointer-coarse:py-2.5 ${c === "B" ? "bg-[#D3E3FD]" : ""}`}>
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
                  <Z zona="fila" className={`block w-full !rounded-none py-0.5 pointer-coarse:py-2.5 ${f === 2 ? "bg-[#D3E3FD]" : ""}`}>
                    {f + 1}
                  </Z>
                </td>
                {columnas.map((c, j) => {
                  const v = fila[j] ?? "";
                  const activa = f === 2 && j === 1;
                  const num = /^[$\d]/.test(v);
                  return (
                    <td key={c} className={`border border-slate-200 p-0 ${activa ? "outline outline-2 -outline-offset-1 outline-[#1A73E8]" : ""}`}>
                      <Z
                        zona="celda"
                        className={`block h-7 w-full whitespace-nowrap !rounded-none px-2 pointer-coarse:h-10 ${num ? "text-right" : "text-left"} ${f === 0 ? "font-bold" : ""}`}
                      >
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
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 bg-[#F9FBFD] px-2 py-1 text-sm">
        <Z zona="agregar-hoja" className={`grid h-8 w-8 place-items-center text-lg text-slate-600 ${toque}`} titulo="Agregar hoja">
          +
        </Z>
        <Z zona="lista-hojas" className={`grid h-8 w-8 place-items-center text-slate-600 ${toque}`} titulo="Todas las hojas">
          ≡
        </Z>
        <Z zona="pestana" className={`!rounded-t-none bg-[#E1E9F7] px-4 py-1.5 font-semibold text-[#0B57D0] ${toque}`}>
          Hoja 1 ▾
        </Z>
        <span className="px-3 text-slate-500">Hoja 2</span>
        <span className="flex-1" />
        <Z zona="resumen" className={`px-3 py-1 text-slate-600 ${toque}`}>
          Suma: 80 ▾
        </Z>
      </div>
    </div>
  );
}

// ───────────────────────── App del celular: partes comunes ─────────────────────────

/** Botón redondo de la barra de la app (48 px, como en Android). */
const ico = "grid h-11 w-11 shrink-0 place-items-center !rounded-full text-xl text-slate-700";
/** Fila de un menú o panel de la app. */
const filaMenu = "flex min-h-11 w-full items-center gap-3 !rounded-none px-4 text-left text-[15px] text-slate-800";

/** El marco del teléfono, con la barra de estado. */
function Telefono({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex h-[36rem] w-full max-w-[24rem] flex-col overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between px-5 pb-0.5 pt-1.5 text-xs font-semibold text-slate-700" aria-hidden>
        <span>9:41</span>
        <span>▾ ◢ ▮</span>
      </div>
      {children}
    </div>
  );
}

/** Fondo oscuro y panel (abajo) o menú desplegable (arriba a la derecha) de la app. */
function Capa({ cerrar, children, tipo }: { cerrar: () => void; children: ReactNode; tipo: "panel" | "menu" }) {
  return (
    <>
      <button type="button" aria-label="Cerrar" onClick={cerrar} className="absolute inset-0 z-10 cursor-default bg-black/25" />
      <div
        className={
          tipo === "panel"
            ? "absolute inset-x-0 bottom-0 z-20 max-h-[75%] overflow-y-auto rounded-t-2xl bg-white pb-2 shadow-2xl"
            : "absolute right-2 top-9 z-20 max-h-[85%] w-64 max-w-[90%] overflow-y-auto rounded-lg bg-white py-1 shadow-2xl"
        }
      >
        {children}
      </div>
    </>
  );
}

/** Panel de formato («A»): dos pestañas, como en la app. */
function PanelFormato({ pestanas, cerrar }: { pestanas: [string, ReactNode][]; cerrar: () => void }) {
  const [i, setI] = useState(0);
  return (
    <Capa cerrar={cerrar} tipo="panel">
      <div className="flex border-b border-slate-200">
        {pestanas.map(([t], j) => (
          <button
            key={t}
            type="button"
            onClick={() => setI(j)}
            className={`min-h-11 flex-1 text-sm font-semibold uppercase tracking-wide ${i === j ? "border-b-2 border-[#0B57D0] text-[#0B57D0]" : "text-slate-500"}`}
          >
            {t}
          </button>
        ))}
        <button type="button" onClick={cerrar} aria-label="Cerrar formato" className="grid min-h-11 w-11 place-items-center text-slate-500">
          ✕
        </button>
      </div>
      <div className="flex flex-col text-[15px] text-slate-800">{pestanas[i][1]}</div>
    </Capa>
  );
}

/** Una fila informativa de un panel (no es un reto). */
function Opcion({ children, valor }: { children: ReactNode; valor?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-4">
      <span>{children}</span>
      {valor && <span className="text-slate-500">{valor}</span>}
    </div>
  );
}

function ListaSimple({ titulo, items, cerrar }: { titulo: string; items: string[]; cerrar: () => void }) {
  return (
    <Capa cerrar={cerrar} tipo="panel">
      <div className="flex items-center justify-between border-b border-slate-200 pl-4">
        <span className="font-semibold text-slate-800">{titulo}</span>
        <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid min-h-11 w-11 place-items-center text-slate-500">
          ✕
        </button>
      </div>
      {items.map((t) => (
        <Opcion key={t}>{t}</Opcion>
      ))}
    </Capa>
  );
}

const FILA_TEXTO = (
  <div className="flex min-h-12 items-center justify-around border-b border-slate-100 px-4 text-lg">
    <b>B</b>
    <i>I</i>
    <u>U</u>
    <s>S</s>
  </div>
);

// ───────────────────────── App de Google Docs (celular) ─────────────────────────

type MenuMovil = "formato" | "insertar" | "mas" | "comentarios" | null;

function DocsMovil({ editando, setEditando }: { editando: boolean; setEditando: (v: boolean) => void }) {
  const [abierto, setAbierto] = useState<MenuMovil>(null);
  const [impresion, setImpresion] = useState(false);
  const [sugerir, setSugerir] = useState(false);
  const cerrar = () => setAbierto(null);
  return (
    <Telefono>
      {/* Barra superior: cambia al editar. */}
      <div className="flex h-14 shrink-0 items-center gap-0.5 border-b border-slate-200 px-1">
        {editando ? (
          <>
            <Z zona="m-listo" className={`${ico} text-[#0B57D0]`} titulo="Listo" accion={() => setEditando(false)}>
              ✓
            </Z>
            <Z zona="m-deshacer" className="flex h-11 shrink-0 items-center gap-3 !rounded-full px-2 text-xl text-slate-700" titulo="Deshacer y rehacer">
              <span>↶</span>
              <span className="text-slate-400">↷</span>
            </Z>
            <span className="flex-1" />
            <Z zona="m-formato" className={`${ico} font-serif font-bold underline decoration-2`} titulo="Formato" accion={() => setAbierto("formato")}>
              A
            </Z>
            <Z zona="m-insertar" className={`${ico} text-2xl`} titulo="Insertar" accion={() => setAbierto("insertar")}>
              +
            </Z>
          </>
        ) : (
          <>
            <Z zona="m-atras" className={ico} titulo="Atrás">
              ←
            </Z>
            <span className="flex-1" />
          </>
        )}
        <Z zona="m-comentarios" className={ico} titulo="Comentarios" accion={() => setAbierto("comentarios")}>
          💬
        </Z>
        <Z zona="m-mas" className={`${ico} font-bold`} titulo="Más opciones" accion={() => setAbierto("mas")}>
          ⋮
        </Z>
      </div>
      {sugerir && editando && <div className="shrink-0 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-800">Sugiriendo cambios</div>}

      <div className={`min-h-0 flex-1 overflow-y-auto ${impresion ? "bg-slate-200 p-3" : "bg-white"}`}>
        <Z zona="m-hoja" className={`block w-full !rounded-none bg-white p-4 text-left ${impresion ? "min-h-full shadow" : ""}`}>
          <span className="block text-lg font-bold text-slate-800">Las TICs en 1900 y hoy</span>
          <span className="mt-1 block text-xs text-slate-500">Grupo 1 · TICs para el área de la salud</span>
          <span className="mt-3 block text-[15px] text-slate-700">
            <b>¿Cómo guardaban la historia del paciente?</b> En The Knick se anota a mano en libros. Hoy…
          </span>
          <span className="mt-2 block text-[15px] text-slate-700">
            <b>¿Cómo se comunicaba el equipo?</b> <span className="bg-yellow-200">A gritos, en persona o con mensajeros.</span>
            {editando && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-[#0B57D0]" aria-hidden />}
          </span>
        </Z>
      </div>

      {!editando && (
        <Z
          zona="m-lapiz"
          className="absolute bottom-4 right-4 z-[5] grid h-14 w-14 place-items-center !rounded-2xl bg-[#C2E7FF] text-2xl shadow-lg hover:!bg-[#a8dcff]"
          titulo="Editar"
          accion={() => setEditando(true)}
        >
          ✏️
        </Z>
      )}

      {abierto === "formato" && (
        <PanelFormato
          cerrar={cerrar}
          pestanas={[
            [
              "Texto",
              <>
                {FILA_TEXTO}
                <Opcion valor="Texto normal ›">Estilo</Opcion>
                <Opcion valor="Arial ›">Fuente</Opcion>
                <Opcion valor="− 11 +">Tamaño</Opcion>
                <Opcion valor="›">Color del texto</Opcion>
                <Opcion valor="›">Color de resaltado</Opcion>
              </>,
            ],
            [
              "Párrafo",
              <>
                <Opcion valor="⫷ ≡ ⫸ ☰">Alineación</Opcion>
                <Opcion valor="⇤ ⇥">Sangría</Opcion>
                <Opcion valor="•≡ 1≡">Listas</Opcion>
                <Opcion valor="1,15 ›">Interlineado</Opcion>
              </>,
            ],
          ]}
        />
      )}
      {abierto === "insertar" && (
        <ListaSimple
          titulo="Insertar"
          cerrar={cerrar}
          items={["🔗 Enlace", "💬 Comentario", "🖼 Imagen", "▦ Tabla", "― Línea horizontal", "⤓ Salto de página", "# Número de página", "¹ Nota al pie"]}
        />
      )}
      {abierto === "comentarios" && (
        <ListaSimple titulo="Comentarios" cerrar={cerrar} items={["Ana: ¿Agregamos una foto de 1900?", "＋ Nuevo comentario (selecciona el texto primero)"]} />
      )}
      {abierto === "mas" && (
        <Capa cerrar={cerrar} tipo="menu">
          <Z zona="m-impresion" className={`${filaMenu} justify-between`} accion={() => setImpresion(!impresion)}>
            <span>Diseño de impresión</span>
            <Interruptor activo={impresion} />
          </Z>
          <Z zona="m-sugerir" className={`${filaMenu} justify-between`} accion={() => setSugerir(!sugerir)}>
            <span>Sugerir cambios</span>
            <Interruptor activo={sugerir} />
          </Z>
          <Z zona="m-buscar" className={filaMenu} accion={cerrar}>
            Buscar y reemplazar
          </Z>
          <Z zona="m-contar" className={filaMenu} accion={cerrar}>
            Contar palabras
          </Z>
          <Z zona="m-pagina" className={filaMenu} accion={cerrar}>
            Configurar página
          </Z>
          <Z zona="m-compartir" className={filaMenu} accion={cerrar}>
            Compartir y exportar ›
          </Z>
          <Z zona="m-detalles" className={filaMenu} accion={cerrar}>
            Detalles
          </Z>
          <span className="flex min-h-11 items-center px-4 text-[15px] text-slate-400">Disponible sin conexión</span>
        </Capa>
      )}
    </Telefono>
  );
}

function Interruptor({ activo }: { activo: boolean }) {
  return (
    <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${activo ? "bg-[#0B57D0]" : "bg-slate-300"}`} aria-hidden>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${activo ? "left-[1.125rem]" : "left-0.5"}`} />
    </span>
  );
}

// ───────────────────────── App de Google Sheets (celular) ─────────────────────────

/** [lo que se ve, lo que hay de verdad en la celda]. */
const DATOS_MOVIL: [string, string?][][] = [
  [["Medicamento"], ["Unidades"], ["Precio"]],
  [["Acetaminofén"], ["120"], ["$ 500", "500"]],
  [["Ibuprofeno"], ["80"], ["$ 800", "800"]],
  [["Loratadina"], ["45"], ["$ 1.200", "1200"]],
  [["Suero oral"], ["30"], ["$ 2.500", "2500"]],
  [["Total"], ["275", "=SUMA(B2:B5)"], [""]],
  [[""], [""], [""]],
  [[""], [""], [""]],
];

function SheetsMovil({ celda, setCelda }: { celda: [number, number] | null; setCelda: (c: [number, number] | null) => void }) {
  const [abierto, setAbierto] = useState<MenuMovil>(null);
  const cerrar = () => setAbierto(null);
  const columnas = ["A", "B", "C", "D"];
  const [cf, cc] = celda ?? [-1, -1];
  const valor = celda ? DATOS_MOVIL[cf]?.[cc] : undefined;
  const real = valor ? (valor[1] ?? valor[0]) : "";
  const numero = valor && /^[$\d]/.test(valor[0]) ? valor[0] : null;
  return (
    <Telefono>
      <div className="flex h-14 shrink-0 items-center gap-0.5 border-b border-slate-200 px-1">
        <Z zona="m-atras" className={ico} titulo="Atrás">
          ←
        </Z>
        <Z zona="m-nombre" className="min-h-11 min-w-0 flex-1 truncate px-1 text-left text-[15px] font-medium text-slate-800">
          Inventario_Farmacia
        </Z>
        <Z zona="m-deshacer" className={ico} titulo="Deshacer">
          ↶
        </Z>
        <Z zona="m-formato" className={`${ico} font-serif font-bold underline decoration-2`} titulo="Formato" accion={() => setAbierto("formato")}>
          A
        </Z>
        <Z zona="m-insertar" className={`${ico} text-2xl`} titulo="Insertar" accion={() => setAbierto("insertar")}>
          +
        </Z>
        <Z zona="m-mas" className={`${ico} font-bold`} titulo="Más opciones" accion={() => setAbierto("mas")}>
          ⋮
        </Z>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-8" />
            <col className="w-[6.5rem]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-100" />
              {columnas.map((c, j) => (
                <th key={c} className="border border-slate-200 bg-slate-100 p-0 font-normal text-slate-600">
                  <Z zona="m-columna" className={`block h-10 w-full !rounded-none ${cc === j ? "bg-[#D3E3FD] font-semibold text-[#0B57D0]" : ""}`}>
                    {c}
                  </Z>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DATOS_MOVIL.map((fila, f) => (
              <tr key={f}>
                <td className="border border-slate-200 bg-slate-100 p-0 text-center text-slate-600">
                  <Z zona="m-fila" className={`block h-10 w-full !rounded-none ${cf === f ? "bg-[#D3E3FD] font-semibold text-[#0B57D0]" : ""}`}>
                    {f + 1}
                  </Z>
                </td>
                {columnas.map((c, j) => {
                  const v = fila[j]?.[0] ?? "";
                  const activa = cf === f && cc === j;
                  return (
                    <td key={c} className={`border border-slate-200 p-0 ${activa ? "outline outline-2 -outline-offset-1 outline-[#1A73E8]" : ""}`}>
                      <Z
                        zona="m-celda"
                        className={`block h-10 w-full overflow-hidden text-ellipsis whitespace-nowrap !rounded-none px-1.5 ${/^[$\d]/.test(v) ? "text-right" : "text-left"} ${f === 0 || f === 5 ? "font-bold" : ""}`}
                        accion={() => setCelda([f, j])}
                      >
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

      {/* La barra de fórmulas aparece abajo cuando hay una celda escogida. */}
      {celda && (
        <div className="flex shrink-0 items-center border-t border-slate-300 bg-white">
          <Z zona="m-fx" className="flex min-h-11 flex-1 items-center gap-3 !rounded-none px-3 text-left">
            <span className="font-serif italic text-slate-500">fx</span>
            <span className="truncate font-mono text-[15px] text-slate-800">{real || " "}</span>
          </Z>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1 border-t border-slate-200 bg-[#F1F4F9] px-1 py-1 text-sm">
        <Z zona="m-agregar-hoja" className={`${ico} text-2xl`} titulo="Agregar hoja">
          +
        </Z>
        <Z zona="m-pestana" className="min-h-11 !rounded-md bg-white px-3 font-semibold text-[#0B57D0] shadow-sm">
          Hoja 1
        </Z>
        <span className="px-2 text-slate-500">Hoja 2</span>
        <span className="flex-1" />
        <Z zona="m-resumen" className="min-h-11 px-2 text-slate-600">
          Suma: {numero ? numero.replace(/[^\d.]/g, "") : "0"}
        </Z>
      </div>

      {abierto === "formato" && (
        <PanelFormato
          cerrar={cerrar}
          pestanas={[
            [
              "Texto",
              <>
                {FILA_TEXTO}
                <Opcion valor="Arial ›">Fuente</Opcion>
                <Opcion valor="− 10 +">Tamaño</Opcion>
                <Opcion valor="›">Color del texto</Opcion>
              </>,
            ],
            [
              "Celda",
              <>
                <Opcion valor="›">Color de relleno</Opcion>
                <Opcion valor="›">Bordes</Opcion>
                <Opcion valor="⫷ ≡ ⫸">Alineación</Opcion>
                <Opcion valor="○">Ajustar texto</Opcion>
                <Opcion valor="○">Combinar celdas</Opcion>
                <Opcion valor="›">Formato condicional</Opcion>
              </>,
            ],
          ]}
        />
      )}
      {abierto === "insertar" && (
        <ListaSimple
          titulo="Insertar"
          cerrar={cerrar}
          items={["📊 Gráfico", "🖼 Imagen", "🔗 Enlace", "💬 Comentario", "Fila arriba / abajo", "Columna a la izquierda / derecha"]}
        />
      )}
      {abierto === "mas" && (
        <Capa cerrar={cerrar} tipo="menu">
          <Z zona="m-compartir" className={filaMenu} accion={cerrar}>
            Compartir y exportar ›
          </Z>
          <Z zona="m-buscar" className={filaMenu} accion={cerrar}>
            Buscar y reemplazar
          </Z>
          <Z zona="m-ordenar" className={filaMenu} accion={cerrar}>
            Ordenar rango
          </Z>
          <Z zona="m-filtro" className={filaMenu} accion={cerrar}>
            Crear un filtro
          </Z>
          <Z zona="m-detalles" className={filaMenu} accion={cerrar}>
            Detalles
          </Z>
          <span className="flex min-h-11 items-center px-4 text-[15px] text-slate-400">Ayuda y comentarios</span>
        </Capa>
      )}
    </Telefono>
  );
}
