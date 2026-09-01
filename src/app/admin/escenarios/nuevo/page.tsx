"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Medicamento = { id: string; nombre: string };
type Paciente = { id: string; nombre: string; cedula: string };

const TIPOS_ACCION: { valor: string; etiqueta: string; necesitaMedicamento: boolean }[] = [
  { valor: "BUSCAR_MEDICAMENTO", etiqueta: "Buscar medicamento", necesitaMedicamento: true },
  { valor: "VER_FICHA_PACIENTE", etiqueta: "Ver ficha del paciente", necesitaMedicamento: false },
  { valor: "VERIFICAR_RECETA", etiqueta: "Verificar receta", necesitaMedicamento: false },
  { valor: "VERIFICAR_ALERGIA", etiqueta: "Verificar alergia", necesitaMedicamento: true },
  { valor: "VERIFICAR_STOCK", etiqueta: "Verificar stock", necesitaMedicamento: true },
  { valor: "VERIFICAR_VENCIMIENTO", etiqueta: "Verificar vencimiento", necesitaMedicamento: true },
  { valor: "REGISTRAR_CONTROLADO", etiqueta: "Registrar medicamento controlado", necesitaMedicamento: true },
  { valor: "AGREGAR_A_VENTA", etiqueta: "Agregar a la venta", necesitaMedicamento: true },
  { valor: "QUITAR_DE_VENTA", etiqueta: "Quitar de la venta", necesitaMedicamento: true },
  { valor: "COMPLETAR_VENTA", etiqueta: "Completar la venta", necesitaMedicamento: false },
  { valor: "RECHAZAR_VENTA", etiqueta: "Rechazar la venta", necesitaMedicamento: false },
];

type Paso = {
  tipoAccion: string;
  descripcion: string;
  medicamentoId: string;
  obligatorio: boolean;
  peso: number;
};

function pasoVacio(): Paso {
  return { tipoAccion: "BUSCAR_MEDICAMENTO", descripcion: "", medicamentoId: "", obligatorio: true, peso: 1 };
}

export default function NuevoEscenarioPage() {
  const router = useRouter();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [resultadoEsperado, setResultadoEsperado] = useState<"VENTA_CORRECTA" | "RECHAZO_CORRECTO">(
    "VENTA_CORRECTA"
  );
  const [pacienteId, setPacienteId] = useState("");
  const [medicamentoIds, setMedicamentoIds] = useState<string[]>([]);
  const [pasos, setPasos] = useState<Paso[]>([pasoVacio()]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/modulos/farmacia/admin/medicamentos").then((r) => r.json()).then((d) => setMedicamentos(d.medicamentos ?? []));
    fetch("/api/modulos/farmacia/admin/pacientes").then((r) => r.json()).then((d) => setPacientes(d.pacientes ?? []));
  }, []);

  function actualizarPaso(idx: number, cambios: Partial<Paso>) {
    setPasos((p) => p.map((paso, i) => (i === idx ? { ...paso, ...cambios } : paso)));
  }

  function agregarPaso() {
    setPasos((p) => [...p, pasoVacio()]);
  }

  function quitarPaso(idx: number) {
    setPasos((p) => p.filter((_, i) => i !== idx));
  }

  function alternarMedicamento(id: string) {
    setMedicamentoIds((ids) => (ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pasos.some((p) => !p.descripcion.trim())) {
      setError("Todos los pasos necesitan una descripción");
      return;
    }
    if (pasos.some((p) => TIPOS_ACCION.find((t) => t.valor === p.tipoAccion)?.necesitaMedicamento && !p.medicamentoId)) {
      setError("Hay pasos que requieren seleccionar un medicamento");
      return;
    }

    setGuardando(true);
    const res = await fetch("/api/admin/escenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        descripcion,
        resultadoEsperado,
        pacienteId: pacienteId || null,
        medicamentoIds,
        pasos: pasos.map((p, i) => ({
          orden: i + 1,
          tipoAccion: p.tipoAccion,
          descripcion: p.descripcion,
          medicamentoId: p.medicamentoId || undefined,
          obligatorio: p.obligatorio,
          peso: p.peso,
        })),
      }),
    });
    setGuardando(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo crear el escenario");
      return;
    }
    router.push("/admin/escenarios");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Crear escenario</h1>

      <form onSubmit={guardar} className="flex flex-col gap-6">
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Datos generales</h2>

          <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
            required
          />

          <label className="block text-xs font-medium text-slate-600 mb-1">
            Descripción (lo que lee el estudiante al iniciar)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
            rows={3}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Resultado esperado</label>
              <select
                value={resultadoEsperado}
                onChange={(e) => setResultadoEsperado(e.target.value as "VENTA_CORRECTA" | "RECHAZO_CORRECTO")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="VENTA_CORRECTA">Debe completar la venta</option>
                <option value="RECHAZO_CORRECTO">Debe rechazar la venta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Paciente (opcional)</label>
              <select
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Sin paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.cedula})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Medicamentos implicados en el caso</h2>
          <div className="flex flex-wrap gap-2">
            {medicamentos.map((m) => (
              <label
                key={m.id}
                className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${
                  medicamentoIds.includes(m.id)
                    ? "bg-blue-800 text-white border-blue-800"
                    : "bg-white text-slate-600 border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={medicamentoIds.includes(m.id)}
                  onChange={() => alternarMedicamento(m.id)}
                />
                {m.nombre}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Checklist de pasos esperados (define cómo se califica)
            </h2>
            <button type="button" onClick={agregarPaso} className="text-xs text-blue-800 hover:underline">
              + Agregar paso
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {pasos.map((paso, idx) => {
              const tipoInfo = TIPOS_ACCION.find((t) => t.valor === paso.tipoAccion);
              return (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Paso {idx + 1}</span>
                    {pasos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarPaso(idx)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de acción</label>
                      <select
                        value={paso.tipoAccion}
                        onChange={(e) => actualizarPaso(idx, { tipoAccion: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {TIPOS_ACCION.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    {tipoInfo?.necesitaMedicamento && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Medicamento</label>
                        <select
                          value={paso.medicamentoId}
                          onChange={(e) => actualizarPaso(idx, { medicamentoId: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Selecciona...</option>
                          {medicamentos.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Descripción (lo que verá el estudiante en su resultado)
                  </label>
                  <input
                    value={paso.descripcion}
                    onChange={(e) => actualizarPaso(idx, { descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2"
                    placeholder='Ej: "Verificó que el paciente no fuera alérgico"'
                  />

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      Peso
                      <input
                        type="number"
                        min={1}
                        value={paso.peso}
                        onChange={(e) => actualizarPaso(idx, { peso: Number(e.target.value) })}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={paso.obligatorio}
                        onChange={(e) => actualizarPaso(idx, { obligatorio: e.target.checked })}
                      />
                      Obligatorio
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-blue-800 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Crear escenario"}
        </button>
      </form>
    </div>
  );
}
