"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Progreso = { datos: unknown; completado: boolean };

type Ctx = {
  progresos: Record<string, Progreso>;
  cargado: boolean;
  guardar: (actividad: string, datos: unknown, completado?: boolean) => void;
  /** Preguntas reveladas por el docente en la clase en vivo; null = modo repaso (sin clase). */
  reveladas: string[] | null;
  /** Solo en el presentador: revela u oculta la respuesta de una pregunta. */
  revelar?: (pregunta: string, mostrar: boolean) => void;
};

const ContextoProgreso = createContext<Ctx>({ progresos: {}, cargado: false, guardar: () => {}, reveladas: null });

/**
 * Progreso del usuario en las actividades de una lección. Se guarda en el servidor a cada cambio
 * (con un pequeño retraso para agrupar clics seguidos), así que si se desconecta lo retoma.
 */
export function ProveedorProgreso({
  leccion,
  children,
  reveladas = null,
  revelar,
}: {
  leccion: string;
  children: ReactNode;
  reveladas?: string[] | null;
  revelar?: (pregunta: string, mostrar: boolean) => void;
}) {
  const [progresos, setProgresos] = useState<Record<string, Progreso>>({});
  const [cargado, setCargado] = useState(false);
  const pendientes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    fetch(`/api/clase/progreso?leccion=${encodeURIComponent(leccion)}`)
      .then((r) => (r.ok ? r.json() : { progresos: {} }))
      .then((d) => setProgresos(d.progresos ?? {}))
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [leccion]);

  const guardar = useCallback(
    (actividad: string, datos: unknown, completado = false) => {
      setProgresos((p) => ({ ...p, [actividad]: { datos, completado: completado || !!p[actividad]?.completado } }));
      const previo = pendientes.current.get(actividad);
      if (previo) clearTimeout(previo);
      pendientes.current.set(
        actividad,
        setTimeout(() => {
          pendientes.current.delete(actividad);
          fetch("/api/clase/progreso", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leccion, actividad, datos, completado }),
            keepalive: true,
          }).catch(() => {});
        }, 400)
      );
    },
    [leccion]
  );

  return <ContextoProgreso.Provider value={{ progresos, cargado, guardar, reveladas, revelar }}>{children}</ContextoProgreso.Provider>;
}

/** Todo el progreso de la lección (para saber qué falta antes de avanzar o al terminar). */
export function useProgresos() {
  const { progresos, cargado } = useContext(ContextoProgreso);
  return { progresos, cargado };
}

/** Clase a tu ritmo: lo que necesita la diapositiva final para mostrar el resumen y enviarlo. */
export type CtxRecorrido = {
  leccion: import("@/lib/clase/tipos").Leccion;
  terminadoEn: string | null;
  terminar: () => Promise<boolean>;
  ir: (i: number) => void;
};
export const ContextoRecorrido = createContext<CtxRecorrido | null>(null);

export function useRevelacion() {
  const { reveladas, revelar } = useContext(ContextoProgreso);
  return { reveladas, revelar };
}

export function useProgreso<T>(actividad: string) {
  const { progresos, cargado, guardar } = useContext(ContextoProgreso);
  const p = progresos[actividad];
  return {
    datos: (p?.datos ?? null) as T | null,
    completado: !!p?.completado,
    cargado,
    guardar: (datos: T, completado?: boolean) => guardar(actividad, datos, completado),
  };
}
