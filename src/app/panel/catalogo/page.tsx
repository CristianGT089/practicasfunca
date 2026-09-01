"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Medicamento = {
  id: string;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  concentracion: string | null;
  registroInvima: string | null;
  numeroLote: string | null;
  loteVencimiento: string | null;
  stock: number;
};

type ItemCarrito = { medicamento: Medicamento; cantidad: number };

function formatearFecha(iso: string | null) {
  if (!iso) return "Sin registrar";
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

export default function CatalogoRealPage() {
  const router = useRouter();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Medicamento | null>(null);

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [vendiendo, setVendiendo] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    const params = new URLSearchParams();
    if (busqueda.trim()) params.set("q", busqueda.trim());

    fetch(`/api/modulos/farmacia/catalogo?${params.toString()}`, { signal: controlador.signal })
      .then((res) => {
        if (res.status === 401) {
          router.push("/");
          throw new Error("no auth");
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setMedicamentos(data.medicamentos ?? []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("No se pudo cargar el catálogo");
      })
      .finally(() => setCargando(false));

    return () => controlador.abort();
  }, [busqueda, router]);

  const agrupados = useMemo(() => {
    const mapa = new Map<string, Medicamento[]>();
    for (const m of medicamentos) {
      const lista = mapa.get(m.principioActivo) ?? [];
      lista.push(m);
      mapa.set(m.principioActivo, lista);
    }
    return Array.from(mapa.entries());
  }, [medicamentos]);

  function enCarrito(medicamentoId: string) {
    return carrito.find((i) => i.medicamento.id === medicamentoId);
  }

  function agregarAVenta(med: Medicamento) {
    setConfirmacion(null);
    if (med.stock <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((i) => i.medicamento.id === med.id);
      if (existente) {
        if (existente.cantidad >= med.stock) return prev;
        return prev.map((i) => (i.medicamento.id === med.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { medicamento: med, cantidad: 1 }];
    });
  }

  function cambiarCantidad(medicamentoId: string, cantidad: number) {
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.medicamento.id !== medicamentoId) return i;
        const tope = Math.min(Math.max(cantidad, 1), i.medicamento.stock);
        return { ...i, cantidad: tope };
      })
    );
  }

  function quitarDeVenta(medicamentoId: string) {
    setCarrito((prev) => prev.filter((i) => i.medicamento.id !== medicamentoId));
  }

  async function completarVenta() {
    if (carrito.length === 0) return;
    setVendiendo(true);
    setErrorVenta(null);
    setConfirmacion(null);
    try {
      const res = await fetch("/api/modulos/farmacia/catalogo/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((i) => ({ medicamentoId: i.medicamento.id, cantidad: i.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorVenta(data.error ?? "No se pudo completar la venta");
        return;
      }
      // Refleja el stock descontado en la lista sin recargar toda la página.
      const nuevosStocks = new Map<string, number>(data.medicamentos.map((m: { id: string; stock: number }) => [m.id, m.stock]));
      setMedicamentos((prev) => prev.map((m) => (nuevosStocks.has(m.id) ? { ...m, stock: nuevosStocks.get(m.id)! } : m)));
      setSeleccionado((prev) => (prev && nuevosStocks.has(prev.id) ? { ...prev, stock: nuevosStocks.get(prev.id)! } : prev));
      setConfirmacion(`Venta registrada: ${carrito.length} medicamento(s).`);
      setCarrito([]);
    } finally {
      setVendiendo(false);
    }
  }

  const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Catálogo real de medicamentos</span>
          </div>
          <button onClick={() => router.push("/panel")} className="text-sm text-blue-100 hover:text-white transition-colors">
            Volver a casos prácticos
          </button>
        </div>
      </header>

      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-heading text-2xl font-bold text-blue-900 mb-1">Expediente y venta de medicamentos</h1>
          <p className="text-sm text-slate-500 mb-6">
            Consulta el inventario real y practica el flujo de venta: agrega medicamentos al carrito y completa la
            venta para descontar existencias. No tiene checklist ni calificación.
          </p>

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por principio activo, nombre comercial o laboratorio..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm mb-6 bg-white"
          />

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {cargando && <p className="text-sm text-slate-500 mb-4">Cargando...</p>}

          {!cargando && medicamentos.length === 0 && !error && (
            <p className="text-sm text-slate-500">No se encontraron medicamentos con ese criterio.</p>
          )}

          <div className="grid gap-6 md:grid-cols-[1fr_1fr_0.9fr]">
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden max-h-[65vh] overflow-y-auto">
              {agrupados.map(([principioActivo, lotes]) => (
                <div key={principioActivo} className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {principioActivo}
                  </div>
                  {lotes.map((m) => {
                    const itemCarrito = enCarrito(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                          seleccionado?.id === m.id ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <button onClick={() => setSeleccionado(m)} className="text-left min-w-0 flex-1">
                          <div className="text-slate-800 font-medium truncate">{m.nombre}</div>
                          <div className="text-xs text-slate-500">
                            {m.laboratorio ?? "Laboratorio N/A"} · Lote {m.numeroLote ?? "N/A"} · Stock {m.stock}
                          </div>
                        </button>
                        <button
                          onClick={() => agregarAVenta(m)}
                          disabled={m.stock <= 0 || (itemCarrito != null && itemCarrito.cantidad >= m.stock)}
                          className="shrink-0 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg px-2.5 py-1.5"
                        >
                          {m.stock <= 0 ? "Sin stock" : "Vender"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              {!seleccionado ? (
                <p className="text-sm text-slate-400">Selecciona un medicamento para ver su expediente.</p>
              ) : (
                <div>
                  <h2 className="font-heading text-lg font-bold text-blue-900">{seleccionado.nombre}</h2>
                  <p className="text-sm text-slate-500 mb-4">{seleccionado.principioActivo}</p>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Laboratorio</dt>
                      <dd className="text-slate-800">{seleccionado.laboratorio ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Forma farmacéutica</dt>
                      <dd className="text-slate-800">{seleccionado.formaFarmaceutica ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Concentración</dt>
                      <dd className="text-slate-800">{seleccionado.concentracion ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Presentación</dt>
                      <dd className="text-slate-800">{seleccionado.presentacion}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">N° de lote</dt>
                      <dd className="text-slate-800">{seleccionado.numeroLote ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Registro INVIMA</dt>
                      <dd className="text-slate-800">{seleccionado.registroInvima ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Fecha de vencimiento</dt>
                      <dd className="text-slate-800">{formatearFecha(seleccionado.loteVencimiento)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Existencias registradas</dt>
                      <dd className="text-slate-800">{seleccionado.stock}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={() => agregarAVenta(seleccionado)}
                    disabled={seleccionado.stock <= 0}
                    className="mt-4 w-full rounded-lg bg-blue-800 hover:bg-blue-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2"
                  >
                    {seleccionado.stock <= 0 ? "Sin existencias" : "Agregar a la venta"}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 h-fit sticky top-4">
              <h2 className="font-heading text-sm font-semibold text-blue-900 mb-3">Venta en curso</h2>

              {carrito.length === 0 ? (
                <p className="text-sm text-slate-400">Agrega medicamentos para armar la venta.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {carrito.map((item) => (
                    <div key={item.medicamento.id} className="border-b border-slate-100 pb-3 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm text-slate-800 font-medium truncate">{item.medicamento.nombre}</span>
                        <button
                          onClick={() => quitarDeVenta(item.medicamento.id)}
                          className="text-xs text-red-600 hover:underline shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min={1}
                          max={item.medicamento.stock}
                          value={item.cantidad}
                          onChange={(e) => cambiarCantidad(item.medicamento.id, Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-slate-400">de {item.medicamento.stock} disponibles</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {errorVenta && <p className="text-sm text-red-600 mb-3">{errorVenta}</p>}
              {confirmacion && <p className="text-sm text-emerald-600 mb-3">{confirmacion}</p>}

              <button
                onClick={completarVenta}
                disabled={carrito.length === 0 || vendiendo}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2"
              >
                {vendiendo ? "Procesando..." : `Completar venta (${totalUnidades} unid.)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
