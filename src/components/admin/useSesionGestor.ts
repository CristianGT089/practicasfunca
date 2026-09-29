"use client";

import { useEffect, useState } from "react";

export type SesionGestor = { id: string; nombre: string; rol: "ADMIN" | "DOCENTE"; slugs: string[] };

/** Quién está en /admin (coordinación o docente) y qué módulos gestiona. */
export function useSesionGestor(): SesionGestor | null {
  const [sesion, setSesion] = useState<SesionGestor | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d.usuario) return;
        setSesion({
          id: d.usuario.id,
          nombre: d.usuario.nombre,
          rol: d.usuario.rol,
          slugs: (d.modulos ?? []).map((m: { slug: string }) => m.slug),
        });
      });
    return () => {
      vivo = false;
    };
  }, []);
  return sesion;
}
