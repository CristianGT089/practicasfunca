"use client";

import { useEffect, useState } from "react";
import { ANIMOS } from "@/lib/escena/guion";
import { srcFrame, type DefinicionEscena, type DefinicionPersonaje, type Frame } from "@/lib/escena/personajes";
import estilos from "./EscenaVentanilla.module.css";

export type DocumentoEnMostrador = { clave: string; tipo: "receta" | "cedula"; etiqueta: string; onAbrir: () => void };
export type OpcionEscena = { texto: string; onElegir: () => void };

type Props = {
  escena: DefinicionEscena;
  personaje: DefinicionPersonaje;
  /** Nombre que se muestra en la burbuja (el del paciente del caso, o "Cliente"). */
  nombre: string;
  frame: Frame;
  /** Lo que dice la persona (o una narración, en cursiva). */
  linea: { texto: string; narracion?: boolean } | null;
  opciones?: OpcionEscena[] | null;
  /** Papel que la persona está ofreciendo (frame entregandoDocumento): clic para recibirlo. */
  ofreceDocumento?: { etiqueta: string; onRecibir: () => void } | null;
  documentos?: DocumentoEnMostrador[];
  /** 0-4; null = no se muestra. */
  animo?: number | null;
  /** Cambiar el número dispara la animación de incomodidad. */
  incomodar?: number;
  /** Cambiar el número dispara el destello rojo (error). */
  destello?: number;
  saliendo?: boolean;
  turno?: string | null;
};

/**
 * Escena de la práctica virtual al estilo *Papers, Please*: la persona detrás del
 * mostrador, que habla en burbujas, reacciona a lo que hace el estudiante y le pasa
 * documentos que se pueden abrir. Genérica: la usa cualquier módulo con su escena y su
 * personaje (lib/escena/personajes.ts).
 */
export default function EscenaVentanilla({
  escena,
  personaje,
  nombre,
  frame,
  linea,
  opciones,
  ofreceDocumento,
  documentos = [],
  animo = null,
  incomodar = 0,
  destello = 0,
  saliendo = false,
  turno = null,
}: Props) {
  const [hablando, setHablando] = useState(false);
  const zona = personaje.zonaDocumento;
  const estadoAnimo = animo === null ? null : ANIMOS[Math.max(0, Math.min(4, animo))];

  return (
    <div className={estilos.envoltura}>
      <div className={estilos.escena}>
        <div className={estilos.lienzo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={estilos.capa} src={escena.fondo} alt="" />
          {turno && escena.pantallaTurno && (
            <div
              className={estilos.turno}
              style={{
                left: `${escena.pantallaTurno.left}%`,
                top: `${escena.pantallaTurno.top}%`,
                width: `${escena.pantallaTurno.width}%`,
                height: `${escena.pantallaTurno.height}%`,
              }}
              aria-hidden
            >
              {turno}
            </div>
          )}

          <div className={`${estilos.persona} ${saliendo ? estilos.saliendo : ""}`}>
            {/* La key reinicia la sacudida cada vez que cambia `incomodar`. */}
            <div key={incomodar} className={`h-full w-full ${incomodar > 0 ? estilos.incomoda : ""}`}>
              <div className={`${estilos.cuerpo} ${hablando ? estilos.hablando : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={srcFrame(personaje, frame)} alt={`${nombre}, al otro lado del mostrador`} />
              </div>
            </div>
            {ofreceDocumento && zona && (
              <button
                type="button"
                className={estilos.zonaDocumento}
                style={{ left: `${zona.left}%`, top: `${zona.top}%`, width: `${zona.width}%`, height: `${zona.height}%` }}
                onClick={ofreceDocumento.onRecibir}
                aria-label={`Recibir ${ofreceDocumento.etiqueta}`}
              >
                <span className={estilos.pista}>Recibe {ofreceDocumento.etiqueta}</span>
              </button>
            )}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`${estilos.capa} ${estilos.primerPlano}`} src={escena.primerPlano} alt="" />
          {documentos.map((d) => (
            <button
              key={d.clave}
              type="button"
              className={`${estilos.documento} ${d.tipo === "receta" ? estilos.receta : estilos.cedula}`}
              onClick={d.onAbrir}
              aria-label={`Abrir ${d.etiqueta}`}
              title={`Abrir ${d.etiqueta}`}
            />
          ))}
        </div>

        {linea && (
          <div key={linea.texto} className={`${estilos.burbuja} ${linea.narracion ? estilos.narracion : ""}`} aria-live="polite">
            <div className="flex flex-wrap items-baseline gap-2 text-[0.72em] mb-0.5 not-italic">
              <b className="font-heading font-semibold" style={{ color: linea.narracion ? "#ffd66b" : "#1b3a6b" }}>
                {linea.narracion ? "En la ventanilla" : nombre}
              </b>
              {!linea.narracion && estadoAnimo && (
                <span className="font-semibold" style={{ color: estadoAnimo.color }}>
                  {estadoAnimo.texto.toLowerCase()}
                </span>
              )}
            </div>
            <p className="m-0 min-h-[2.8em]">
              <TextoEscrito texto={linea.texto} instantaneo={Boolean(linea.narracion)} onHablando={setHablando} />
            </p>
          </div>
        )}

        {opciones && opciones.length > 0 && (
          <div className={estilos.opciones} role="group" aria-label="Tus respuestas">
            <div className="px-1 text-[0.8em] font-semibold uppercase tracking-wide text-[#ffd66b]">Tu respuesta</div>
            {opciones.map((o) => (
              <button key={o.texto} type="button" className={estilos.opcion} onClick={o.onElegir}>
                {o.texto}
              </button>
            ))}
          </div>
        )}

        {destello > 0 && <div key={destello} className={estilos.destello} />}
      </div>
    </div>
  );
}

/**
 * Escribe el texto letra por letra y avisa mientras "habla". Se monta de nuevo con cada
 * frase (la burbuja lleva el texto como key), así que el conteo arranca siempre en cero.
 */
function TextoEscrito({ texto, instantaneo, onHablando }: { texto: string; instantaneo: boolean; onHablando: (v: boolean) => void }) {
  const [reducido] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const inmediato = instantaneo || reducido;
  const [n, setN] = useState(inmediato ? texto.length : 0);

  useEffect(() => {
    if (inmediato) return;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i === 1) onHablando(true);
      if (i >= texto.length) {
        clearInterval(t);
        onHablando(false);
      }
    }, 26);
    return () => {
      clearInterval(t);
      onHablando(false);
    };
  }, [texto, inmediato, onHablando]);

  return <>{texto.slice(0, n)}</>;
}
