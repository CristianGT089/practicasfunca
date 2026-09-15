"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SnapshotPractica, ResultadoBusqueda, EstadoRenglon } from "@/lib/modulos/dispensacion/practica";
import PanelMiEspacio from "@/components/turnero/PanelMiEspacio";

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DispensacionPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SnapshotPractica | null>(null);
  const [busqueda, setBusqueda] = useState<ResultadoBusqueda | null>(null);
  const [documento, setDocumento] = useState("");
  const [buscando, setBuscando] = useState(false);

  const cargarSesion = useCallback(async () => {
    const res = await fetch("/api/modulos/dispensacion/sesion");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    setSnapshot(await res.json());
    setBusqueda(null);
    setDocumento("");
  }, [router]);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  async function buscar() {
    if (!documento.trim() || buscando) return;
    setBuscando(true);
    const res = await fetch("/api/modulos/dispensacion/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento: documento.trim() }),
    });
    setBusqueda(await res.json());
    setBuscando(false);
  }

  async function refrescarBusqueda() {
    const res = await fetch("/api/modulos/dispensacion/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento: documento.trim() }),
    });
    setBusqueda(await res.json());
  }

  async function siguiente() {
    const res = await fetch("/api/modulos/dispensacion/sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "siguiente" }),
    });
    setSnapshot(await res.json());
    setBusqueda(null);
    setDocumento("");
  }

  async function reiniciar() {
    const res = await fetch("/api/modulos/dispensacion/sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "reiniciar" }),
    });
    setSnapshot(await res.json());
    setBusqueda(null);
    setDocumento("");
  }

  const caso = snapshot?.caso ?? null;
  const todoGestionado =
    busqueda?.esPacienteDeLaFormula && busqueda.renglones.length > 0 && busqueda.renglones.every((r) => r.yaGestionado);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Dispensación</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {snapshot && snapshot.progreso.total > 0 && !snapshot.terminado && (
              <span className="text-blue-100">
                Caso {Math.min(snapshot.progreso.indice + 1, snapshot.progreso.total)} de {snapshot.progreso.total}
              </span>
            )}
            <button onClick={() => router.push("/panel")} className="text-blue-100 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <PanelMiEspacio />

          {!snapshot && <p className="text-slate-500 text-sm">Cargando...</p>}

          {snapshot && (snapshot.terminado || !caso) && (
            <div className="rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
              <p className="font-heading text-lg font-bold text-blue-900 mb-1">
                {snapshot.progreso.total === 0 ? "Todavía no hay casos" : "Terminaste la práctica"}
              </p>
              <p className="text-sm text-slate-500 mb-5">
                {snapshot.progreso.total === 0
                  ? "Pídele a tu profesor que agregue casos de dispensación."
                  : `Atendiste los ${snapshot.progreso.total} casos.`}
              </p>
              {snapshot.progreso.total > 0 && (
                <button
                  onClick={reiniciar}
                  className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  Volver a empezar
                </button>
              )}
            </div>
          )}

          {snapshot && !snapshot.terminado && caso && (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-heading text-xl font-bold text-blue-900">{caso.titulo}</h1>
                  {caso.contexto && <p className="text-sm text-slate-500 mt-1">{caso.contexto}</p>}
                </div>
                <button onClick={reiniciar} className="shrink-0 text-xs text-slate-400 hover:text-slate-600">
                  Reiniciar práctica
                </button>
              </div>

              {/* Fórmulas que trae el paciente */}
              <div className="flex flex-col gap-3 mb-5">
                {caso.formulas.map((f) => (
                  <div key={f.id} className="rounded-xl border border-slate-300 bg-[#fffdf7] shadow-sm overflow-hidden">
                    <div className="bg-blue-900 px-4 py-2 flex items-center justify-between">
                      <span className="font-heading text-xs font-bold tracking-wide text-white">FÓRMULA MÉDICA</span>
                      {!f.cargadaEnSistema && (
                        <span className="text-[10px] font-semibold text-amber-300">médico particular</span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                        <span className="text-slate-400">Médico</span>
                        <span className="text-slate-700 font-medium">{f.medico}</span>
                        <span className="text-slate-400">Reg. médico</span>
                        <span className="text-slate-700">{f.registroMedico}</span>
                        <span className="text-slate-400">Emitida</span>
                        <span className="text-slate-700">{fechaCorta(f.fechaEmision)}</span>
                        <span className="text-slate-400">Vigente hasta</span>
                        <span className={f.vencida ? "text-red-600 font-semibold" : "text-slate-700"}>
                          {fechaCorta(f.vigenteHasta)}
                          {f.vencida ? " · vencida" : ""}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-slate-300 pt-2 flex flex-col gap-1.5">
                        {f.renglones.map((r) => (
                          <div key={r.id} className="text-sm">
                            <span className="font-semibold text-blue-900">{r.medicamentoNombre}</span>{" "}
                            <span className="text-slate-500">· {r.presentacion}</span>
                            <div className="text-xs text-slate-600">
                              Cantidad:{" "}
                              {r.cantidadTachada != null && (
                                <span className="line-through text-red-500 mr-1">{r.cantidadTachada}</span>
                              )}
                              <span className={r.cantidadTachada != null ? "font-firma text-base text-red-700" : ""}>
                                {r.cantidad}
                              </span>
                              {r.posologia ? ` · ${r.posologia}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                      {f.nota && <p className="text-[11px] text-amber-700 mt-2 italic">{f.nota}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Buscar al paciente */}
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5">
                <p className="text-sm font-heading font-semibold text-blue-900 mb-1">Buscar al paciente en el sistema</p>
                <p className="text-xs text-slate-400 mb-3">
                  La persona en la ventanilla presenta el documento{" "}
                  <span className="font-mono font-semibold text-slate-600">{caso.personaPresenta.documento}</span>.
                </p>
                <div className="flex gap-2">
                  <input
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    placeholder="Número de documento"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={buscar}
                    disabled={buscando || !documento.trim()}
                    className="rounded-lg bg-blue-800 px-4 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
                  >
                    Buscar
                  </button>
                </div>

                {busqueda && !busqueda.encontrado && (
                  <p className="text-sm text-red-600 mt-3">
                    No se encontró ningún paciente con el documento <b>{documento}</b>.
                  </p>
                )}
                {busqueda?.encontrado && !busqueda.esPacienteDeLaFormula && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    Encontraste a <b>{busqueda.paciente?.nombre}</b> ({busqueda.paciente?.cedula}), pero la fórmula está
                    a nombre de otra persona. No dispenses.
                  </div>
                )}
              </div>

              {/* Ficha + renglones */}
              {busqueda?.esPacienteDeLaFormula && busqueda.paciente && (
                <>
                  <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-semibold text-blue-900">{busqueda.paciente.nombre}</p>
                        <p className="text-xs text-slate-500">
                          CC {busqueda.paciente.cedula} · {busqueda.paciente.edad} años
                        </p>
                      </div>
                      {!busqueda.identidadCoincide && (
                        <span className="rounded bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                          Identidad no verificada
                        </span>
                      )}
                    </div>
                    {busqueda.paciente.alergias.length > 0 && (
                      <p className="mt-2 text-xs">
                        <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">Alergias</span>{" "}
                        <span className="text-slate-700">{busqueda.paciente.alergias.join(", ")}</span>
                      </p>
                    )}
                    {busqueda.paciente.antecedentes && (
                      <p className="mt-1 text-xs text-slate-500">{busqueda.paciente.antecedentes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {busqueda.renglones.map((r) => (
                      <RenglonCard key={r.renglonId} renglon={r} onCambio={refrescarBusqueda} />
                    ))}
                  </div>

                  <button
                    onClick={siguiente}
                    className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                      todoGestionado
                        ? "bg-blue-800 text-white hover:bg-blue-900"
                        : "border border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {todoGestionado ? "Siguiente paciente" : "Pasar al siguiente paciente sin terminar"}
                  </button>
                </>
              )}

              {!busqueda?.esPacienteDeLaFormula && (
                <button
                  onClick={siguiente}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  Siguiente paciente
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RenglonCard({ renglon, onCambio }: { renglon: EstadoRenglon; onCambio: () => void }) {
  const [cantidad, setCantidad] = useState(renglon.maxEntregable || renglon.cantidad);
  const [motivo, setMotivo] = useState("");
  const [modoRechazo, setModoRechazo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function accion(body: unknown) {
    setEnviando(true);
    await fetch("/api/modulos/dispensacion/dispensar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEnviando(false);
    setModoRechazo(false);
    onCambio();
  }

  const gestionado = renglon.yaGestionado;
  const hayBloqueo = renglon.avisos.some((a) => a.nivel === "BLOQUEO");
  const colorAviso = (nivel: string) =>
    nivel === "BLOQUEO" ? "text-red-700 bg-red-50" : nivel === "ALERTA" ? "text-amber-800 bg-amber-50" : "text-slate-600 bg-slate-50";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-blue-900">{renglon.medicamentoNombre}</p>
          <p className="text-xs text-slate-500">Fórmula: {renglon.cantidad} unidades</p>
        </div>
        {gestionado ? (
          <span
            className={`rounded px-2 py-1 text-[11px] font-semibold ${
              gestionado.resultado === "ENTREGADO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            {gestionado.resultado === "ENTREGADO" ? `Entregado ${gestionado.cantidad}` : "Rechazado"}
          </span>
        ) : null}
      </div>

      {renglon.autorizacion ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
          <span>Autorizado: <b className="text-slate-700">{renglon.autorizacion.cantidadAutorizada}</b></span>
          <span>Redimido: <b className="text-slate-700">{renglon.autorizacion.cantidadRedimida}</b></span>
          <span>Disponible: <b className="text-slate-700">{renglon.autorizacion.saldoDisponible}</b></span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Sin autorización en el sistema.</p>
      )}

      {/* Los avisos son la guía ANTES de actuar; tras una entrega correcta ya no aplican. */}
      {renglon.avisos.length > 0 && gestionado?.resultado !== "ENTREGADO" && (
        <div className="mt-2 flex flex-col gap-1">
          {renglon.avisos.map((a, i) => (
            <p key={i} className={`rounded px-2 py-1 text-xs ${colorAviso(a.nivel)}`}>
              {a.mensaje}
            </p>
          ))}
        </div>
      )}

      {!gestionado && (
        <div className="mt-3">
          {modoRechazo ? (
            <div className="flex gap-2">
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo del rechazo"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => accion({ renglonId: renglon.renglonId, rechazar: true, motivo })}
                disabled={enviando}
                className="rounded-lg bg-slate-700 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Confirmar
              </button>
              <button onClick={() => setModoRechazo(false)} className="text-xs text-slate-400 px-2">
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {!hayBloqueo && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => accion({ renglonId: renglon.renglonId, cantidad })}
                    disabled={enviando || cantidad < 1}
                    className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 disabled:opacity-40"
                  >
                    Entregar
                  </button>
                </>
              )}
              <button
                onClick={() => setModoRechazo(true)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Rechazar
              </button>
              {hayBloqueo && (
                <span className="text-xs text-red-600">El sistema no permite dispensar este renglón.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
