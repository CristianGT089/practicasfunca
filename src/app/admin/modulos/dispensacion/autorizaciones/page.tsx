"use client";

import { useCallback, useEffect, useState } from "react";

type Opcion = { id: string; nombre: string; cedula?: string; presentacion?: string };
type Autorizacion = {
  id: string;
  medico: string;
  cantidadAutorizada: number;
  cantidadRedimida: number;
  fechaEmision: string;
  fechaVigencia: string;
  paciente: { nombre: string; cedula: string };
  medicamento: { nombre: string };
};

const hoyISO = () => new Date().toISOString().slice(0, 10);
const enDiasISO = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

export default function AutorizacionesPage() {
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);
  const [pacientes, setPacientes] = useState<Opcion[]>([]);
  const [medicamentos, setMedicamentos] = useState<Opcion[]>([]);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    pacienteId: "",
    medicamentoId: "",
    medico: "",
    cantidadAutorizada: 30,
    cantidadRedimida: 0,
    fechaEmision: hoyISO(),
    fechaVigencia: enDiasISO(30),
  });

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/dispensacion/admin/autorizaciones");
    const data = await res.json();
    setAutorizaciones(data.autorizaciones ?? []);
    setPacientes(data.pacientes ?? []);
    setMedicamentos(data.medicamentos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear() {
    if (!form.pacienteId || !form.medicamentoId || !form.medico.trim()) return;
    await fetch("/api/modulos/dispensacion/admin/autorizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, medico: "", cantidadRedimida: 0 }));
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta autorización?")) return;
    await fetch(`/api/modulos/dispensacion/admin/autorizaciones/${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-2">Autorizaciones del sistema</h1>
      <p className="text-sm text-slate-500 mb-6">
        Lo que el estudiante ve al buscar al paciente: qué medicamentos tiene autorizados, cuánto y hasta cuándo.
        Se emparejan con los renglones de las fórmulas por paciente + medicamento.
      </p>

      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <h2 className="text-sm font-heading font-semibold text-blue-900 mb-3">Nueva autorización</h2>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.pacienteId}
            onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Paciente…</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.cedula})
              </option>
            ))}
          </select>
          <select
            value={form.medicamentoId}
            onChange={(e) => setForm({ ...form, medicamentoId: e.target.value })}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Medicamento…</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} · {m.presentacion}
              </option>
            ))}
          </select>
          <input
            value={form.medico}
            onChange={(e) => setForm({ ...form, medico: e.target.value })}
            placeholder="Médico que autoriza"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="text-xs text-slate-500">
            Cantidad autorizada
            <input
              type="number"
              min={1}
              value={form.cantidadAutorizada}
              onChange={(e) => setForm({ ...form, cantidadAutorizada: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Ya redimida
            <input
              type="number"
              min={0}
              value={form.cantidadRedimida}
              onChange={(e) => setForm({ ...form, cantidadRedimida: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Fecha de emisión
            <input
              type="date"
              value={form.fechaEmision}
              onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Vigente hasta
            <input
              type="date"
              value={form.fechaVigencia}
              onChange={(e) => setForm({ ...form, fechaVigencia: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          onClick={crear}
          className="mt-3 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          Crear
        </button>
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-2">
        {autorizaciones.map((a) => {
          const vencida = new Date(a.fechaVigencia) < new Date();
          const agotada = a.cantidadRedimida >= a.cantidadAutorizada;
          return (
            <div
              key={a.id}
              className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {a.paciente.nombre} <span className="text-xs text-slate-400">({a.paciente.cedula})</span> ·{" "}
                  <span className="text-blue-900">{a.medicamento.nombre}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.cantidadRedimida}/{a.cantidadAutorizada} redimido · {a.medico} · vence{" "}
                  {new Date(a.fechaVigencia).toLocaleDateString("es-CO")}
                  {vencida && <span className="text-red-600 font-semibold"> · vencida</span>}
                  {!vencida && agotada && <span className="text-amber-700 font-semibold"> · agotada</span>}
                </p>
              </div>
              <button onClick={() => eliminar(a.id)} className="shrink-0 text-xs text-slate-400 hover:text-red-600">
                Eliminar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
