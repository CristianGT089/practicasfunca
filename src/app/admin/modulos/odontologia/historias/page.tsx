"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type IntentoFila = {
  id: string;
  estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
  modo: "FACIL" | "DIFICIL";
  iniciadoEn: string;
  finalizadoEn: string | null;
  puntajeFinal: number | null;
  usuario: { nombre: string; usuario: string };
  escenario: { titulo: string };
};

const ESTADOS: Record<IntentoFila["estado"], string> = {
  EN_PROGRESO: "En progreso",
  COMPLETADO: "Cerrada",
  PERDIDO: "Sin corazones",
};

/** Historias clínicas que han diligenciado los estudiantes, para que el docente las lea completas. */
export default function HistoriasOdontologiaPage() {
  const [intentos, setIntentos] = useState<IntentoFila[] | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/api/modulos/odontologia/admin/historias")
      .then((r) => r.json())
      .then((d) => setIntentos(d.intentos ?? []));
  }, []);

  const q = filtro.trim().toLowerCase();
  const visibles = (intentos ?? []).filter(
    (i) => !q || i.usuario.nombre.toLowerCase().includes(q) || i.usuario.usuario.toLowerCase().includes(q) || i.escenario.titulo.toLowerCase().includes(q)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-2">Historias diligenciadas</h1>
      <p className="text-sm text-slate-500 mb-4">
        La nota automática cubre el odontograma, la alerta, los antecedentes, los exámenes, la placa y la remisión. Aquí puedes leer también lo
        que no se califica solo: diagnóstico, pronóstico, plan de tratamiento y evolución.
      </p>
      <input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar por estudiante o caso"
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {intentos === null && <p className="text-slate-500 text-sm">Cargando...</p>}
      {intentos && visibles.length === 0 && <p className="text-slate-500 text-sm">No hay historias todavía.</p>}
      <div className="flex flex-col gap-2">
        {visibles.map((i) => (
          <Link
            key={i.id}
            href={`/admin/modulos/odontologia/historias/${i.id}`}
            className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm flex items-center justify-between gap-3 hover:border-cyan-400"
          >
            <div>
              <p className="font-medium text-slate-800">
                {i.usuario.nombre} <span className="text-slate-400 font-normal">@{i.usuario.usuario}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {i.escenario.titulo} · {i.modo === "DIFICIL" ? "difícil" : "fácil"} · {new Date(i.iniciadoEn).toLocaleString("es-CO")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">{ESTADOS[i.estado]}</p>
              {i.puntajeFinal !== null && <p className="font-heading font-bold text-cyan-700">{Math.round(i.puntajeFinal)}/100</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
