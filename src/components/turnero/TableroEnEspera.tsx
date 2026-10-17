"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { SnapshotTurnero } from "@/lib/turnero/snapshot";

/** Recordatorios de buena práctica que rotan mientras se espera, según el tipo de jornada. */
const CONSEJOS: Record<string, string[]> = {
  DISPENSARIO: [
    "Pide la fórmula y el documento: compara el nombre y el número antes de entregar.",
    "Un menor de edad no reclama solo: verifica que quien lo acompaña sea su padre, madre o acudiente.",
    "Quien reclama por otra persona trae autorización escrita y su propia cédula.",
    "Revisa la vigencia de cada medicamento de la fórmula.",
    "Cruza las alergias del paciente con cada medicamento antes de entregarlo.",
    "Lee el diagnóstico: si es de alto costo, no se cobra cuota moderadora.",
    "Entrega la cantidad autorizada, ni una más ni una menos.",
  ],
  FARMACIA: [
    "Saluda, escucha y confirma qué necesita la persona.",
    "Revisa la vigencia de la fórmula antes de vender.",
    "Pregunta por alergias antes de entregar un medicamento.",
    "Los antibióticos solo se venden con fórmula médica.",
    "Entrega la cantidad que dice la fórmula y explica cómo tomarlo.",
  ],
};
const CONSEJOS_GENERALES = [
  "Saluda y llama a cada persona por su nombre.",
  "Verifica la identidad antes de atender.",
  "Registra todo en el sistema: lo que no se registra, no se hizo.",
];

const SEGUNDOS_CONSEJO = 8;

/**
 * Lo que proyecta el tablero mientras la jornada está preparada: qué jornada es, qué
 * computadores ya entraron (para que el docente sepa que todo está listo antes de iniciar)
 * y consejos de práctica que rotan. Se reemplaza solo por el tablero normal al iniciar.
 */
export default function TableroEnEspera({
  snapshot,
  sonidoActivo,
  onActivarSonido,
}: {
  snapshot: SnapshotTurnero;
  sonidoActivo: boolean;
  onActivarSonido: () => void;
}) {
  const jornada = snapshot.jornada;
  const consejos = (jornada && CONSEJOS[jornada.tipo]) ?? CONSEJOS_GENERALES;
  const [indice, setIndice] = useState(0);
  const [hora, setHora] = useState<Date | null>(null);

  useEffect(() => {
    const t = setInterval(() => setIndice((i) => (i + 1) % consejos.length), SEGUNDOS_CONSEJO * 1000);
    return () => clearInterval(t);
  }, [consejos.length]);

  useEffect(() => {
    const tic = () => setHora(new Date());
    tic();
    const t = setInterval(tic, 15_000);
    return () => clearInterval(t);
  }, []);

  const listos = snapshot.espacios.filter((e) => e.listo).length;
  const total = snapshot.espacios.length;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
      {/* Burbujas de fondo: decorativas. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -left-16 top-24 h-64 w-64 rounded-full bg-gold-500/10 motion-safe:animate-[espera-flotar_9s_ease-in-out_infinite]" />
        <span className="absolute right-10 top-10 h-40 w-40 rounded-full bg-white/5 motion-safe:animate-[espera-flotar_12s_ease-in-out_infinite_1s]" />
        <span className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-blue-400/10 motion-safe:animate-[espera-flotar_14s_ease-in-out_infinite_2s]" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo-blanco.png" alt="FUNCA" width={800} height={157} className="h-8 w-auto sm:h-10" priority />
            <span className="hidden h-8 w-px bg-white/20 sm:block" aria-hidden />
            <span className="hidden font-heading text-lg font-bold sm:block">Prácticas</span>
          </div>
          <div className="flex items-center gap-4">
            {!sonidoActivo && (
              <button onClick={onActivarSonido} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">
                🔈 Activar sonido
              </button>
            )}
            {hora && (
              <p className="font-heading text-2xl font-bold tabular-nums text-blue-100 sm:text-3xl">
                {hora.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center sm:gap-10">
          <div>
            <p className="font-heading text-lg font-semibold uppercase tracking-[0.3em] text-gold-400 sm:text-2xl">
              La jornada empieza pronto
            </p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold leading-tight sm:text-6xl">{jornada?.nombre ?? snapshot.sesion.turnero.nombre}</h1>
            {jornada && jornada.estudiantes > 0 && (
              <p className="mt-3 text-lg text-blue-200 sm:text-2xl">
                {jornada.estudiantes} estudiantes · {total} {total === 1 ? "puesto" : "puestos"} de atención
              </p>
            )}
          </div>

          <section aria-label="Computadores" className="w-full">
            <p className="mb-3 text-base text-blue-200 sm:text-lg">
              {listos === total ? "Todos los computadores están listos" : `Computadores listos: ${listos} de ${total}`}
            </p>
            <ul className="flex flex-wrap justify-center gap-3">
              {snapshot.espacios.map((e) => (
                <li
                  key={e.numero}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-heading text-lg font-semibold sm:text-xl ${
                    e.listo ? "bg-gold-500 text-blue-950" : "bg-white/10 text-blue-100"
                  }`}
                >
                  {e.listo ? (
                    <span aria-hidden>✓</span>
                  ) : (
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-blue-200 motion-safe:animate-[espera-latido_1.6s_ease-in-out_infinite]" />
                  )}
                  {e.nombre ?? `Espacio ${e.numero}`}
                  <span className="sr-only">{e.listo ? "listo" : "esperando que entre el computador"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-live="polite" className="w-full max-w-3xl rounded-3xl bg-white/10 px-6 py-6 backdrop-blur-sm sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">Para recordar</p>
            <p key={indice} className="mt-2 font-heading text-2xl font-semibold leading-snug sm:text-3xl motion-safe:animate-[espera-consejo_600ms_ease-out]">
              {consejos[indice % consejos.length]}
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * 3, 2, 1, ¡Comienza! a pantalla completa cuando el docente inicia la jornada. Dura unos
 * 4 s y avisa al terminar; se puede cerrar antes tocando la pantalla.
 */
export function CuentaRegresiva({ onFin }: { onFin: () => void }) {
  const [paso, setPaso] = useState(3);

  useEffect(() => {
    if (paso < 0) {
      onFin();
      return;
    }
    const t = setTimeout(() => setPaso((p) => p - 1), paso === 0 ? 1400 : 900);
    return () => clearTimeout(t);
  }, [paso, onFin]);

  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={onFin}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-blue-900 text-white"
    >
      <p
        key={paso}
        className={`font-heading font-extrabold leading-none motion-safe:animate-[cuenta-pop_500ms_ease-out] ${
          paso > 0 ? "text-[40vw] sm:text-[22rem]" : "w-full px-6 text-center text-[9vw] leading-tight text-gold-400"
        }`}
      >
        {paso > 0 ? paso : "¡Comienza la jornada!"}
      </p>
    </div>
  );
}
