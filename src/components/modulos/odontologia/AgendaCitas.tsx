"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BLOQUE_MIN,
  ESTADOS_CITA,
  OPORTUNIDAD_DIAS_HABILES,
  TIPOS_CITA,
  bloquesDelDia,
  diaColombia,
  diasHabilesDesde,
  duracionSugerida,
  nombreEstado,
  nombreTipo,
  textoHora,
  type EstadoCita,
  type TipoCita,
} from "@/lib/modulos/odontologia/agenda";

type Cita = {
  id: string;
  unidad: number;
  inicio: string;
  duracionMin: number;
  tipo: TipoCita;
  motivo: string;
  pacienteNombre: string;
  pacienteDocumento: string;
  pacienteTelefono: string | null;
  acudienteNombre: string | null;
  estado: EstadoCita;
  fechaPedidaPorPaciente: boolean;
  observaciones: string | null;
  deRelleno: boolean;
  atencionId: string | null;
};

export type PacienteParaCita = { nombre: string; documento: string; telefono?: string | null; acudiente?: string | null };

const ALTO_BLOQUE = 30; // px por bloque de 20 minutos

/** Solo la primera letra en mayúscula ("Lun, 19 de oct", no "Lun, 19 De Oct"). */
const inicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaLarga = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fechaCorta = (dia: string) =>
  inicial(new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));

const COLOR_ESTADO: Record<EstadoCita, string> = {
  PROGRAMADA: "border-blue-300 bg-blue-50 text-blue-900",
  CONFIRMADA: "border-emerald-300 bg-emerald-50 text-emerald-900",
  ATENDIDA: "border-slate-300 bg-slate-100 text-slate-600",
  NO_ASISTIO: "border-red-300 bg-red-50 text-red-800",
  CANCELADA: "border-slate-200 bg-white text-slate-400 line-through",
};

/**
 * Agenda de citas de Salud Oral: un día a la vez, con las unidades (sillas) en columnas y los
 * bloques de 20 minutos en filas. Tocar un espacio libre agenda; tocar una cita propia la
 * reprograma o le cambia el estado. Sirve para la agenda real del consultorio (`jornada`
 * null) y para la de práctica de una jornada (`paciente` llena el formulario).
 */
export default function AgendaCitas({
  jornada,
  paciente,
  atencionId,
  solicitadaEn,
  onAgendada,
  practica = false,
}: {
  jornada: string | null;
  paciente?: PacienteParaCita;
  atencionId?: string | null;
  /** Desde cuándo se cuentan los 3 días hábiles (por defecto, ahora). */
  solicitadaEn?: string;
  onAgendada?: () => void;
  /** Práctica: se oculta lo que el estudiante no debe usar (la excepción de fecha). */
  practica?: boolean;
}) {
  const hoy = diaColombia(new Date());
  const [desde, setDesde] = useState(hoy);
  const [dias, setDias] = useState<string[]>([]);
  const [dia, setDia] = useState(hoy);
  const [unidades, setUnidades] = useState(0);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formulario, setFormulario] = useState<{ unidad: number; inicio: string; cita?: Cita } | null>(null);
  // Sube para volver a cargar (tras agendar o cambiar un estado).
  const [version, setVersion] = useState(0);
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    let vigente = true;
    const q = new URLSearchParams({ desde, dias: "5", ...(jornada ? { jornada } : {}) });
    fetch(`/api/modulos/odontologia/agenda?${q}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!vigente || !data) return;
        setDias(data.dias);
        setUnidades(data.unidades);
        setCitas(data.citas);
        setCargando(false);
        setAhora(Date.now());
        setDia((d) => (data.dias.includes(d) ? d : data.dias[0]));
      });
    return () => {
      vigente = false;
    };
  }, [desde, jornada, version]);

  // Plazo de oportunidad: hasta el tercer día hábil después de la solicitud.
  const limite = useMemo(() => {
    const base = diaColombia(solicitadaEn ? new Date(solicitadaEn) : new Date());
    const siguientes = diasHabilesDesde(base, OPORTUNIDAD_DIAS_HABILES + 2).filter((d) => d > base);
    return siguientes[OPORTUNIDAD_DIAS_HABILES - 1];
  }, [solicitadaEn]);

  const bloques = useMemo(() => (dia ? bloquesDelDia(dia) : []), [dia]);
  const citasDelDia = citas.filter((c) => diaColombia(new Date(c.inicio)) === dia);
  const ocupado = (unidad: number, inicio: Date) =>
    citasDelDia.some((c) => {
      if (c.unidad !== unidad || c.estado === "CANCELADA") return false;
      const ci = new Date(c.inicio).getTime();
      return ci <= inicio.getTime() && inicio.getTime() < ci + c.duracionMin * 60_000;
    });
  const libresDe = (d: string) => {
    const delDia = citas.filter((c) => diaColombia(new Date(c.inicio)) === d && c.estado !== "CANCELADA");
    const ocupados = delDia.reduce((n, c) => n + c.duracionMin / BLOQUE_MIN, 0);
    return bloquesDelDia(d).length * unidades - ocupados;
  };

  function moverSemana(paso: number) {
    if (paso < 0) {
      // Atrás: cinco días hábiles antes (sin pasar de hoy en la práctica).
      let d = new Date(`${desde}T12:00:00Z`);
      let n = 0;
      while (n < 5) {
        d = new Date(d.getTime() - 86_400_000);
        if (diasHabilesDesde(d.toISOString().slice(0, 10), 1)[0] === d.toISOString().slice(0, 10)) n++;
      }
      const nuevo = d.toISOString().slice(0, 10);
      setDesde(practica && nuevo < hoy ? hoy : nuevo);
    } else if (dias.length) {
      const siguiente = new Date(`${dias[dias.length - 1]}T12:00:00Z`);
      setDesde(new Date(siguiente.getTime() + 86_400_000).toISOString().slice(0, 10));
    }
  }

  return (
    <section className="tarjeta-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-blue-900">Agenda de citas</h2>
          <p className="text-xs text-slate-500">
            Lunes a viernes hábiles, de 7:00 a. m. a 5:00 p. m., en bloques de {BLOQUE_MIN} minutos. Toca un espacio libre para agendar.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => moverSemana(-1)} disabled={practica && desde <= hoy} className="btn-suave disabled:opacity-40" aria-label="Días anteriores">
            ←
          </button>
          <button onClick={() => setDesde(hoy)} className="btn-suave">
            Hoy
          </button>
          <button onClick={() => moverSemana(1)} className="btn-suave" aria-label="Días siguientes">
            →
          </button>
        </div>
      </div>

      {paciente && limite && (
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          Oportunidad (Res. 1552 de 2013): la cita de odontología general se asigna en máximo {OPORTUNIDAD_DIAS_HABILES} días hábiles, es decir,
          hasta el <b>{fechaLarga(limite)}</b>, salvo que el paciente pida otra fecha.
        </p>
      )}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Días">
        {dias.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === dia}
            onClick={() => setDia(d)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-left text-xs ${
              d === dia ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-600"
            } ${limite && d > limite ? "opacity-70" : ""}`}
          >
            <span className="block font-semibold">{d === hoy ? "Hoy" : fechaCorta(d)}</span>
            <span className="block text-[11px] text-slate-500">{libresDe(d)} espacios libres</span>
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-slate-500">Cargando la agenda...</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <div className="grid min-w-[480px]" style={{ gridTemplateColumns: `4.5rem repeat(${unidades}, minmax(9rem, 1fr))` }}>
            <div />
            {Array.from({ length: unidades }, (_, u) => (
              <div key={u} className="px-2 pb-2 text-center text-xs font-semibold text-slate-600">
                Unidad {u + 1}
              </div>
            ))}
            <div className="relative">
              {bloques.map((b) => (
                <div key={b.toISOString()} className="pr-2 text-right text-[11px] text-slate-400" style={{ height: ALTO_BLOQUE }}>
                  {textoHora(b)}
                </div>
              ))}
            </div>
            {Array.from({ length: unidades }, (_, u) => {
              const unidad = u + 1;
              return (
                <div key={unidad} className="relative border-l border-slate-100">
                  {bloques.map((b) => {
                    const pasado = b.getTime() < ahora;
                    const libre = !ocupado(unidad, b) && !pasado;
                    return (
                      <button
                        key={b.toISOString()}
                        disabled={!libre}
                        onClick={() => setFormulario({ unidad, inicio: b.toISOString() })}
                        aria-label={libre ? `Agendar en la unidad ${unidad} a las ${textoHora(b)}` : undefined}
                        className={`block w-full border-b border-slate-100 text-left text-[11px] ${
                          libre ? "hover:bg-blue-50 focus:bg-blue-50" : pasado ? "bg-slate-50" : ""
                        }`}
                        style={{ height: ALTO_BLOQUE }}
                      />
                    );
                  })}
                  {citasDelDia
                    .filter((c) => c.unidad === unidad)
                    .map((c) => {
                      const inicio = new Date(c.inicio);
                      const desdeInicio = (inicio.getTime() - bloques[0].getTime()) / (BLOQUE_MIN * 60_000);
                      return (
                        <button
                          key={c.id}
                          onClick={() => !c.deRelleno && setFormulario({ unidad, inicio: c.inicio, cita: c })}
                          disabled={c.deRelleno}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] leading-tight ${
                            c.deRelleno ? "border-slate-200 bg-slate-100 text-slate-500" : COLOR_ESTADO[c.estado]
                          }`}
                          style={{ top: desdeInicio * ALTO_BLOQUE + 1, height: (c.duracionMin / BLOQUE_MIN) * ALTO_BLOQUE - 2 }}
                          title={`${textoHora(inicio)} · ${c.pacienteNombre} · ${nombreTipo(c.tipo)} · ${nombreEstado(c.estado)}`}
                        >
                          <span className="block truncate font-semibold">{c.pacienteNombre}</span>
                          {/* En una cita de un solo bloque no cabe la segunda línea. */}
                          {c.duracionMin > BLOQUE_MIN && (
                            <span className="block truncate">{c.deRelleno ? "Ocupado" : `${nombreTipo(c.tipo)} · ${nombreEstado(c.estado)}`}</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {formulario && (
        <FormularioCita
          jornada={jornada}
          unidad={formulario.unidad}
          inicio={formulario.inicio}
          cita={formulario.cita}
          paciente={paciente}
          atencionId={atencionId ?? null}
          solicitadaEn={solicitadaEn ?? null}
          practica={practica}
          fueraDePlazo={Boolean(limite && diaColombia(new Date(formulario.inicio)) > limite)}
          onCerrar={() => setFormulario(null)}
          onGuardada={() => {
            setFormulario(null);
            setVersion((v) => v + 1);
            onAgendada?.();
          }}
        />
      )}
    </section>
  );
}

function FormularioCita({
  jornada,
  unidad,
  inicio,
  cita,
  paciente,
  atencionId,
  solicitadaEn,
  practica,
  fueraDePlazo,
  onCerrar,
  onGuardada,
}: {
  jornada: string | null;
  unidad: number;
  inicio: string;
  cita?: Cita;
  paciente?: PacienteParaCita;
  atencionId: string | null;
  solicitadaEn: string | null;
  practica: boolean;
  fueraDePlazo: boolean;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [tipo, setTipo] = useState<TipoCita>(cita?.tipo ?? "TRATAMIENTO");
  const [duracion, setDuracion] = useState(cita?.duracionMin ?? duracionSugerida("TRATAMIENTO"));
  const [motivo, setMotivo] = useState(cita?.motivo ?? "");
  const [nombre, setNombre] = useState(cita?.pacienteNombre ?? paciente?.nombre ?? "");
  const [documento, setDocumento] = useState(cita?.pacienteDocumento ?? paciente?.documento ?? "");
  const [telefono, setTelefono] = useState(cita?.pacienteTelefono ?? paciente?.telefono ?? "");
  const [acudiente, setAcudiente] = useState(cita?.acudienteNombre ?? paciente?.acudiente ?? "");
  const [pedida, setPedida] = useState(cita?.fechaPedidaPorPaciente ?? false);
  const [observaciones, setObservaciones] = useState(cita?.observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const fecha = new Date(inicio);

  async function enviar(cuerpo: Record<string, unknown>, metodo: "POST" | "PATCH") {
    setGuardando(true);
    setError(null);
    const res = await fetch(cita ? `/api/modulos/odontologia/agenda/${cita.id}` : "/api/modulos/odontologia/agenda", {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jornada, ...cuerpo }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar la cita");
    onGuardada();
  }

  const guardar = () =>
    enviar(
      {
        unidad,
        inicio,
        duracionMin: duracion,
        tipo,
        motivo,
        pacienteNombre: nombre,
        pacienteDocumento: documento,
        pacienteTelefono: telefono || null,
        acudienteNombre: acudiente || null,
        solicitadaEn,
        fechaPedidaPorPaciente: pedida,
        observaciones: observaciones || null,
        atencionId,
      },
      cita ? "PATCH" : "POST"
    );

  const claseInput = "mt-1 w-full rounded-xl border border-blue-200 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-blue-950/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-cita" className="tarjeta w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <h3 id="titulo-cita" className="font-heading text-lg font-bold text-blue-900">
          {cita ? "Cita" : "Nueva cita"}
        </h3>
        <p className="text-sm text-slate-600">
          {inicial(fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }))} ·{" "}
          {textoHora(fecha)} · Unidad {unidad}
        </p>
        {fueraDePlazo && !pedida && (
          <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            Esta fecha supera los {OPORTUNIDAD_DIAS_HABILES} días hábiles de oportunidad.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-700">
            Tipo de cita
            <select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoCita;
                setTipo(t);
                setDuracion(duracionSugerida(t, motivo));
              }}
              className={claseInput}
            >
              {TIPOS_CITA.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            Duración
            <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className={claseInput}>
              {[20, 40, 60, 80, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700 sm:col-span-2">
            Motivo (qué se va a hacer)
            <input
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (!cita) setDuracion(duracionSugerida(tipo, e.target.value));
              }}
              placeholder="Ej. Resina en 36 y 46"
              className={claseInput}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-500">{TIPOS_CITA.find((t) => t.codigo === tipo)?.ayuda}</span>
          </label>
          <label className="text-xs font-medium text-slate-700">
            Paciente
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={claseInput} />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Documento
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" className={claseInput} />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Teléfono para confirmar
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={claseInput} />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Acudiente (si es menor)
            <input value={acudiente} onChange={(e) => setAcudiente(e.target.value)} className={claseInput} />
          </label>
          <label className="text-xs font-medium text-slate-700 sm:col-span-2">
            Observaciones
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={claseInput} />
          </label>
          {!practica && (
            <label className="flex items-start gap-2 text-xs text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={pedida} onChange={(e) => setPedida(e.target.checked)} className="mt-0.5" />
              El paciente pidió expresamente esta fecha (excepción al plazo de {OPORTUNIDAD_DIAS_HABILES} días hábiles)
            </label>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={guardar} disabled={guardando} className="btn-primario disabled:opacity-40">
            {guardando ? "Guardando..." : cita ? "Guardar cambios" : "Agendar cita"}
          </button>
          {cita &&
            ESTADOS_CITA.filter((e) => e.codigo !== cita.estado && e.codigo !== "PROGRAMADA").map((e) => (
              <button key={e.codigo} onClick={() => enviar({ estado: e.codigo }, "PATCH")} disabled={guardando} className="btn-suave text-xs">
                {e.codigo === "CANCELADA" ? "Cancelar cita" : `Marcar: ${e.nombre.toLowerCase()}`}
              </button>
            ))}
          <button onClick={onCerrar} className="ml-auto text-sm text-slate-500 hover:underline">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
