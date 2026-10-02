"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { historiaVacia, normalizarHistoria, type HistoriaOdontologica } from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
import {
  SeccionAlerta,
  SeccionAnamnesis,
  SeccionExamenes,
  SeccionIdentificacion,
  SeccionOdontograma,
  type PacienteOdontologia,
} from "@/components/modulos/odontologia/SeccionesHistoria";
import { BarraTrabajo, claseAccionBarra } from "@/components/nucleo/EncabezadoFunca";

type Dictado = { id: string; nombre: string; secciones: "ODONTOGRAMA" | "COMPLETA"; pausado: boolean };
type Datos = { dictado: Dictado; atencion: { id: string; historia: unknown }; paciente: PacienteOdontologia; denticion: Denticion };

/**
 * Dictado de Odontología: el docente lee el caso en voz alta y el estudiante lo registra en
 * su propia cuenta, a la par con todo el grupo. Se guarda solo; cuando el docente termina,
 * la historia queda entregada tal como esté. Sin nota en pantalla: la ve el docente.
 */
export default function DictadoPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [estado, setEstado] = useState<"cargando" | "sin-dictado" | "en-curso" | "terminado">("cargando");
  const [pausado, setPausado] = useState(false);
  const [historia, setHistoria] = useState<HistoriaOdontologica>(historiaVacia);
  const [guardado, setGuardado] = useState<"guardado" | "pendiente" | "guardando" | "error">("guardado");
  const ultima = useRef<HistoriaOdontologica>(historia);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entrar = useCallback(async () => {
    const res = await fetch("/api/modulos/odontologia/dictado", { method: "POST" });
    if (res.status === 401) return router.push("/");
    if (!res.ok) return setEstado("sin-dictado");
    const d: Datos = await res.json();
    const h = d.atencion.historia ? normalizarHistoria(d.atencion.historia) : historiaVacia();
    ultima.current = h;
    setHistoria(h);
    setDatos(d);
    setPausado(d.dictado.pausado);
    setEstado("en-curso");
  }, [router]);

  useEffect(() => {
    entrar();
  }, [entrar]);

  const guardarAhora = useCallback(async () => {
    if (!datos) return;
    setGuardado("guardando");
    const res = await fetch(`/api/modulos/odontologia/jornada/atenciones/${datos.atencion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historia: ultima.current }),
    });
    setGuardado(res.ok ? "guardado" : "error");
  }, [datos]);

  // Cada 3 s: ¿pausó el docente? ¿terminó?
  useEffect(() => {
    if (estado !== "en-curso") return;
    const t = setInterval(async () => {
      const res = await fetch("/api/modulos/odontologia/dictado");
      if (!res.ok) return;
      const { dictado } = (await res.json()) as { dictado: Dictado | null };
      if (!dictado || dictado.id !== datos?.dictado.id) {
        setEstado("terminado");
        return;
      }
      setPausado(dictado.pausado);
    }, 3000);
    return () => clearInterval(t);
  }, [estado, datos, guardarAhora]);

  // Si algo no alcanzó a guardarse porque llegó la pausa, se reintenta al reanudar.
  useEffect(() => {
    if (!pausado && guardado === "error") void guardarAhora();
  }, [pausado, guardado, guardarAhora]);

  function cambiar(cambio: Partial<HistoriaOdontologica>) {
    if (pausado) return;
    setHistoria((h) => {
      const nueva = { ...h, ...cambio };
      ultima.current = nueva;
      return nueva;
    });
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      void guardarAhora();
    }, 1200);
  }


  const encabezado = (
    <BarraTrabajo titulo="Dictado de odontología" subtitulo={datos?.dictado.nombre} ancho="max-w-[1200px]">
      <Link href="/panel" className={claseAccionBarra}>
        ← Volver al panel
      </Link>
    </BarraTrabajo>
  );

  if (estado === "cargando") return <div className="p-8 text-sm text-slate-500">Cargando...</div>;

  if (estado === "sin-dictado" || estado === "terminado" || !datos) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {encabezado}
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-heading text-xl font-semibold text-cyan-900">
            {estado === "terminado" ? "El docente terminó el dictado" : "No tienes ningún dictado en curso"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {estado === "terminado"
              ? "Tu historia quedó entregada tal como la dejaste. El docente revisará los resultados con el grupo."
              : "Cuando el docente inicie el dictado, entra de nuevo a esta página."}
          </p>
          {estado === "sin-dictado" && (
            <button onClick={entrar} className="mt-4 rounded-full font-heading bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">
              Volver a revisar
            </button>
          )}
        </div>
      </div>
    );
  }

  const completa = datos.dictado.secciones === "COMPLETA";
  const set = pausado ? undefined : cambiar;
  const etiquetaGuardado = { guardado: "Todo guardado", pendiente: "Sin guardar…", guardando: "Guardando…", error: "No se pudo guardar" }[guardado];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {encabezado}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
        <div className="mx-auto max-w-[1200px] flex flex-wrap items-center justify-between gap-2 py-2.5">
          <p className="text-sm text-slate-700">
            {completa ? "Registra la historia que dicta el docente." : "Registra en el odontograma lo que dicta el docente."}
          </p>
          <span className={`text-xs ${guardado === "error" ? "text-red-600" : guardado === "guardado" ? "text-emerald-700" : "text-slate-500"}`}>
            {etiquetaGuardado}
          </span>
        </div>
        {pausado && (
          <div role="status" className="mx-auto max-w-[1200px] mb-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900">
            El docente pausó el dictado. Espera a que lo reanude para seguir escribiendo.
          </div>
        )}
      </div>

      <main className={`mx-auto max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-5 ${pausado ? "opacity-70" : ""}`}>
        <SeccionIdentificacion paciente={datos.paciente} />
        {completa && (
          <>
            <SeccionAlerta h={historia} set={set} />
            <SeccionAnamnesis h={historia} set={set} />
            <SeccionExamenes h={historia} set={set} />
          </>
        )}
        <SeccionOdontograma h={historia} set={set} denticion={datos.denticion} />
        <p className="text-center text-xs text-slate-500">
          No hay que enviar nada: cuando el docente termine el dictado, tu historia se entrega sola.
        </p>
      </main>
    </div>
  );
}
