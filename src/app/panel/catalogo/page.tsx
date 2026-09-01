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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
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
        <div className="mx-auto max-w-5xl">
          <h1 className="font-heading text-2xl font-bold text-blue-900 mb-1">Expediente de medicamentos</h1>
          <p className="text-sm text-slate-500 mb-6">
            Consulta libre del inventario real: principio activo, laboratorio, forma farmacéutica, lote y
            vencimiento. No tiene calificación, es un recurso de referencia.
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

          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden max-h-[65vh] overflow-y-auto">
              {agrupados.map(([principioActivo, lotes]) => (
                <div key={principioActivo} className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {principioActivo}
                  </div>
                  {lotes.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSeleccionado(m)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        seleccionado?.id === m.id ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-slate-800 font-medium">{m.nombre}</div>
                      <div className="text-xs text-slate-500">
                        {m.laboratorio ?? "Laboratorio N/A"} · Lote {m.numeroLote ?? "N/A"}
                      </div>
                    </button>
                  ))}
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
