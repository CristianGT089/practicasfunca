"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LECCIONES, leccionPorSlug } from "@/lib/clase/lecciones";
import { ProveedorProgreso } from "@/components/clase/progreso";
import Visor from "@/components/clase/Visor";

type Sesion = { id: string; leccion: string; diapositiva: number; maxima: number; llamado: number; reveladas: string[]; total: number };

const CADA_MS = 3000;

/**
 * Vista del estudiante. Con una clase en vivo sigue la diapositiva del docente; si se mueve por
 * su cuenta deja de seguirlo hasta que pulse «Ir con el profe» (o el docente llame a todos).
 * En una actividad no se le cambia la pantalla sola: se le avisa. Sin clase en vivo, la lección
 * queda para repasar libremente.
 */
export default function ClaseEstudiante() {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [terminada, setTerminada] = useState(false);
  const [slugLibre, setSlugLibre] = useState<string>(LECCIONES[0].slug);
  const [indice, setIndice] = useState(0);
  const [siguiendo, setSiguiendo] = useState(true);
  const [conexion, setConexion] = useState(true);
  const [listo, setListo] = useState(false);

  // Refs para el ciclo de consulta (evita reiniciar el intervalo en cada cambio).
  const estado = useRef({ indice: 0, siguiendo: true, sesionId: null as string | null, llamado: -1 });
  useEffect(() => {
    estado.current.indice = indice;
    estado.current.siguiendo = siguiendo;
  }, [indice, siguiendo]);

  const leccion = leccionPorSlug(sesion?.leccion ?? slugLibre) ?? LECCIONES[0];

  const aplicar = useCallback((s: Sesion | null, inicial = false) => {
    if (!s) {
      if (estado.current.sesionId) setTerminada(true);
      estado.current.sesionId = null;
      setSesion(null);
      return;
    }
    const nueva = estado.current.sesionId !== s.id;
    estado.current.sesionId = s.id;
    setSesion(s);
    setTerminada(false);
    const llamo = estado.current.llamado >= 0 && s.llamado > estado.current.llamado;
    estado.current.llamado = s.llamado;
    if (inicial || nueva || llamo) {
      setIndice(s.diapositiva);
      setSiguiendo(true);
      return;
    }
    if (estado.current.siguiendo && s.diapositiva !== estado.current.indice) {
      const d = leccionPorSlug(s.leccion)?.diapositivas[estado.current.indice];
      // Si está en medio de una actividad no se le quita la pantalla: verá el aviso.
      if (d?.tipo !== "actividad") setIndice(s.diapositiva);
    }
  }, []);

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("leccion");

    Promise.all([fetch("/api/auth/me").then((r) => r.json()), fetch("/api/clase/estado").then((r) => (r.ok ? r.json() : { sesion: null }))])
      .then(([me, est]) => {
        if (!me.usuario) {
          router.replace("/");
          return;
        }
        setNombre(me.usuario.nombre);
        if (pedida && leccionPorSlug(pedida)) setSlugLibre(pedida);
        if (est.sesion) aplicar(est.sesion, true);
        else {
          const slug = pedida && leccionPorSlug(pedida) ? pedida : LECCIONES[0].slug;
          try {
            const guardado = Number(localStorage.getItem(`clase-indice-${slug}`));
            if (Number.isInteger(guardado) && guardado > 0) setIndice(guardado);
          } catch {
            /* sin almacenamiento local */
          }
        }
        setListo(true);
      })
      .catch(() => setListo(true));
  }, [router, aplicar]);

  // Consulta periódica: avisa dónde va y recibe dónde va el profe. También detecta clases nuevas.
  useEffect(() => {
    if (!listo) return;
    const consultar = () =>
      fetch("/api/clase/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId: estado.current.sesionId, diapositiva: estado.current.indice, siguiendo: estado.current.siguiendo }),
      })
        .then((r) => {
          if (r.status === 401) router.replace("/");
          return r.ok ? r.json() : Promise.reject();
        })
        .then((d) => {
          setConexion(true);
          aplicar(d.sesion ?? null);
        })
        .catch(() => setConexion(false));
    const t = setInterval(consultar, CADA_MS);
    return () => clearInterval(t);
  }, [listo, aplicar, router]);

  // Sin clase en vivo, recuerda por dónde iba.
  useEffect(() => {
    if (sesion || !listo) return;
    try {
      localStorage.setItem(`clase-indice-${leccion.slug}`, String(indice));
    } catch {
      /* sin almacenamiento local */
    }
  }, [indice, sesion, listo, leccion.slug]);

  const ir = useCallback(
    (i: number) => {
      // En clase en vivo no se puede pasar de donde va el profe.
      // (el tope es la diapositiva más lejana a la que ha llegado, por si él retrocede a repasar).
      const tope = sesion ? sesion.maxima : leccion.diapositivas.length - 1;
      const destino = Math.max(0, Math.min(i, tope));
      setIndice(destino);
      if (sesion) setSiguiendo(destino === sesion.diapositiva);
    },
    [leccion.diapositivas.length, sesion]
  );

  if (!listo) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Cargando la clase…</div>;

  const atrasado = !!sesion && indice !== sesion.diapositiva;
  const aviso = !conexion ? (
    <div className="bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white">
      Sin conexión. Revisa el Wi-Fi: tu progreso está guardado y la clase sigue al reconectar.
    </div>
  ) : terminada ? (
    <div className="bg-blue-100 px-4 py-2 text-center text-sm font-semibold text-blue-900">La clase en vivo terminó. Puedes seguir repasando a tu ritmo.</div>
  ) : atrasado ? (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-gold-100 px-4 py-2 text-sm text-blue-950">
      <span>
        {siguiendo ? "El profe avanzó a la diapositiva" : "Vas por tu cuenta. El profe está en la diapositiva"} <b>{sesion!.diapositiva + 1}</b>.
      </span>
      <button onClick={() => (setIndice(sesion!.diapositiva), setSiguiendo(true))} className="btn-cta !py-1.5">
        Ir con el profe →
      </button>
    </div>
  ) : null;

  return (
    <ProveedorProgreso leccion={leccion.slug} reveladas={sesion ? sesion.reveladas : null}>
      <Visor
        leccion={leccion}
        indice={indice}
        onIr={ir}
        aviso={aviso}
        marcada={sesion?.diapositiva ?? null}
        limite={sesion?.maxima ?? null}
        arriba={
          <>
            {sesion ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${conexion ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                {siguiendo && !atrasado ? "Siguiendo al profe" : "En vivo"}
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Modo repaso</span>
            )}
            {nombre && <span className="hidden text-sm text-blue-100 md:inline">{nombre}</span>}
            <button onClick={() => router.push("/panel")} className="rounded-full px-2.5 py-1 text-xs font-semibold text-blue-100 hover:bg-white/10">
              Salir
            </button>
          </>
        }
      />
    </ProveedorProgreso>
  );
}
