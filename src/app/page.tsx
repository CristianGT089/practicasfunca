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
    router.push(data.rol === "ADMIN" ? "/admin" : "/panel");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-900 px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="flex justify-center mb-5">
          <Image src="/funca-logo.png" alt="FUNCA" width={140} height={70} priority className="h-auto w-32" />
        </div>
        <h1 className="text-center font-heading text-lg font-bold text-blue-900">FUNCA Prácticas</h1>
        <p className="text-center text-sm text-slate-500 mb-6">Simulador de Auxiliar en Farmacia</p>

        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoFocus
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
        <input
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-blue-800 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 transition-colors disabled:opacity-60"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="text-center text-xs text-slate-400 mt-6">
          Fundación Escuela de Capacitación Colombia
        </p>
      </form>
    </div>
  );
}
