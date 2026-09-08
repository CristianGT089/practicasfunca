"use client";

import { useEffect, useRef, useState } from "react";
import type { SnapshotTurnero } from "@/lib/turnero/snapshot";

type Estado = {
  snapshot: SnapshotTurnero | null;
  conectado: boolean;
  finalizada: boolean;
};

/**
 * Se suscribe al stream SSE de una sesión de turnero y mantiene el último snapshot.
 * `EventSource` reconecta solo si se cae la red; si el servidor manda `event: fin`
 * (sesión cerrada o inexistente) se corta y se marca `finalizada`.
 */
export function useSnapshotTurnero(sesionId: string | null): Estado {
  const [snapshot, setSnapshot] = useState<SnapshotTurnero | null>(null);
  const [conectado, setConectado] = useState(false);
  const [finalizada, setFinalizada] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setSnapshot(null);
    setFinalizada(false);
    if (!sesionId) {
      setConectado(false);
      return;
    }

    const es = new EventSource(`/api/turnero/sesiones/${sesionId}/stream`);
    esRef.current = es;

    es.onopen = () => setConectado(true);
    es.onerror = () => setConectado(false);
    es.onmessage = (ev) => {
      try {
        setSnapshot(JSON.parse(ev.data) as SnapshotTurnero);
      } catch {
        /* ignora frames que no son JSON */
      }
    };
    es.addEventListener("fin", () => {
      setFinalizada(true);
      es.close();
      setConectado(false);
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sesionId]);

  return { snapshot, conectado, finalizada };
}
