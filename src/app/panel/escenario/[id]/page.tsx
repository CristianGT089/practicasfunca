"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import FarmaciaSoftware from "./_modulos/farmacia/Software";
import EnfermeriaSoftware from "./_modulos/enfermeria/Software";
import PrimeraInfanciaSoftware from "./_modulos/primera-infancia/Software";

/**
 * Shell genérico: decide qué "software simulado" mostrar según el módulo del escenario.
 * Cada módulo tiene su propia pantalla (distinta herramienta real que un profesional de
 * esa área usaría), pero todas hablan con los mismos endpoints genéricos de intento
 * (acciones/finalizar/turno) — el motor de checklist, vidas y calificación es compartido.
 */
export default function EscenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: intentoId } = usePromise(params);
  const router = useRouter();
  const [moduloSlug, setModuloSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/intentos/${intentoId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelado && data) setModuloSlug(data.intento.escenario.modulo?.slug ?? "farmacia");
      });
    return () => {
      cancelado = true;
    };
  }, [intentoId, router]);

  if (!moduloSlug) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  if (moduloSlug === "enfermeria") return <EnfermeriaSoftware intentoId={intentoId} />;
  if (moduloSlug === "primera_infancia") return <PrimeraInfanciaSoftware intentoId={intentoId} />;
  return <FarmaciaSoftware intentoId={intentoId} />;
}
