"use client";

import { DISPOSITIVOS } from "@/lib/clase/dispositivo";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { actividadesDe } from "@/lib/clase/tipos";
import { ProveedorProgreso } from "@/components/clase/progreso";
import Visor, { tituloDiapositiva } from "@/components/clase/Visor";

type Sesion = {
  id: string;
  leccion: string;
  diapositiva: number;
  llamado: number;
  reveladas: string[];
  activa: boolean;
  grupo: string | null;
  total: number;
};
type Participante = {
  id: string;
  nombre: string;
  usuario: string;
  conectado: boolean;
  vino: boolean;
  diapositiva: number | null;
  siguiendo: boolean;
  dispositivo: string | null;
  completadas: string[];
  empezadas: string[];
};

/**
 * Modo presentador (pantalla completa, sin la barra de admin): lo que se proyecta. Mover la
 * diapositiva aquí la mueve a todos los que siguen al profe. El panel de progreso es solo para
 * el docente y va en orden alfabético.
 */
export default function Presentador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [panel, setPanel] = useState(false);
  const [notas, setNotas] = useState(false);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [zoom, setZoom] = useState(1);
  const [llamando, setLlamando] = useState(false);
  const envio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let zGuardado = 1;
    try {
      const z = Number(localStorage.getItem("clase-zoom"));
      if (z >= 0.7 && z <= 2) zGuardado = z;
    } catch {
      /* sin almacenamiento local */
    }
    fetch(`/api/admin/clase/${id}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return setError(d.error ?? "No se pudo abrir la clase");
        setZoom(zGuardado);
        setSesion(d.sesion);
        setIndice(d.sesion.diapositiva);
      })
      .catch(() => setError("Sin conexión"));
  }, [id]);

  // Progreso del grupo cada 5 s mientras el panel esté abierto (y uno al abrirlo).
  useEffect(() => {
    if (!panel) return;
    const cargar = () =>
      fetch(`/api/admin/clase/${id}?participantes=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setParticipantes(d.participantes ?? []))
        .catch(() => {});
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [panel, id]);

  const ir = useCallback(
    (i: number) => {
      if (!sesion) return;
      const destino = Math.max(0, Math.min(i, sesion.total - 1));
      setIndice(destino);
      // Si pasa varias seguidas, solo se envía la última.
      if (envio.current) clearTimeout(envio.current);
      envio.current = setTimeout(() => {
        fetch(`/api/admin/clase/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diapositiva: destino }),
        }).catch(() => {});
      }, 150);
    },
    [id, sesion]
  );

  function revelar(pregunta: string, mostrar: boolean) {
    setSesion((s) => (s ? { ...s, reveladas: mostrar ? [...s.reveladas.filter((r) => r !== pregunta), pregunta] : s.reveladas.filter((r) => r !== pregunta) } : s));
    fetch(`/api/admin/clase/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revelar: pregunta, mostrar }),
    }).catch(() => {});
  }

  async function traerATodos() {
    setLlamando(true);
    await fetch(`/api/admin/clase/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diapositiva: indice, llamar: true }),
    }).catch(() => {});
    setTimeout(() => setLlamando(false), 1500);
  }

  async function terminar() {
    if (!window.confirm("¿Terminar la clase en vivo? Los estudiantes podrán seguir repasando por su cuenta.")) return;
    await fetch(`/api/admin/clase/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cerrar: true }),
    });
    router.push("/admin/clase");
  }

  function cambiarZoom(delta: number) {
    const z = Math.round(Math.max(0.7, Math.min(2, zoom + delta)) * 100) / 100;
    setZoom(z);
    try {
      localStorage.setItem("clase-zoom", String(z));
    } catch {
      /* sin almacenamiento local */
    }
  }

  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-blue-900">{error}</p>
          <button onClick={() => router.push("/admin/clase")} className="btn-primario mt-4">
            Volver
          </button>
        </div>
      </div>
    );
  if (!sesion) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Cargando…</div>;

  const leccion = leccionPorSlug(sesion.leccion);
  if (!leccion) return <div className="grid min-h-screen place-items-center">Lección no encontrada</div>;
  const d = leccion.diapositivas[indice];
  const actividades = actividadesDe(leccion);
  const conectados = participantes.filter((p) => p.conectado).length;

  return (
    <ProveedorProgreso leccion={leccion.slug} reveladas={sesion.reveladas} revelar={revelar}>
      <Visor
        leccion={leccion}
        indice={indice}
        onIr={ir}
        zoom={zoom}
        sesionPresentador={sesion.id}
        aviso={
          notas && d.notas ? (
            <div className="bg-blue-950 px-4 py-2 text-sm text-blue-100">
              <b className="text-gold-400">Notas:</b> {d.notas}
            </div>
          ) : null
        }
        arriba={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-2.5 py-1 text-xs font-bold text-blue-900">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> EN VIVO{sesion.grupo ? ` · ${sesion.grupo}` : ""}
            </span>
            <button onClick={() => cambiarZoom(-0.1)} className="rounded-full px-2 py-1 text-sm hover:bg-white/10" aria-label="Achicar">
              A−
            </button>
            <button onClick={() => cambiarZoom(0.1)} className="rounded-full px-2 py-1 text-sm hover:bg-white/10" aria-label="Agrandar">
              A+
            </button>
            <button onClick={pantallaCompleta} className="rounded-full px-2 py-1 text-sm hover:bg-white/10" title="Pantalla completa">
              ⛶
            </button>
          </>
        }
        abajo={
          <>
            <button onClick={() => setNotas((v) => !v)} className={`rounded-full px-3 py-2 text-sm font-semibold ${notas ? "bg-blue-100 text-blue-900" : "text-slate-600 hover:bg-blue-50"}`}>
              Notas
            </button>
            <button onClick={traerATodos} className="btn-secundario !py-2" title="Los que se movieron por su cuenta vuelven a esta diapositiva">
              {llamando ? "✓ Llamados" : "📣 Traer a todos"}
            </button>
            <button onClick={() => setPanel((v) => !v)} className={panel ? "btn-primario !py-2" : "btn-suave !py-2"}>
              👥 Progreso
            </button>
            <button onClick={terminar} className="rounded-full px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              Terminar
            </button>
          </>
        }
      />

      {panel && (
        <aside className="fixed bottom-16 right-3 top-14 z-40 flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
            <div>
              <p className="font-heading font-bold text-blue-900">Progreso del grupo</p>
              <p className="text-xs text-slate-500">
                {conectados} conectados de {participantes.length} · solo tú ves esto
              </p>
            </div>
            <button onClick={() => setPanel(false)} className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {participantes.length === 0 && <p className="p-4 text-sm text-slate-500">Todavía no ha entrado nadie.</p>}
            {participantes.map((p) => (
              <div key={p.id} className="border-b border-blue-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.conectado ? "bg-emerald-500" : p.vino ? "bg-amber-400" : "bg-slate-300"}`} title={p.conectado ? "Conectado" : p.vino ? "Se desconectó" : "No ha entrado"} />
                  <span className="truncate text-sm font-semibold text-blue-950">{p.nombre}</span>
                  {p.dispositivo && (
                    <span className="shrink-0 text-xs" title={`Entró desde: ${DISPOSITIVOS.find((d) => d.id === p.dispositivo)?.nombre ?? p.dispositivo}`}>
                      {DISPOSITIVOS.find((d) => d.id === p.dispositivo)?.icono}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {p.diapositiva === null ? "—" : p.diapositiva === indice ? "aquí" : `en la ${p.diapositiva + 1}`}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {actividades.map((a) => {
                    const hecha = p.completadas.includes(a.id);
                    const empezada = p.empezadas.includes(a.id);
                    return (
                      <span
                        key={a.id}
                        title={a.titulo}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          hecha ? "bg-emerald-100 text-emerald-800" : empezada ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {hecha ? "✓ " : ""}
                        {a.titulo.length > 18 ? a.titulo.slice(0, 16) + "…" : a.titulo}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-blue-100 px-4 py-2 text-[11px] text-slate-500">
            Verde: completó · amarillo: empezó · gris: aún no. Diapositiva actual: {indice + 1}. {tituloDiapositiva(d)}
          </p>
        </aside>
      )}
    </ProveedorProgreso>
  );
}
