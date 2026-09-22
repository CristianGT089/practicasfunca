"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SnapshotPractica, ResultadoBusqueda, EstadoRenglon } from "@/lib/modulos/dispensacion/practica";
import type { ResultadoBusquedaSimulacion, RenglonSimulacion } from "@/lib/simulacion/dispensario";
import { calcularCuotaModeradora } from "@/lib/simulacion/cuotaModeradora";
import type { CategoriaAfiliado } from "@prisma/client";
import PanelMiEspacio, { type EstadoMiEspacio } from "@/components/turnero/PanelMiEspacio";

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Clave para acumular renglones encontrados en el dispensario de Simulación: `recetaId`
 * cuando el medicamento sí está autorizado, o el nombre cuando no (recetaId null) — así
 * varios medicamentos "no autorizados" buscados en la misma visita no se pisan entre sí.
 */
function claveRenglon(r: { recetaId: string | null; medicamentoNombre: string }) {
  return r.recetaId ?? `sin-receta:${r.medicamentoNombre}`;
}

export default function DispensacionPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SnapshotPractica | null>(null);
  const [busqueda, setBusqueda] = useState<ResultadoBusqueda | null>(null);
  const [documento, setDocumento] = useState("");
  const [buscando, setBuscando] = useState(false);
  // Un puesto temporal (entró derecho aquí, sin panel) no tiene a dónde "salir": mejor
  // cerrarle la sesión que mandarlo a un /panel que lo rebota de vuelta acá.
  const [cuentaConRutaDirecta, setCuentaConRutaDirecta] = useState(false);
  // Si el turnero de este espacio pertenece a una Simulación, la práctica libre de casos
  // queda de lado: se atiende al paciente que trae el turno actual (pool generado).
  const [estadoTurno, setEstadoTurno] = useState<EstadoMiEspacio>({ simulacionId: null, paciente: null });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setCuentaConRutaDirecta(Boolean(data.usuario?.rutaDirecta)))
      .catch(() => {});
  }, []);

  async function salir() {
    if (cuentaConRutaDirecta) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } else {
      router.push("/panel");
    }
  }

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
            <button onClick={salir} className="text-blue-100 hover:text-white">
              {cuentaConRutaDirecta ? "Cerrar sesión" : "Salir"}
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <PanelMiEspacio onEstado={setEstadoTurno} />

          {estadoTurno.simulacionId ? (
            <DispensarioSimulacion simulacionId={estadoTurno.simulacionId} paciente={estadoTurno.paciente} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function pesos(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/**
 * Modo Simulación: el paciente lo trae el turno (no hay "casos" ni secuencia), y el
 * consumo/la cuota moderadora se registran contra la simulación compartida, no contra el
 * usuario. Se autobusca cada vez que cambia el paciente del turno actual.
 */
function DispensarioSimulacion({
  simulacionId,
  paciente,
}: {
  simulacionId: string;
  // El paciente que emitió el turno (para saber que hay alguien esperando y para avisar
  // si el estudiante buscó a otra persona) — NO se muestra en pantalla: el estudiante
  // tiene que pedir el documento y buscarlo, como en la ventanilla real.
  paciente: { nombre: string; cedula: string } | null;
}) {
  const [documento, setDocumento] = useState("");
  const [resultado, setResultado] = useState<ResultadoBusquedaSimulacion | null>(null);
  const [buscando, setBuscando] = useState(false);
  // Lo que el ESTUDIANTE marca al leer el diagnóstico — decide la cuota, no lo que el
  // sistema ya sepa del paciente (ver docs/simulacion.md).
  const [altoCostoMarcado, setAltoCostoMarcado] = useState(false);
  // Igual que el diagnóstico: los medicamentos que hay que entregar NO se muestran de una
  // vez — el estudiante busca cada uno por nombre, como en el dispensario real. Van
  // acumulándose acá a medida que los encuentra (por recetaId, para no duplicar).
  const [medicamentoTexto, setMedicamentoTexto] = useState("");
  const [buscandoMed, setBuscandoMed] = useState(false);
  const [medError, setMedError] = useState<string | null>(null);
  const [renglonesEncontrados, setRenglonesEncontrados] = useState<Record<string, RenglonSimulacion>>({});

  // Si cambia el turno atendido (nuevo paciente en la ventanilla), se limpia todo — no debe
  // quedar visible la ficha ni los medicamentos de la persona pasada.
  useEffect(() => {
    setDocumento("");
    setResultado(null);
    setAltoCostoMarcado(false);
    setMedicamentoTexto("");
    setMedError(null);
    setRenglonesEncontrados({});
  }, [paciente?.cedula]);

  async function buscar() {
    if (!documento.trim() || buscando) return;
    setBuscando(true);
    const res = await fetch("/api/modulos/dispensacion/simulacion/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulacionId, cedula: documento.trim() }),
    });
    setResultado(await res.json());
    setRenglonesEncontrados({});
    setBuscando(false);
  }

  async function buscarMedicamento() {
    if (!medicamentoTexto.trim() || buscandoMed) return;
    setBuscandoMed(true);
    setMedError(null);
    const res = await fetch("/api/modulos/dispensacion/simulacion/buscar-medicamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulacionId, cedula: documento.trim(), texto: medicamentoTexto.trim() }),
    });
    const data: { encontrado: boolean; renglones: RenglonSimulacion[] } = await res.json();
    setBuscandoMed(false);
    if (!data.encontrado) {
      setMedError(`"${medicamentoTexto}" no se encontró en el catálogo del sistema.`);
      return;
    }
    setRenglonesEncontrados((actual) => {
      const copia = { ...actual };
      for (const r of data.renglones) copia[claveRenglon(r)] = r;
      return copia;
    });
    setMedicamentoTexto("");
  }

  /** Vuelve a buscar un renglón puntual por su propio nombre — para refrescarlo tras entregar/rechazar. */
  async function refrescarRenglon(nombreMedicamento: string) {
    const res = await fetch("/api/modulos/dispensacion/simulacion/buscar-medicamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulacionId, cedula: documento.trim(), texto: nombreMedicamento }),
    });
    const data: { encontrado: boolean; renglones: RenglonSimulacion[] } = await res.json();
    if (!data.encontrado) return;
    setRenglonesEncontrados((actual) => {
      const copia = { ...actual };
      for (const r of data.renglones) copia[claveRenglon(r)] = r;
      return copia;
    });
  }

  if (!paciente) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
        <p className="text-sm text-slate-500">Aún no tienes un turno con paciente asignado.</p>
      </div>
    );
  }

  // Buscador: el estudiante pide el documento a la persona en la ventanilla y lo escribe
  // acá — el sistema no revela quién es solo porque el turno ya está asignado.
  const buscador = (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5">
      <p className="text-sm font-heading font-semibold text-blue-900 mb-1">Buscar en el sistema</p>
      <p className="text-xs text-slate-400 mb-3">Pídele el documento de identidad a la persona y búscalo.</p>
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
      {resultado && !resultado.encontrado && (
        <p className="text-sm text-red-600 mt-3">
          No se encontró ningún paciente con el documento <b>{documento}</b> en esta simulación.
        </p>
      )}
    </div>
  );

  if (!resultado?.encontrado || !resultado.paciente) return buscador;

  // A propósito NO se compara contra la cédula del turno asignado: el sistema, en la vida
  // real, no sabe a quién le toca — solo busca lo que le pidan. Si el estudiante mete la
  // cédula equivocada (o mezcla el turno de otra persona), el error debe ser suyo y visible,
  // no algo que la pantalla le prevenga.
  const p = resultado.paciente;
  const listaEncontrados = Object.values(renglonesEncontrados);
  // Solo cuenta lo que sí tiene receta — lo gestionado sin receta no hace parte de "la
  // fórmula de este paciente", así que no debe sumar para el progreso ni para el "Listo".
  const gestionados = listaEncontrados.filter((r) => r.recetaId && r.yaGestionado).length;
  const todoGestionado = resultado.totalRenglones > 0 && gestionados >= resultado.totalRenglones;

  return (
    <>
      {buscador}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading font-semibold text-blue-900">{p.nombre}</p>
            <p className="text-xs text-slate-500">
              CC {p.cedula} · {p.edad} años
              {p.diagnostico && (
                <>
                  {" · "}
                  <span className="font-medium text-slate-700">{p.diagnostico}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {p.alergias.length > 0 && (
          <p className="mt-2 text-xs">
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">Alergias</span>{" "}
            <span className="text-slate-700">{p.alergias.join(", ")}</span>
          </p>
        )}
        {p.antecedentes && <p className="mt-1 text-xs text-slate-500">{p.antecedentes}</p>}
      </div>

      <CuotaModeradoraCard
        categoriaAfiliado={p.categoriaAfiliado}
        cuota={resultado.cuota}
        altoCostoMarcado={altoCostoMarcado}
        onCambiarMarca={setAltoCostoMarcado}
        esAltoCostoReal={p.esAltoCosto}
      />

      {resultado.personaEnVentanilla && (
        <div
          className={`rounded-xl border p-4 shadow-sm mb-4 ${
            resultado.personaEnVentanilla.tipo === "SUPLANTACION"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 ${
              resultado.personaEnVentanilla.tipo === "SUPLANTACION" ? "text-red-700" : "text-amber-800"
            }`}
          >
            {resultado.personaEnVentanilla.tipo === "SUPLANTACION"
              ? "La persona en la ventanilla NO es el paciente"
              : "La persona en la ventanilla no es el paciente — dice ser un tercero autorizado"}
          </p>
          <p className="text-sm text-slate-700">
            {resultado.personaEnVentanilla.nombre} · CC {resultado.personaEnVentanilla.cedula}
            {resultado.personaEnVentanilla.relacion && ` · ${resultado.personaEnVentanilla.relacion} del paciente`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {resultado.personaEnVentanilla.tipo === "SUPLANTACION"
              ? "El documento no coincide con el del paciente y no hay justificación. No se debe dispensar."
              : "Verifica el parentesco/justificación antes de entregar y déjalo registrado."}
          </p>
        </div>
      )}

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-4">
        <p className="text-sm font-heading font-semibold text-blue-900 mb-1">Buscar medicamento en el sistema</p>
        <p className="text-xs text-slate-400 mb-3">
          Pídele a la persona qué necesita y búscalo — no se muestran de una vez.
          {resultado.totalRenglones > 0 && (
            <span className="ml-1 text-slate-500">
              ({gestionados} de {resultado.totalRenglones} gestionados)
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <input
            value={medicamentoTexto}
            onChange={(e) => setMedicamentoTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarMedicamento()}
            placeholder="Nombre del medicamento"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={buscarMedicamento}
            disabled={buscandoMed || !medicamentoTexto.trim()}
            className="rounded-lg bg-blue-800 px-4 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
          >
            Buscar
          </button>
        </div>
        {medError && <p className="text-sm text-red-600 mt-3">{medError}</p>}
      </div>

      {listaEncontrados.length > 0 && (
        <div className="flex flex-col gap-3">
          {listaEncontrados.map((r) => (
            <RenglonCardSimulacion
              key={claveRenglon(r)}
              simulacionId={simulacionId}
              cedula={documento}
              renglon={r}
              altoCostoMarcado={altoCostoMarcado}
              onCambio={() => refrescarRenglon(r.medicamentoNombre)}
            />
          ))}
        </div>
      )}

      {todoGestionado && (
        <p className="mt-6 text-center text-sm text-emerald-700 font-medium">
          Listo — pasa el turno desde el panel de arriba cuando termines.
        </p>
      )}
    </>
  );
}

/**
 * El estudiante lee el diagnóstico (mostrado arriba) y marca si califica como "alto costo"
 * — eso, no una bandera que el sistema ya conozca, es lo que decide la cuota. Una vez
 * cobrada (con la primera entrega del paciente en la simulación) queda fija y se muestra
 * si acertó.
 */
function CuotaModeradoraCard({
  categoriaAfiliado,
  cuota,
  altoCostoMarcado,
  onCambiarMarca,
  esAltoCostoReal,
}: {
  categoriaAfiliado: CategoriaAfiliado | null;
  cuota: ResultadoBusquedaSimulacion["cuota"];
  altoCostoMarcado: boolean;
  onCambiarMarca: (v: boolean) => void;
  esAltoCostoReal: boolean | null;
}) {
  if (cuota.cobrada) {
    return (
      <div
        className={`rounded-xl border p-4 shadow-sm mb-4 ${
          cuota.correcto ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${cuota.correcto ? "text-emerald-800" : "text-amber-800"}`}>
            {cuota.correcto ? "✓ Cuota moderadora aplicada correctamente" : "✗ Revisa: marcaste mal el alto costo"}
          </p>
          <p className="font-heading text-lg font-bold text-blue-900">{pesos(cuota.montoAplicado ?? 0)}</p>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Marcaste: {cuota.altoCostoMarcado ? "alto costo" : "no alto costo"}. En el sistema, este paciente{" "}
          {esAltoCostoReal ? "sí tiene" : "no tiene"} un diagnóstico de alto costo.
        </p>
      </div>
    );
  }

  const cuotaPrevia = calcularCuotaModeradora(categoriaAfiliado, altoCostoMarcado);
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-4">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={altoCostoMarcado}
          onChange={(e) => onCambiarMarca(e.target.checked)}
          className="h-4 w-4"
        />
        El diagnóstico es de alto costo (exento de cuota moderadora)
      </label>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">Cuota moderadora a cobrar (según lo que marques)</p>
        <p className="font-heading text-lg font-bold text-blue-900">{pesos(cuotaPrevia)}</p>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Se cobra una sola vez por atención, al entregar o rechazar el primer renglón.
      </p>
    </div>
  );
}

/**
 * Sin ningún aviso ni bloqueo: el sistema muestra el medicamento (esté o no autorizado
 * para este paciente, ver docs/simulacion.md) con sus datos crudos, y "Entregar"/"Rechazar"
 * siempre están disponibles. Que sea correcto o no depende de que el estudiante lo compare
 * contra la fórmula física — la pantalla no se lo dice.
 */
function RenglonCardSimulacion({
  simulacionId,
  cedula,
  renglon,
  altoCostoMarcado,
  onCambio,
}: {
  simulacionId: string;
  cedula: string;
  renglon: RenglonSimulacion;
  altoCostoMarcado: boolean;
  onCambio: () => void;
}) {
  const [cantidad, setCantidad] = useState(renglon.cantidadAutorizada || 1);
  const [enviando, setEnviando] = useState(false);

  async function accion(body: Record<string, unknown>) {
    setEnviando(true);
    await fetch("/api/modulos/dispensacion/simulacion/dispensar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulacionId,
        cedula,
        recetaId: renglon.recetaId,
        medicamentoId: renglon.medicamentoId,
        altoCostoMarcado,
        ...body,
      }),
    });
    setEnviando(false);
    onCambio();
  }

  const gestionado = renglon.yaGestionado;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-blue-900">{renglon.medicamentoNombre}</p>
          <p className="text-xs text-slate-500">{renglon.presentacion}</p>
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

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
        <span>
          Autorizado: <b className="text-slate-700">{renglon.cantidadAutorizada}</b>
        </span>
        <span>
          Redimido: <b className="text-slate-700">{renglon.cantidadRedimida}</b>
        </span>
        <span>
          Disponible: <b className="text-slate-700">{renglon.saldoDisponible}</b>
        </span>
      </div>

      {!gestionado && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => accion({ cantidad })}
            disabled={enviando || cantidad < 1}
            className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 disabled:opacity-40"
          >
            Entregar
          </button>
          <button
            onClick={() => accion({ rechazar: true })}
            disabled={enviando}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      )}
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
