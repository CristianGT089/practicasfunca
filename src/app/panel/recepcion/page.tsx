"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarraTrabajo, claseAccionBarra } from "@/components/nucleo/EncabezadoFunca";
import {
  MOTIVOS,
  TEMPERATURA_MAX,
  TEMPERATURA_MIN,
  VIDA_UTIL_MINIMA_MESES,
  nombreMotivo,
  type MotivoRecepcion,
  type RegistroItem,
} from "@/lib/simulacion/recepcion";
import type { FacturaVista } from "@/lib/simulacion/recepcionJornada";

type Jornada = { id: string; nombre: string } | null;
type Item = FacturaVista["items"][number];

const mesAnioDe = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { month: "short", year: "numeric", timeZone: "UTC" });
};

/**
 * Recepción técnica de medicamentos y dispositivos médicos (jornada presencial). El
 * transportador (un compañero) entrega la factura y las cajas (etiquetas impresas); el
 * receptor compara con la orden de compra, inspecciona cada producto, decide y firma el
 * acta. La pantalla no dice qué está mal: eso lo encuentra el estudiante en las etiquetas.
 */
export default function RecepcionPage() {
  const router = useRouter();
  const [jornada, setJornada] = useState<Jornada | undefined>(undefined);
  const [rutaDirecta, setRutaDirecta] = useState(false);
  const [numero, setNumero] = useState("");
  const [factura, setFactura] = useState<FacturaVista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/recepcion/activa");
    if (res.status === 401) return router.push("/");
    const data = await res.json();
    setJornada(data.jornada);
    setRutaDirecta(Boolean(data.usuario?.rutaDirecta));
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Sin jornada abierta (el computador entró antes): revisa sola cada 10 s.
  useEffect(() => {
    if (jornada !== null) return;
    const id = setInterval(cargar, 10_000);
    return () => clearInterval(id);
  }, [jornada, cargar]);

  async function salir() {
    if (rutaDirecta) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } else router.push("/panel");
  }

  async function abrir(n = numero) {
    if (!n.trim()) return;
    setBuscando(true);
    setError(null);
    const res = await fetch("/api/modulos/recepcion/factura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factura: n.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBuscando(false);
    if (!res.ok) {
      setFactura(null);
      return setError(data.error ?? "No se pudo abrir la factura");
    }
    setFactura(data.factura);
  }

  const barra = (
    <BarraTrabajo titulo="Recepción técnica" subtitulo={jornada?.nombre ?? "Servicio farmacéutico"} ancho="max-w-5xl">
      <button onClick={salir} className={claseAccionBarra}>
        {rutaDirecta ? "Cerrar sesión" : "Salir"}
      </button>
    </BarraTrabajo>
  );

  if (jornada === undefined) return <div className="min-h-screen bg-[var(--background)]">{barra}</div>;
  if (jornada === null) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-heading text-xl font-semibold text-blue-900">No hay una jornada de recepción abierta</h1>
          <p className="mt-2 text-sm text-slate-600">Cuando el docente inicie la jornada, esta pantalla se activa sola.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {barra}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Politica />

        <section className="tarjeta-sm p-4 mb-5">
          <h2 className="text-sm font-heading font-semibold text-blue-900">Recibir un pedido</h2>
          <p className="text-xs text-slate-500 mb-3">Pídele la factura al transportador y búscala por su número.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              abrir();
            }}
            className="flex gap-2"
          >
            <label htmlFor="numero-factura" className="sr-only">
              Número de factura
            </label>
            <input
              id="numero-factura"
              value={numero}
              onChange={(e) => setNumero(e.target.value.toUpperCase())}
              placeholder="Ej. FE-482130"
              className="flex-1 rounded-xl border border-blue-200 px-3 py-2 text-sm uppercase"
            />
            <button type="submit" disabled={buscando || !numero.trim()} className="btn-primario disabled:opacity-40">
              {buscando ? "Buscando..." : "Abrir"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        {factura && (
          <Pedido
            key={factura.id}
            factura={factura}
            onCambio={() => abrir(factura.factura)}
            onTerminar={() => {
              setFactura(null);
              setNumero("");
            }}
          />
        )}
      </main>
    </div>
  );
}

/** Las reglas con las que se decide: visibles siempre, como el procedimiento pegado en la pared. */
function Politica() {
  return (
    <details className="tarjeta-sm mb-5 p-4 text-sm" open>
      <summary className="cursor-pointer font-heading font-semibold text-blue-900">Política de recepción del servicio farmacéutico</summary>
      <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
        <li>• Lo facturado debe estar en la orden de compra; lo que no se pidió se devuelve.</li>
        <li>• Se cuenta lo que llega: un faltante se recibe y queda como novedad en el acta.</li>
        <li>• El lote de la caja debe coincidir con el de la factura.</li>
        <li>• Vida útil mínima al recibir: {VIDA_UTIL_MINIMA_MESES} meses. Vencido o más corto, se rechaza.</li>
        <li>• Sin registro sanitario INVIMA en la etiqueta, no se recibe.</li>
        <li>• Empaque roto, húmedo o abierto: se rechaza.</li>
        <li>
          • Refrigerados: entre {TEMPERATURA_MIN} y {TEMPERATURA_MAX} °C durante el transporte (revisa el registro de temperatura). Fuera de ese
          rango, se rechaza.
        </li>
        <li>• Al terminar, se firma el acta de recepción con las observaciones (Res. 1403 de 2007).</li>
      </ul>
    </details>
  );
}

function Pedido({ factura, onCambio, onTerminar }: { factura: FacturaVista; onCambio: () => void; onTerminar: () => void }) {
  const hechos = factura.items.filter((i) => i.registro).length;
  const total = factura.items.length;
  const cerrado = factura.actaFirmadaEn !== null;

  return (
    <section>
      <div className="tarjeta-sm p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Proveedor</p>
            <p className="font-heading text-lg font-bold text-blue-900">{factura.proveedor}</p>
            <p className="text-xs text-slate-500">NIT {factura.nitProveedor}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-slate-500">Factura</dt>
            <dd className="font-mono font-semibold text-slate-800">{factura.factura}</dd>
            <dt className="text-slate-500">Orden de compra</dt>
            <dd className="font-mono font-semibold text-slate-800">{factura.ordenCompra}</dd>
            <dt className="text-slate-500">Inspeccionados</dt>
            <dd className="font-semibold text-slate-800">
              {hechos} de {total}
            </dd>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {factura.items.map((item, i) => (
          <ProductoRecepcion key={item.id} item={item} numero={i + 1} cerrado={cerrado} onGuardado={onCambio} />
        ))}
      </div>

      <Acta factura={factura} completo={hechos === total} onFirmada={onCambio} onTerminar={onTerminar} />
    </section>
  );
}

const vacio = (): RegistroItem => ({
  cantidadContada: 0,
  lote: "",
  vencimiento: "",
  registroInvima: "",
  temperatura: null,
  empaqueIntegro: true,
  decision: "ACEPTAR",
  motivo: null,
});

function ProductoRecepcion({ item, numero, cerrado, onGuardado }: { item: Item; numero: number; cerrado: boolean; onGuardado: () => void }) {
  const [editando, setEditando] = useState(!item.registro && !cerrado);
  const [r, setR] = useState<RegistroItem>(item.registro ?? vacio());
  const [sinRegistro, setSinRegistro] = useState(item.registro ? item.registro.registroInvima === "" : false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (c: Partial<RegistroItem>) => setR((x) => ({ ...x, ...c }));

  async function guardar() {
    setError(null);
    if (!r.lote.trim() || !r.vencimiento) return setError("Anota el lote y el vencimiento que trae la caja");
    if (item.requiereFrio && r.temperatura === null) return setError("Anota la temperatura del registro del transporte");
    if (r.decision === "RECHAZAR" && !r.motivo) return setError("Al rechazar, elige el motivo");
    setGuardando(true);
    const res = await fetch("/api/modulos/recepcion/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, registro: { ...r, registroInvima: sinRegistro ? "" : r.registroInvima } }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar");
    setEditando(false);
    onGuardado();
  }

  const claseInput = "mt-1 w-full rounded-xl border border-blue-200 px-3 py-2 text-sm";
  const id = (campo: string) => `${item.id}-${campo}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">Producto {numero}</p>
          <h3 className="font-heading font-semibold text-blue-900">{item.nombre}</h3>
          <p className="text-xs text-slate-500">
            {item.presentacion}
            {item.laboratorio ? ` · ${item.laboratorio}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="pildora bg-slate-100 text-slate-600">{item.esDispositivo ? "Dispositivo médico" : "Medicamento"}</span>
          {item.requiereFrio && <span className="pildora bg-sky-100 text-sky-800">Refrigerado {TEMPERATURA_MIN}–{TEMPERATURA_MAX} °C</span>}
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <DatoDoc etiqueta="Orden de compra" valor={item.cantidadPedida > 0 ? `${item.cantidadPedida} unid.` : "No aparece"} />
        <DatoDoc etiqueta="Factura" valor={`${item.cantidadFacturada} unid.`} />
        <DatoDoc etiqueta="Lote (factura)" valor={item.loteFacturado} mono />
        <DatoDoc etiqueta="Vence (factura)" valor={mesAnioDe(item.vencimientoFacturado)} />
      </dl>

      {!editando && item.registro ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-700">
            <b className={item.registro.decision === "ACEPTAR" ? "text-emerald-700" : "text-red-700"}>
              {item.registro.decision === "ACEPTAR" ? "Aceptado" : "Rechazado"}
            </b>
            {item.registro.motivo && <> · {nombreMotivo(item.registro.motivo)}</>} · contadas {item.registro.cantidadContada} · lote{" "}
            {item.registro.lote}
          </span>
          {!cerrado && (
            <button onClick={() => setEditando(true)} className="text-xs text-blue-700 hover:underline">
              Corregir
            </button>
          )}
        </div>
      ) : (
        !cerrado && (
          <fieldset className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <legend className="px-1 text-xs font-semibold text-blue-900">Lo que ves en la caja</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor={id("cant")} className="text-xs font-medium text-slate-700">
                Cantidad contada
                <input
                  id={id("cant")}
                  type="number"
                  min={0}
                  value={r.cantidadContada}
                  onChange={(e) => cambiar({ cantidadContada: Number(e.target.value) })}
                  className={claseInput}
                />
              </label>
              <label htmlFor={id("lote")} className="text-xs font-medium text-slate-700">
                Lote
                <input id={id("lote")} value={r.lote} onChange={(e) => cambiar({ lote: e.target.value.toUpperCase() })} className={`${claseInput} font-mono uppercase`} />
              </label>
              <label htmlFor={id("vence")} className="text-xs font-medium text-slate-700">
                Vence (mes y año)
                <input id={id("vence")} type="month" value={r.vencimiento} onChange={(e) => cambiar({ vencimiento: e.target.value })} className={claseInput} />
              </label>
              <div className="sm:col-span-2">
                <label htmlFor={id("invima")} className="text-xs font-medium text-slate-700">
                  Registro sanitario INVIMA (como está en la etiqueta)
                </label>
                <input
                  id={id("invima")}
                  value={sinRegistro ? "" : r.registroInvima}
                  disabled={sinRegistro}
                  onChange={(e) => cambiar({ registroInvima: e.target.value.toUpperCase() })}
                  className={`${claseInput} font-mono uppercase disabled:bg-slate-100`}
                />
                <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={sinRegistro} onChange={(e) => setSinRegistro(e.target.checked)} />
                  La etiqueta no trae registro sanitario
                </label>
              </div>
              {item.requiereFrio ? (
                <label htmlFor={id("temp")} className="text-xs font-medium text-slate-700">
                  Temperatura del transporte (°C)
                  <input
                    id={id("temp")}
                    type="number"
                    step="0.1"
                    value={r.temperatura ?? ""}
                    onChange={(e) => cambiar({ temperatura: e.target.value === "" ? null : Number(e.target.value) })}
                    className={claseInput}
                  />
                </label>
              ) : (
                <div />
              )}
              <div className="text-xs font-medium text-slate-700">
                Empaque
                <div className="mt-1 flex gap-2">
                  {[
                    [true, "Íntegro"],
                    [false, "Dañado"],
                  ].map(([valor, texto]) => (
                    <label
                      key={String(valor)}
                      className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer bg-white ${r.empaqueIntegro === valor ? "border-blue-600" : "border-slate-200"}`}
                    >
                      <input type="radio" name={id("empaque")} checked={r.empaqueIntegro === valor} onChange={() => cambiar({ empaqueIntegro: valor as boolean })} />
                      {texto as string}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="text-xs font-medium text-slate-700">
                Decisión
                <div className="mt-1 flex gap-2">
                  {(
                    [
                      ["ACEPTAR", "Aceptar"],
                      ["RECHAZAR", "Rechazar y devolver"],
                    ] as const
                  ).map(([valor, texto]) => (
                    <label
                      key={valor}
                      className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer bg-white ${r.decision === valor ? "border-blue-600" : "border-slate-200"}`}
                    >
                      <input type="radio" name={id("decision")} checked={r.decision === valor} onChange={() => cambiar({ decision: valor })} />
                      {texto}
                    </label>
                  ))}
                </div>
              </div>
              <label htmlFor={id("motivo")} className="text-xs font-medium text-slate-700">
                {r.decision === "RECHAZAR" ? "Motivo del rechazo" : "Novedad (si la hay)"}
                <select
                  id={id("motivo")}
                  value={r.motivo ?? ""}
                  onChange={(e) => cambiar({ motivo: (e.target.value || null) as MotivoRecepcion | null })}
                  className={claseInput}
                >
                  <option value="">{r.decision === "RECHAZAR" ? "Elige el motivo" : "Sin novedad"}</option>
                  {MOTIVOS.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3 flex items-center gap-3">
              <button onClick={guardar} disabled={guardando} className="btn-primario disabled:opacity-40">
                {guardando ? "Guardando..." : "Guardar producto"}
              </button>
              {item.registro && (
                <button onClick={() => setEditando(false)} className="text-xs text-slate-500 hover:underline">
                  Cancelar
                </button>
              )}
            </div>
          </fieldset>
        )
      )}
    </article>
  );
}

function DatoDoc({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <dt className="text-[11px] text-slate-500">{etiqueta}</dt>
      <dd className={`font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{valor}</dd>
    </div>
  );
}

function Acta({
  factura,
  completo,
  onFirmada,
  onTerminar,
}: {
  factura: FacturaVista;
  completo: boolean;
  onFirmada: () => void;
  onTerminar: () => void;
}) {
  const [observaciones, setObservaciones] = useState(factura.observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);

  if (factura.actaFirmadaEn) {
    return (
      <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-heading font-semibold">Acta de recepción firmada</p>
        <p className="mt-1 text-xs">
          {new Date(factura.actaFirmadaEn).toLocaleString("es-CO")}. Entrégale al transportador lo rechazado para que lo devuelva al proveedor.
        </p>
        <button onClick={onTerminar} className="btn-primario mt-3">
          Recibir otro pedido
        </button>
      </section>
    );
  }

  async function firmar() {
    setFirmando(true);
    setError(null);
    const res = await fetch("/api/modulos/recepcion/acta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entregaId: factura.id, observaciones: observaciones.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setFirmando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo firmar el acta");
    onFirmada();
  }

  return (
    <section className="tarjeta-sm mt-5 p-4">
      <h2 className="font-heading font-semibold text-blue-900">Acta de recepción</h2>
      <p className="text-xs text-slate-500">Cuando hayas inspeccionado todos los productos, deja las observaciones (novedades, rechazos) y firma.</p>
      <label htmlFor="observaciones" className="mt-3 block text-xs font-medium text-slate-700">
        Observaciones
      </label>
      <textarea
        id="observaciones"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border border-blue-200 px-3 py-2 text-sm"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={firmar} disabled={!completo || firmando} className="btn-cta mt-3 disabled:opacity-40">
        {firmando ? "Firmando..." : "Firmar acta de recepción"}
      </button>
      {!completo && <p className="mt-2 text-xs text-slate-500">Falta inspeccionar productos.</p>}
    </section>
  );
}
