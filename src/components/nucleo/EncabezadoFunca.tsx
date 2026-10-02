"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type ItemNav = {
  href: string;
  label: string;
  activo?: boolean;
  /** Si trae subsecciones se muestra como menú desplegable. */
  secciones?: { titulo?: string; items: { href: string; label: string; activo?: boolean }[] }[];
};

/**
 * Cabecera común de los tres roles, con el estilo de nueva.funca.edu.co: azul navy (para
 * diferenciarla del sitio público, que la tiene blanca), fija arriba, navegación en píldoras y la cuenta a la derecha. En celular la navegación pasa a
 * una fila que se desliza de lado.
 */
export default function EncabezadoFunca({
  etiqueta,
  inicioHref,
  nav = [],
  nombre,
  rol,
  onSalir,
  extra,
}: {
  /** Qué parte de la plataforma es ("Docente", "Coordinación", "Estudiante"). */
  etiqueta: string;
  inicioHref: string;
  nav?: ItemNav[];
  nombre?: string;
  rol?: string;
  onSalir: () => void;
  /** Enlaces adicionales junto a la cuenta (ej. "Ver como estudiante"). */
  extra?: ReactNode;
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
            <nav aria-label="Principal" className="hidden lg:flex items-center gap-0.5 min-w-0">
              {nav.map((item) => (
                <ItemNavegacion key={item.href} item={item} />
              ))}
            </nav>
          )}

          <Cuenta nombre={nombre} rol={rol} onSalir={onSalir} extra={extra} />
        </div>

        {nav.length > 0 && (
          <nav aria-label="Principal" className="lg:hidden -mx-4 px-4 pb-2 flex gap-1 overflow-x-auto">
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

  // En celular los menús se aplanan: cada subsección es una píldora más.
  if (!item.secciones) {
    return (
      <Link href={item.href} className={clasePildora(item.activo)} aria-current={item.activo ? "page" : undefined}>
        {item.label}
      </Link>
    );
  }
  if (compacto) {
    return (
      <>
        {item.secciones.flatMap((s) => s.items).map((s) => (
          <Link key={s.href} href={s.href} className={clasePildora(s.activo)} aria-current={s.activo ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setAbierto(false)}>
      <button
        type="button"
        className={clasePildora(item.activo)}
        aria-expanded={abierto}
        aria-haspopup="true"
        // Con mouse el hover ya lo abrió: el clic no debe cerrarlo. Se cierra al salir, con Esc o clic afuera.
        onClick={() => setAbierto(true)}
        onMouseEnter={() => setAbierto(true)}
      >
        {item.label}
        <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${abierto ? "rotate-180" : ""}`}>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div
            className={`rounded-2xl border border-blue-200 bg-white p-2 shadow-[0_20px_40px_-16px_rgba(30,46,85,0.35)] grid gap-x-2 gap-y-1 ${
              item.secciones.length > 1 ? "grid-cols-2 w-[30rem]" : "w-60"
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

function Cuenta({ nombre, rol, onSalir, extra }: { nombre?: string; rol?: string; onSalir: () => void; extra?: ReactNode }) {
  const inicial = (nombre ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      {extra}
      {nombre && (
        <span className="flex items-center gap-2" title={nombre}>
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gold-500 font-heading text-sm font-bold text-blue-900">
            {inicial}
          </span>
          <span className="hidden 2xl:block leading-tight">
            <span className="block text-sm font-semibold text-white max-w-40 truncate">{nombre}</span>
            {rol && <span className="block text-[11px] text-blue-200">{rol}</span>}
          </span>
        </span>
      )}
      <button onClick={onSalir} className="rounded-full px-3 py-1.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white">
        Salir
      </button>
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
