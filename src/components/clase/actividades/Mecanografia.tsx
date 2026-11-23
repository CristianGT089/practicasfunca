"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calcularPpm, NIVELES_MECANOGRAFIA, type IntentoMecanografia } from "@/lib/clase/mecanografia";
import { useProgreso } from "../progreso";
import { useDispositivo } from "@/lib/clase/dispositivo";

/** `omitidaEnCelular`: la vio en el celular y siguió sin hacerla (necesita teclado físico). */
type Datos = { intentos: IntentoMecanografia[]; ignorarTildes?: boolean; omitidaEnCelular?: boolean };

const sinTildes = (c: string) => c.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Teclas "muertas": al pulsarlas aparece el signo solo y se combina con la siguiente letra
// (´ + a = á). Mientras esperan la letra no se cuentan como error ni se pintan de rojo.
const TECLAS_MUERTAS = new Set(["´", "`", "¨", "^", "~", "'", "́", "̀", "̈"]);

/** Textos que ya terminó, por nivel. */
function terminados(intentos: IntentoMecanografia[], nivelId: string) {
  return new Set(intentos.filter((i) => i.nivel === nivelId).map((i) => i.texto));
}

/** Un nivel se abre al terminar todos los textos del anterior. */
function desbloqueado(intentos: IntentoMecanografia[], nivel: number) {
  if (nivel === 0) return true;
  const anterior = NIVELES_MECANOGRAFIA[nivel - 1];
  return terminados(intentos, anterior.id).size >= anterior.textos.length;
}

/** Dónde retomar: el primer texto sin terminar del nivel más alto abierto. */
function siguientePendiente(intentos: IntentoMecanografia[]) {
  let nivel = 0;
  while (nivel + 1 < NIVELES_MECANOGRAFIA.length && desbloqueado(intentos, nivel + 1)) nivel++;
  const n = NIVELES_MECANOGRAFIA[nivel];
  const hechos = terminados(intentos, n.id);
  const texto = n.textos.findIndex((_, i) => !hechos.has(i));
  return { nivel, texto: texto === -1 ? 0 : texto };
}

/**
 * Práctica de mecanografía individual y progresiva: cada nivel tiene sus textos en orden y el
 * siguiente nivel se abre al terminarlos. No hay tabla de posiciones: cada quien ve solo sus
 * resultados y su mejor marca. Para terminar un texto hay que corregir los errores.
 */
export default function Mecanografia({ id }: { id: string }) {
  const { datos, guardar, cargado } = useProgreso<Datos>(id);
  const intentos = useMemo(() => datos?.intentos ?? [], [datos]);
  const ignorarTildes = !!datos?.ignorarTildes;
  const celular = useDispositivo() === "celular";
  const [practicarIgual, setPracticarIgual] = useState(false);

  // null = todavía no eligió: se retoma donde iba.
  const [posicion, setPosicion] = useState<{ nivel: number; texto: number } | null>(null);
  const [escrito, setEscrito] = useState("");
  const [enEspera, setEnEspera] = useState(false);
  const [inicio, setInicio] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const [pulsaciones, setPulsaciones] = useState(0);
  const [errores, setErrores] = useState(0);
  const [resultado, setResultado] = useState<IntentoMecanografia | null>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  // Cuántas posiciones ya se calificaron (para no contar dos veces ni contar el signo en espera).
  const calificadas = useRef(0);

  const { nivel, texto } = posicion ?? siguientePendiente(intentos);
  const nivelActual = NIVELES_MECANOGRAFIA[nivel];
  const objetivo = nivelActual.textos[texto];
  const igual = (a: string, b: string) => (ignorarTildes ? sinTildes(a) === sinTildes(b) : a === b);

  useEffect(() => {
    if (!inicio || resultado) return;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [inicio, resultado]);

  function ir(nuevoNivel: number, nuevoTexto: number) {
    setPosicion({ nivel: nuevoNivel, texto: nuevoTexto });
    setEscrito("");
    setEnEspera(false);
    setInicio(null);
    setPulsaciones(0);
    setErrores(0);
    setResultado(null);
    calificadas.current = 0;
    setTimeout(() => entrada.current?.focus(), 0);
  }

  function alEscribir(valorCrudo: string, componiendo: boolean) {
    if (resultado) return;
    const valor = valorCrudo.replace(/\n/g, "").slice(0, objetivo.length);
    const ultimo = valor.length - 1;
    // El último carácter está "en espera" si es un signo de tilde suelto (o el teclado está
    // componiendo) y no es justo lo que pide el texto.
    const espera = ultimo >= 0 && (componiendo || TECLAS_MUERTAS.has(valor[ultimo])) && valor[ultimo] !== objetivo[ultimo];
    const efectivos = espera ? valor.length - 1 : valor.length;

    const t0 = inicio ?? Date.now();
    if (!inicio && valor.length > 0) setInicio(t0);

    let nuevasPulsaciones = pulsaciones;
    let nuevosErrores = errores;
    if (efectivos < calificadas.current) calificadas.current = efectivos; // borró
    for (let i = calificadas.current; i < efectivos; i++) {
      nuevasPulsaciones++;
      if (!igual(valor[i], objetivo[i])) nuevosErrores++;
    }
    calificadas.current = efectivos;
    setPulsaciones(nuevasPulsaciones);
    setErrores(nuevosErrores);
    setEscrito(valor);
    setEnEspera(espera);

    const terminado = !espera && valor.length === objetivo.length && [...valor].every((c, i) => igual(c, objetivo[i]));
    if (terminado) {
      const ms = Date.now() - t0;
      const intento: IntentoMecanografia = {
        nivel: nivelActual.id,
        texto,
        ppm: calcularPpm(objetivo.length, ms),
        precision: nuevasPulsaciones > 0 ? Math.round(((nuevasPulsaciones - nuevosErrores) / nuevasPulsaciones) * 100) : 100,
        segundos: Math.round(ms / 1000),
        fecha: new Date().toISOString(),
      };
      setResultado(intento);
      // Fija la posición: si no, al guardar el intento "dónde retomar" saltaría al siguiente texto.
      setPosicion({ nivel, texto });
      entrada.current?.blur();
      guardar({ intentos: [...intentos, intento].slice(-80), ignorarTildes, omitidaEnCelular: datos?.omitidaEnCelular }, true);
    }
  }

  const delNivel = intentos.filter((i) => i.nivel === nivelActual.id);
  const hechos = terminados(intentos, nivelActual.id);
  const mejor = delNivel.reduce<IntentoMecanografia | null>((m, i) => (!m || i.ppm > m.ppm ? i : m), null);
  const segundos = inicio ? Math.max(0, ((resultado ? inicio + resultado.segundos * 1000 : ahora) - inicio) / 1000) : 0;
  const ppmVivo = inicio && escrito.length > 0 ? calcularPpm(escrito.length, segundos * 1000) : 0;
  const precisionViva = pulsaciones > 0 ? Math.round(((pulsaciones - errores) / pulsaciones) * 100) : 100;

  const esUltimoTexto = texto === nivelActual.textos.length - 1;
  const hayOtroNivel = nivel + 1 < NIVELES_MECANOGRAFIA.length;
  const siguienteAbierto = hayOtroNivel && desbloqueado(intentos, nivel + 1);
  const recienAbierto = !!resultado && esUltimoTexto && siguienteAbierto && hechos.size === nivelActual.textos.length;

  if (!cargado) return <p className="text-slate-500">Cargando tu progreso…</p>;

  if (celular && !practicarIgual)
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-gold-500/50 bg-gold-50 p-4 sm:p-6">
        <p className="font-heading text-lg font-bold text-blue-950">⌨️ Esta práctica necesita un teclado físico</p>
        <p className="text-slate-700">
          La mecanografía es escribir con los diez dedos sin mirar. Con el pulgar no se practica lo mismo, y el corrector del celular cambia palabras y te marcaría errores que no son tuyos.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Hazla cuando tengas un computador: en FUNCA, en una biblioteca o en un café internet. Entras con tu usuario y sigues donde ibas.</li>
          <li>Mientras tanto, en el celular aprovecha el dictado por voz (🎤 del teclado): escribe por ti en Docs y WhatsApp.</li>
          <li>Repasa la técnica: índices en la F y la J (tienen una rayita), espalda recta y la vista en la pantalla.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          {datos?.omitidaEnCelular ? (
            <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800">✓ Ya puedes seguir con la clase. Te queda pendiente para el computador.</p>
          ) : (
            <button className="btn-primario" onClick={() => guardar({ intentos, ignorarTildes, omitidaEnCelular: true })}>
              Entendido, la hago en un computador
            </button>
          )}
          <button className="btn-suave" onClick={() => setPracticarIgual(true)}>
            Tengo teclado conectado: practicar aquí
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Niveles: se abren en orden */}
      <div className="flex flex-wrap items-center gap-2">
        {NIVELES_MECANOGRAFIA.map((n, i) => {
          const abierto = desbloqueado(intentos, i);
          const completo = terminados(intentos, n.id).size >= n.textos.length;
          return (
            <button
              key={n.id}
              onClick={() => abierto && ir(i, i === nivel ? texto : siguientePendienteDe(intentos, i))}
              disabled={!abierto}
              title={abierto ? undefined : "Termina el nivel anterior para abrirlo"}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                i === nivel ? "bg-blue-800 text-white" : abierto ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : "bg-slate-100 text-slate-400"
              }`}
            >
              {!abierto ? "🔒 " : completo ? "✓ " : ""}
              {n.nombre}
            </button>
          );
        })}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={ignorarTildes}
            onChange={(e) => guardar({ intentos, ignorarTildes: e.target.checked, omitidaEnCelular: datos?.omitidaEnCelular })}
            className="h-4 w-4 accent-blue-800"
          />
          Ignorar tildes y ñ
        </label>
      </div>

      {/* Secuencia de textos del nivel */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">{nivelActual.descripcion}</p>
        <div className="ml-auto flex items-center gap-1.5" aria-label={`Texto ${texto + 1} de ${nivelActual.textos.length}`}>
          <span className="mr-1 text-sm font-semibold text-blue-900">
            Texto {texto + 1} de {nivelActual.textos.length}
          </span>
          {nivelActual.textos.map((_, i) => (
            <button
              key={i}
              onClick={() => (hechos.has(i) || i <= Math.max(...hechos, -1) + 1) && ir(nivel, i)}
              aria-label={`Texto ${i + 1}${hechos.has(i) ? " (terminado)" : ""}`}
              className={`h-3 w-3 rounded-full transition-all ${
                i === texto ? "scale-125 bg-gold-500 ring-2 ring-gold-500/30" : hechos.has(i) ? "bg-emerald-500" : "bg-blue-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Texto + caja de escritura; al terminar, el resultado los tapa */}
      <div className={`relative flex flex-col gap-4 ${resultado ? "min-h-[340px]" : ""}`}>
        <div
          onClick={() => entrada.current?.focus()}
          className="cursor-text select-none rounded-2xl border-2 border-blue-200 bg-white px-5 py-4 font-mono text-xl leading-relaxed tracking-wide sm:text-2xl"
          aria-label="Texto para copiar"
        >
          {[...objetivo].map((c, i) => {
            let clase = "text-slate-400";
            const pendiente = enEspera && i === escrito.length - 1;
            if (pendiente) clase = "text-blue-950 bg-blue-100 rounded border-b-4 border-gold-500";
            else if (i < escrito.length) clase = igual(escrito[i], c) ? "text-emerald-700" : "bg-rose-200 text-rose-800 rounded";
            else if (i === escrito.length) clase = "text-blue-950 border-b-4 border-gold-500";
            return (
              <span key={i} className={clase}>
                {c === " " && i < escrito.length && !pendiente && !igual(escrito[i], c) ? "·" : c}
              </span>
            );
          })}
        </div>

        <textarea
          ref={entrada}
          value={escrito}
          onChange={(e) => alEscribir(e.target.value, (e.nativeEvent as InputEvent).isComposing === true)}
          onCompositionEnd={(e) => alEscribir(e.currentTarget.value, false)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          disabled={!!resultado}
          rows={2}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          placeholder="Haz clic aquí y empieza a escribir el texto de arriba…"
          className="w-full resize-none rounded-2xl border-2 border-blue-300 bg-blue-50/50 px-4 py-3 font-mono text-lg outline-none focus:border-blue-700 focus:bg-white"
        />

        {!resultado && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Indicador valor={ppmVivo} etiqueta="palabras por minuto" />
            <Indicador valor={`${precisionViva}%`} etiqueta="precisión" />
            <Indicador valor={`${Math.floor(segundos)} s`} etiqueta="tiempo" />
          </div>
        )}

        {resultado && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-blue-950/85 p-4 backdrop-blur-sm" role="dialog" aria-label="Resultado">
            <div className="w-full max-w-xl rounded-3xl bg-gradient-to-br from-blue-800 to-blue-700 p-6 text-white shadow-2xl">
              <p className="font-heading text-2xl font-bold">
                {recienAbierto
                  ? `🎉 ¡Terminaste el ${nivelActual.nombre.split(" · ")[0]}!`
                  : mejor && resultado.ppm >= mejor.ppm && delNivel.length > 1
                    ? "🎉 ¡Nueva mejor marca personal!"
                    : "✅ ¡Texto terminado!"}
              </p>
              <p className="text-sm text-blue-200">Ya no tienes que escribir más en este texto.</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Indicador valor={resultado.ppm} etiqueta="palabras por minuto" oscuro />
                <Indicador valor={`${resultado.precision}%`} etiqueta="precisión" oscuro />
                <Indicador valor={`${resultado.segundos} s`} etiqueta="tiempo" oscuro />
              </div>
              <p className="mt-3 text-sm text-blue-100">
                {resultado.precision < 90
                  ? "Consejo: ve más despacio y mira la pantalla, no el teclado. La precisión primero."
                  : "Muy buena precisión. ¡Sigue así!"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {!esUltimoTexto ? (
                  <button onClick={() => ir(nivel, texto + 1)} className="btn-cta" autoFocus>
                    Siguiente texto ({texto + 2} de {nivelActual.textos.length}) →
                  </button>
                ) : siguienteAbierto ? (
                  <button onClick={() => ir(nivel + 1, siguientePendienteDe(intentos, nivel + 1))} className="btn-cta" autoFocus>
                    Pasar al {NIVELES_MECANOGRAFIA[nivel + 1].nombre} →
                  </button>
                ) : hayOtroNivel ? (
                  <button onClick={() => ir(nivel, [...nivelActual.textos.keys()].find((i) => !hechos.has(i)) ?? 0)} className="btn-cta" autoFocus>
                    Completar los textos que faltan →
                  </button>
                ) : (
                  <span className="rounded-full bg-gold-500 px-4 py-2 font-heading text-sm font-bold text-blue-900">🏁 ¡Completaste todos los niveles!</span>
                )}
                <button onClick={() => ir(nivel, texto)} className="btn bg-white/10 text-white hover:bg-white/20">
                  Repetir este texto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progreso personal */}
      {delNivel.length > 0 && (
        <div className="tarjeta-sm p-4">
          <p className="text-sm font-semibold text-blue-900">
            Tu progreso en este nivel · mejor marca: <span className="text-emerald-700">{mejor?.ppm} ppm</span>
          </p>
          <div className="mt-3 flex h-20 items-end gap-1" aria-label="Tus últimos intentos">
            {delNivel.slice(-20).map((i, k) => {
              const max = Math.max(...delNivel.slice(-20).map((x) => x.ppm), 1);
              return (
                <div key={k} className="flex flex-1 flex-col items-center justify-end" title={`${i.ppm} ppm · ${i.precision}%`}>
                  <div className="w-full max-w-6 rounded-t bg-blue-500" style={{ height: `${Math.max(6, (i.ppm / max) * 100)}%` }} />
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">Tus últimos {Math.min(20, delNivel.length)} intentos (solo tú los ves).</p>
        </div>
      )}
    </div>
  );
}

/** Primer texto sin terminar de un nivel (o el primero si ya los terminó todos). */
function siguientePendienteDe(intentos: IntentoMecanografia[], nivel: number) {
  const n = NIVELES_MECANOGRAFIA[nivel];
  const hechos = terminados(intentos, n.id);
  const i = n.textos.findIndex((_, k) => !hechos.has(k));
  return i === -1 ? 0 : i;
}

function Indicador({ valor, etiqueta, oscuro }: { valor: string | number; etiqueta: string; oscuro?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-2 ${oscuro ? "bg-white/10" : "bg-blue-50"}`}>
      <div className={`font-heading text-2xl font-extrabold ${oscuro ? "text-white" : "text-blue-900"}`}>{valor}</div>
      <div className={`text-xs ${oscuro ? "text-blue-100" : "text-slate-600"}`}>{etiqueta}</div>
    </div>
  );
}
