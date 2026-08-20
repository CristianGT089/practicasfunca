"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/admin/calificaciones", label: "Calificaciones" },
  { href: "/admin/estudiantes", label: "Estudiantes" },
  { href: "/admin/medicamentos", label: "Medicamentos" },
  { href: "/admin/pacientes", label: "Pacientes" },
  { href: "/admin/escenarios", label: "Escenarios" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.usuario || data.usuario.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setVerificado(true);
      });
  }, [router]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!verificado) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Prácticas · Administración</span>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-blue-100 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const activo = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activo
                      ? "border-gold-600 text-blue-900"
                      : "border-transparent text-slate-500 hover:text-blue-800"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
