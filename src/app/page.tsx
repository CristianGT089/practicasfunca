"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    setCargando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión");
      return;
    }
    const data = await res.json();
    // Los puestos temporales (sala de cómputo) entran derecho a su herramienta, sin panel.
    router.push(data.rutaDirecta || (data.rol === "ADMIN" || data.rol === "DOCENTE" ? "/admin" : "/panel"));
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[var(--background)]">
      {/* Portada, como la del sitio de FUNCA */}
      <section className="relative overflow-hidden bg-blue-900 text-white px-6 py-10 sm:px-12 lg:py-16 flex flex-col justify-between gap-10">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-700/60 blur-3xl" />
        <div aria-hidden className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex rounded-xl bg-white px-3 py-2">
            <Image src="/funca-logo-recortado.png" alt="FUNCA" width={144} height={26} priority className="h-6 w-auto" />
          </span>
        </div>
        <div className="relative max-w-lg">
          <p className="inline-flex rounded-full border border-gold-500/60 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
            ✦ Ambientes de simulación reales
          </p>
          <h1 className="mt-4 font-heading text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
            Practica como en tu trabajo real
          </h1>
          <p className="mt-4 text-blue-200 text-lg">
            Casos virtuales, jornadas presenciales y dictados de farmacia, dispensación y salud oral.
          </p>
          <ul className="mt-6 hidden sm:flex flex-col gap-2 text-sm text-blue-100">
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
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <form onSubmit={onSubmit} className="tarjeta w-full max-w-sm p-7 sm:p-9 shadow-[0_24px_60px_-30px_rgba(30,46,85,0.45)]">
          <p className="eyebrow">Plataforma de prácticas</p>
          <h2 className="mt-2 font-heading text-2xl font-extrabold text-blue-900">Ingresa a tu cuenta</h2>
          <p className="mt-1 mb-6 text-sm text-slate-500">Usa el usuario y la contraseña que te dio tu docente.</p>

          <label htmlFor="usuario" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Usuario
          </label>
          <input
            id="usuario"
            autoComplete="username"
            className="w-full rounded-2xl border border-blue-200 bg-blue-50/50 px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
          />

          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-blue-200 bg-blue-50/50 px-4 py-3 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <button type="submit" disabled={cargando || !usuario || !password} className="btn-cta w-full py-3">
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
          <p className="mt-5 text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Pídele a tu docente una nueva.</p>
        </form>
      </section>
    </div>
  );
}
