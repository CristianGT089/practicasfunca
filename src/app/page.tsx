"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/** Buenos días / tardes / noches según la hora del equipo (en el servidor no hay hora: vacío). */
function saludoDeAhora() {
  const h = new Date().getHours();
  return h < 12 ? "¡Buenos días!" : h < 19 ? "¡Buenas tardes!" : "¡Buenas noches!";
}
const sinSuscripcion = () => () => {};

function IconoUsuario() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}
function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <path d="M4 20 20 4" />}
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tarjeta = useRef<HTMLFormElement>(null);
  const [cargando, setCargando] = useState(false);
  const saludo = useSyncExternalStore(sinSuscripcion, saludoDeAhora, () => "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    if (!res.ok) {
      setCargando(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión");
      // Una sacudida suave, como quien dice «no»; se repite en cada intento fallido.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        tarjeta.current?.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }],
          { duration: 450, easing: "ease-in-out" },
        );
      document.getElementById("password")?.focus();
      return;
    }
    const data = await res.json();
    // Los puestos temporales (sala de cómputo) entran derecho a su herramienta, sin panel.
    router.push(data.rutaDirecta || (data.rol === "ADMIN" || data.rol === "DOCENTE" ? "/admin" : "/panel"));
  }

  /** Bloq Mayús: el navegador lo dice en cada tecla. */
  const revisarMayusculas = (e: React.KeyboardEvent) => setMayusculas(e.getModifierState?.("CapsLock") ?? false);

  const campo =
    "w-full rounded-2xl border border-blue-200 bg-blue-50/50 py-3 pl-11 text-base transition-colors short:py-2.5 sm:text-sm focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/30";

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-[var(--background)]">
      {/* Portada, como la del sitio de FUNCA */}
      <section className="relative overflow-hidden bg-blue-900 text-white px-6 py-8 sm:px-12 lg:py-10 flex flex-col justify-between gap-6 lg:gap-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-700/60 blur-3xl" />
        <div aria-hidden className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl" />
        {/* El pulso de la salud: un electrocardiograma que se dibuja solo. */}
        <svg aria-hidden viewBox="0 0 600 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-16 hidden h-24 w-full opacity-60 lg:block">
          <path
            d="M0 60 H170 L190 60 L205 38 L220 60 L240 60 L255 10 L275 108 L292 60 L330 60 L345 48 L362 60 H600"
            pathLength={1}
            fill="none"
            stroke="#FBBA00"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            className="ingreso-anima animate-[ingreso-ecg_3.2s_ease-in-out_infinite]"
          />
        </svg>
        <div className="relative">
          <Image src="/funca-logo-blanco.png" alt="FUNCA" width={800} height={157} priority className="h-10 sm:h-12 w-auto" />
        </div>
        <div className="relative max-w-lg">
          <p className="inline-flex rounded-full border border-gold-500/60 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
            ✦ Ambientes de simulación reales
          </p>
          <h1 className="mt-4 font-heading text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight short:text-3xl">
            Practica como en tu trabajo real
          </h1>
          <p className="mt-3 text-blue-200 text-lg short:text-base">
            Casos virtuales, jornadas presenciales y dictados para practicar lo que aprendes en tu programa, paso a paso y con retroalimentación.
          </p>
          <ul className="mt-5 hidden sm:flex short:hidden flex-col gap-2 text-sm text-blue-100">
            {["Se califica solo y ves en qué fallaste", "Tu docente sigue tu avance en vivo", "Descarga tu informe para Q10"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden className="text-gold-400">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-blue-300">Fundación Escuela de Capacitación Colombia · desde 1994</p>
      </section>

      {/* Ingreso */}
      <section className="flex items-center justify-center px-4 py-8 sm:px-8 short:py-4">
        <form
          ref={tarjeta}
          onSubmit={onSubmit}
          className="ingreso-anima tarjeta w-full max-w-sm p-7 sm:p-8 short:py-6 shadow-[0_24px_60px_-30px_rgba(30,46,85,0.45)] animate-[ingreso-aparecer_0.5s_ease-out]"
        >
          <p className="eyebrow">Plataforma de prácticas</p>
          <h2 className="mt-2 font-heading text-2xl short:text-xl font-extrabold text-blue-900">
            {saludo && <span className="block text-base font-bold text-gold-600">{saludo} 👋</span>}
            Ingresa a tu cuenta
          </h2>
          <p className="mt-1 mb-6 short:mb-4 text-sm text-slate-500">Usa el usuario y la contraseña que te dio tu docente.</p>

          <label htmlFor="usuario" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Usuario
          </label>
          <div className="relative mb-4 short:mb-3 text-slate-400 focus-within:text-blue-700">
            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center">
              <IconoUsuario />
            </span>
            <input
              id="usuario"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`${campo} pr-4 text-slate-900`}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              onKeyDown={revisarMayusculas}
              autoFocus
            />
          </div>

          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Contraseña
          </label>
          <div className="relative text-slate-400 focus-within:text-blue-700">
            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center">
              <IconoCandado />
            </span>
            <input
              id="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`${campo} pr-12 text-slate-900`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={revisarMayusculas}
              onKeyUp={revisarMayusculas}
              onBlur={() => setMayusculas(false)}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"}
              aria-pressed={verPassword}
              aria-controls="password"
              title={verPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"}
              className="absolute inset-y-0 right-1.5 my-auto grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <IconoOjo tachado={verPassword} />
            </button>
          </div>
          <div className="mb-5 mt-1.5 min-h-5 short:mb-4" aria-live="polite">
            {mayusculas && <p className="text-xs font-semibold text-amber-700">⇪ Tienes activadas las mayúsculas (Bloq Mayús).</p>}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <button type="submit" disabled={cargando || !usuario || !password} className="btn-cta w-full py-3">
            {cargando ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-blue-900/30 border-t-blue-900" />
                Ingresando…
              </span>
            ) : (
              "Ingresar"
            )}
          </button>
          <p className="mt-5 short:mt-3 text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Pídele a tu docente una nueva.</p>
        </form>
      </section>
    </div>
  );
}
