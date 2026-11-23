"use client";

import { dispositivoActual } from "@/lib/clase/dispositivo";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import type { Leccion } from "@/lib/clase/tipos";
import { requisitoPendiente } from "@/lib/clase/requisitos";
import { ContextoRecorrido, ProveedorProgreso, useProgresos } from "@/components/clase/progreso";
import Visor, { BotonSalir } from "@/components/clase/Visor";

type Recorrido = {
  id: string;
  leccion: string;
  diapositiva: number;
  maxima: number;
  terminadoEn: string | null;
  mensaje: string | null;
  docente: string;
};

/**
 * Clase a tu ritmo (para quien no pudo venir): la lección con la explicación del profe en cada
 * diapositiva, en orden y sin clase en vivo. Las preguntas se responden para seguir; si pasa una
 * actividad sin terminarla se le avisa que le llega al profe como pendiente. Al final envía el
 * reporte.
 */
export default function ClaseARitmo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clase/ritmo/${id}`)
      .then((r) => {
        if (r.status === 401) router.replace("/");
        return r.json().then((d) => ({ ok: r.ok, d }));
      })
      .then(({ ok, d }) => {
        if (!ok) return setError(d.error ?? "No se pudo abrir la clase");
        setNombre(d.nombre);
        setRecorrido(d.recorrido);
      })
      .catch(() => setError("Sin conexión. Revisa el Wi-Fi y recarga la página."));
  }, [id, router]);

  const leccion = recorrido ? leccionPorSlug(recorrido.leccion, "ritmo") : null;

  if (error || (recorrido && !leccion))
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-blue-900">{error ?? "Lección no encontrada"}</p>
          <button onClick={() => router.push("/panel")} className="btn-primario mt-4">
            Volver al panel
          </button>
        </div>
      </div>
    );
  if (!recorrido || !leccion) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Cargando la clase…</div>;

  return (
    <ProveedorProgreso leccion={leccion.slug} recorrido={recorrido.id}>
      <Recorrer leccion={leccion} inicial={recorrido} nombre={nombre} />
    </ProveedorProgreso>
  );
}

function Recorrer({ leccion, inicial, nombre }: { leccion: Leccion; inicial: Recorrido; nombre: string }) {
  const router = useRouter();
  const { progresos, cargado } = useProgresos();
  const total = leccion.diapositivas.length;
  const [indice, setIndice] = useState(Math.min(inicial.diapositiva, total - 1));
  const [maxima, setMaxima] = useState(Math.min(inicial.maxima, total - 1));
  const [terminadoEn, setTerminadoEn] = useState(inicial.terminadoEn);
  // Actividad sin terminar que quiere pasar: se le pregunta una vez por actividad.
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [aceptadas, setAceptadas] = useState<Set<string>>(new Set());
  const [verMensaje, setVerMensaje] = useState(!!inicial.mensaje && inicial.maxima === 0);
  const [conexion, setConexion] = useState(true);
  const envio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const d = leccion.diapositivas[indice];
  // Lo obligatorio (responder la pregunta, el Nivel 1 de mecanografía) bloquea «Siguiente».
  const falta = cargado && (d.tipo === "pregunta" || d.tipo === "actividad") ? requisitoPendiente(d, progresos[d.id]) : null;
  const limite = falta ? indice : Math.min(maxima + 1, total - 1);

  const guardarPosicion = useCallback(
    (i: number) => {
      if (envio.current) clearTimeout(envio.current);
      envio.current = setTimeout(() => {
        fetch(`/api/clase/ritmo/${inicial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diapositiva: i, dispositivo: dispositivoActual() }),
          keepalive: true,
        })
          .then((r) => setConexion(r.ok))
          .catch(() => setConexion(false));
      }, 300);
    },
    [inicial.id]
  );

  const mover = useCallback(
    (destino: number) => {
      setConfirmar(null);
      setIndice(destino);
      setMaxima((m) => Math.max(m, destino));
      guardarPosicion(destino);
    },
    [guardarPosicion]
  );

  const ir = useCallback(
    (i: number) => {
      const destino = Math.max(0, Math.min(i, limite));
      if (destino === indice) return;
      // Al avanzar desde una actividad sin terminar, se avisa antes (una vez por actividad).
      if (destino > indice && !falta && d.tipo === "actividad" && !progresos[d.id]?.completado && !aceptadas.has(d.id)) {
        setConfirmar(destino);
        return;
      }
      mover(destino);
    },
    [limite, indice, d, falta, progresos, aceptadas, mover]
  );

  async function terminar() {
    const r = await fetch(`/api/clase/ritmo/${inicial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminar: true }),
    }).catch(() => null);
    if (!r?.ok) return false;
    const datos = await r.json();
    setTerminadoEn(datos.terminadoEn);
    return true;
  }

  const aviso = !conexion ? (
    <div className="bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white">
      Sin conexión. Revisa el Wi-Fi: lo que hiciste está guardado y sigues donde ibas al reconectar.
    </div>
  ) : confirmar !== null && d.tipo === "actividad" ? (
    <div className="flex max-h-[40dvh] flex-wrap items-center justify-center gap-2 overflow-y-auto bg-gold-100 px-3 py-2 text-sm text-blue-950 sm:gap-3 sm:px-4 sm:py-3">
      <span>
        Aún no terminas <b>«{d.titulo}»</b>. Si sigues, al profe le llega como pendiente (puedes volver después).
      </span>
      <button onClick={() => setConfirmar(null)} className="btn-cta !py-1.5 pointer-coarse:min-h-10">
        Seguir intentando
      </button>
      <button
        onClick={() => {
          setAceptadas((s) => new Set(s).add(d.id));
          mover(confirmar);
        }}
        className="btn-suave !py-1.5 pointer-coarse:min-h-10"
      >
        Continuar de todas formas
      </button>
    </div>
  ) : verMensaje && inicial.mensaje ? (
    <div className="flex items-start justify-center gap-2 bg-blue-50 px-3 py-2 text-blue-950 sm:gap-3 sm:px-4 sm:py-3">
      {/* Un mensaje largo no tapa la diapositiva: se lee con scroll. */}
      <div className="max-h-[35dvh] min-w-0 max-w-3xl flex-1 overflow-y-auto sm:flex-none">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Mensaje de {inicial.docente}</p>
        <p className="whitespace-pre-line break-words">{inicial.mensaje}</p>
      </div>
      <button
        onClick={() => setVerMensaje(false)}
        className="grid min-h-8 min-w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-blue-100 pointer-coarse:min-h-10 pointer-coarse:min-w-10"
        aria-label="Cerrar mensaje"
      >
        ✕
      </button>
    </div>
  ) : null;

  return (
    <ContextoRecorrido.Provider value={{ leccion, terminadoEn, terminar, ir: mover }}>
      <Visor
        leccion={leccion}
        indice={indice}
        onIr={ir}
        modo="ritmo"
        limite={limite}
        motivoLimite={falta ?? "Ve en orden: pasa por esta diapositiva primero"}
        aviso={aviso}
        arriba={
          <>
            {terminadoEn ? (
              <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                ✓ <span className="hidden min-[400px]:inline">Reporte </span>enviado
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">A tu ritmo</span>
            )}
            {inicial.mensaje && (
              <button
                onClick={() => setVerMensaje((v) => !v)}
                aria-label="Mensaje del profe"
                aria-expanded={verMensaje}
                className="inline-flex min-h-8 min-w-8 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold text-blue-100 hover:bg-white/10 sm:px-2.5 pointer-coarse:min-h-10 pointer-coarse:min-w-10"
              >
                <span aria-hidden>📨</span>
                <span className="hidden sm:inline">Mensaje del profe</span>
              </button>
            )}
            {nombre && <span className="hidden text-sm text-blue-100 md:inline">{nombre}</span>}
            <BotonSalir onClick={() => router.push("/panel")} />
          </>
        }
      />
    </ContextoRecorrido.Provider>
  );
}
