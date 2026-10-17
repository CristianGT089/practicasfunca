"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import CambiarPassword from "@/components/nucleo/CambiarPassword";

export type ItemNav = {
  href: string;
  label: string;
  activo?: boolean;
  /** Si trae subsecciones se muestra como menú desplegable. */
  secciones?: { titulo?: string; items: { href: string; label: string; activo?: boolean }[] }[];
};

/**
 * Cabecera común de los tres roles, con el estilo de nueva.funca.edu.co: azul navy (para
 * diferenciarla del sitio público, que la tiene blanca), fija arriba, navegación en píldoras y la cuenta a la derecha. En pantallas
 * medianas y celulares la navegación pasa a una segunda fila (que se parte en dos si no cabe) con las mismas entradas y
 * los mismos desplegables: nunca se aplanan, así el menú se mantiene corto.
 */
export default function EncabezadoFunca({
  etiqueta,
  inicioHref,
  nav = [],
  nombre,
  rol,
  onSalir,
  enlacesCuenta = [],
}: {
  /** Qué parte de la plataforma es ("Docente", "Coordinación", "Estudiante"). */
  etiqueta: string;
  inicioHref: string;
  nav?: ItemNav[];
  nombre?: string;
  rol?: string;
  onSalir: () => void;
  /** Enlaces del menú de la cuenta (ej. "Vista estudiante"). */
  enlacesCuenta?: { href: string; label: string }[];
}) {
  return (
    <header className="sticky top-0 z-40 bg-blue-900 border-b border-blue-950 shadow-[0_8px_24px_-14px_rgba(19,28,55,0.6)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link href={inicioHref} className="flex items-center gap-3 shrink-0" aria-label="Ir al inicio">
            <Image src="/funca-logo-blanco.png" alt="FUNCA" width={800} height={157} priority className="h-7 sm:h-8 w-auto" />
            <span className="hidden sm:block h-6 w-px bg-white/20" aria-hidden />
            <span className="hidden sm:block leading-tight">
              <span className="block font-heading text-sm font-bold text-white">Prácticas</span>
              <span className="block text-[11px] text-gold-400">{etiqueta}</span>
            </span>
          </Link>

          {nav.length > 0 && (
            <nav aria-label="Principal" className="hidden lg:flex items-center gap-0.5 shrink-0">
              {nav.map((item) => (
                <ItemNavegacion key={item.href} item={item} />
              ))}
            </nav>
          )}

          <Cuenta nombre={nombre} rol={rol} onSalir={onSalir} enlaces={enlacesCuenta} />
        </div>

        {nav.length > 0 && (
          <nav
            aria-label="Principal"
            className="lg:hidden pb-2 flex flex-wrap gap-1"
          >
            {nav.map((item) => (
              <ItemNavegacion key={item.href} item={item} compacto />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

const clasePildora = (activo?: boolean) =>
  `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium font-heading transition-colors ${
    activo ? "bg-white text-blue-900" : "text-blue-100 hover:bg-white/10 hover:text-white"
  }`;

function ItemNavegacion({ item, compacto = false }: { item: ItemNav; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    const alDesplazar = () => setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  // Posición del panel en la fila compacta: fijo bajo el botón, a lo ancho de la pantalla en
  // celular (un panel pegado al botón se saldría por el borde).
  const [arriba, setArriba] = useState(0);

  if (!item.secciones) {
    return (
      <Link href={item.href} className={clasePildora(item.activo)} aria-current={item.activo ? "page" : undefined}>
        {item.label}
      </Link>
    );
  }

  return (
    <div ref={ref} className={compacto ? "shrink-0" : "relative"} onMouseLeave={compacto ? undefined : () => setAbierto(false)}>
      <button
        type="button"
        className={clasePildora(item.activo)}
        aria-expanded={abierto}
        aria-haspopup="true"
        // Con mouse el hover ya lo abrió: el clic no debe cerrarlo. Se cierra al salir, con Esc o
        // clic afuera. En la fila compacta (táctil) el toque abre y cierra.
        onClick={(e) => {
          if (compacto) {
            setArriba(e.currentTarget.getBoundingClientRect().bottom + 8);
            setAbierto((v) => !v);
          } else setAbierto(true);
        }}
        onMouseEnter={compacto ? undefined : () => setAbierto(true)}
      >
        {item.label}
        <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${abierto ? "rotate-180" : ""}`}>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {abierto && (
        <div className={compacto ? "fixed inset-x-3 z-50 sm:left-auto sm:right-4 sm:w-[30rem]" : "absolute right-0 top-full pt-2 z-50"} style={compacto ? { top: arriba } : undefined}>
          <div
            className={`rounded-2xl border border-blue-200 bg-white p-2 shadow-[0_20px_40px_-16px_rgba(30,46,85,0.35)] grid gap-x-2 gap-y-1 ${
              compacto
                ? `max-h-[70vh] overflow-y-auto ${item.secciones.length > 1 ? "sm:grid-cols-2" : ""}`
                : item.secciones.length > 1
                  ? "grid-cols-2 w-[30rem]"
                  : "w-60"
            }`}
          >
            {item.secciones.map((s, i) => (
              <div key={i}>
                {s.titulo && <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.titulo}</p>}
                {s.items.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setAbierto(false)}
                    aria-current={sub.activo ? "page" : undefined}
                    className={`block rounded-xl px-3 py-2 text-sm ${
                      sub.activo ? "bg-blue-100 font-semibold text-blue-800" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                    }`}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * La cuenta: solo el avatar en la barra (no compite por espacio con el menú). Al tocarlo se
 * abre el nombre, el rol, los enlaces de la cuenta, Cambiar contraseña y Salir.
 */
function Cuenta({
  nombre,
  rol,
  onSalir,
  enlaces,
}: {
  nombre?: string;
  rol?: string;
  onSalir: () => void;
  enlaces: { href: string; label: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inicial = (nombre ?? "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={`Cuenta de ${nombre ?? "usuario"}`}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 text-blue-100 hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gold-500 font-heading text-sm font-bold text-blue-900">
          {inicial}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${abierto ? "rotate-180" : ""}`}>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-blue-200 bg-white p-2 shadow-[0_20px_40px_-16px_rgba(30,46,85,0.35)]">
          {nombre && (
            <div className="px-3 pt-2 pb-2 border-b border-blue-100 mb-1">
              <p className="text-sm font-semibold text-blue-900 truncate">{nombre}</p>
              {rol && <p className="text-xs text-slate-500">{rol}</p>}
            </div>
          )}
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} onClick={() => setAbierto(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800">
              {e.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              setCambiandoPassword(true);
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800"
          >
            Cambiar contraseña
          </button>
          <button type="button" onClick={onSalir} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
            Salir
          </button>
        </div>
      )}
      {cambiandoPassword && <CambiarPassword onCerrar={() => setCambiandoPassword(false)} />}
    </div>
  );
}

/**
 * Barra de las pantallas de trabajo (consultorio, dictado, dispensación, catálogo): la misma
 * cabecera azul, pero compacta, con qué pantalla es y las acciones a la derecha.
 */
export function BarraTrabajo({
  titulo,
  subtitulo,
  ancho = "max-w-6xl",
  children,
}: {
  titulo: string;
  subtitulo?: string | null;
  ancho?: string;
  children?: ReactNode;
}) {
  return (
    <header className="bg-blue-900 border-b border-blue-950 px-4 sm:px-6">
      <div className={`mx-auto ${ancho} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5`}>
        <div className="flex items-center gap-3 min-w-0">
          <Image src="/funca-logo-blanco.png" alt="FUNCA" width={800} height={157} className="h-6 sm:h-7 w-auto shrink-0" />
          <span className="h-6 w-px bg-white/20 shrink-0" aria-hidden />
          <span className="leading-tight min-w-0">
            <span className="block font-heading text-sm font-bold text-white truncate">{titulo}</span>
            {subtitulo && <span className="block text-[11px] text-blue-200 truncate">{subtitulo}</span>}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-blue-100">{children}</div>
      </div>
    </header>
  );
}

/** Enlace/botón discreto para la barra de trabajo. */
export const claseAccionBarra = "rounded-full px-3 py-1.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white";
