"use client";

import { useCallback, useEffect, useState } from "react";

type Opcion = { id: string; nombre: string; cedula?: string; presentacion?: string };

type Renglon = { medicamentoId: string; cantidad: number; cantidadTachada: string; posologia: string };
type Formula = {
  medico: string;
  registroMedico: string;
  ips: string;
  fechaEmision: string;
  diasVigencia: number;
  cargadaEnSistema: boolean;
  nota: string;
  renglones: Renglon[];
};
type Caso = {
  id?: string;
  titulo: string;
  contexto: string;
  pacienteId: string;
  documentoPresentado: string;
  orden: number;
  activo: boolean;
  formulas: Formula[];
};

type CasoApi = {
  id: string;
  titulo: string;
  contexto: string | null;
  documentoPresentado: string | null;
  orden: number;
  activo: boolean;
  paciente: { nombre: string; cedula: string };
  pacienteId: string;
  formulas: {
    medico: string;
    registroMedico: string;
    ips: string | null;
    fechaEmision: string;
    diasVigencia: number;
    cargadaEnSistema: boolean;
    nota: string | null;
    renglones: { medicamentoId: string; cantidad: number; cantidadTachada: number | null; posologia: string | null }[];
  }[];
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

const renglonVacio = (): Renglon => ({ medicamentoId: "", cantidad: 1, cantidadTachada: "", posologia: "" });
const formulaVacia = (): Formula => ({
  medico: "",
  registroMedico: "",
  ips: "",
  fechaEmision: hoyISO(),
  diasVigencia: 30,
  cargadaEnSistema: true,
  nota: "",
  renglones: [renglonVacio()],
});
const casoVacio = (): Caso => ({
  titulo: "",
  contexto: "",
  pacienteId: "",
  documentoPresentado: "",
  orden: 0,
  activo: true,
  formulas: [formulaVacia()],
});

function aFormulario(c: CasoApi): Caso {
  return {
    id: c.id,
    titulo: c.titulo,
    contexto: c.contexto ?? "",
    pacienteId: c.pacienteId,
    documentoPresentado: c.documentoPresentado ?? "",
    orden: c.orden,
    activo: c.activo,
    formulas: c.formulas.map((f) => ({
      medico: f.medico,
      registroMedico: f.registroMedico,
      ips: f.ips ?? "",
      fechaEmision: f.fechaEmision.slice(0, 10),
      diasVigencia: f.diasVigencia,
      cargadaEnSistema: f.cargadaEnSistema,
      nota: f.nota ?? "",
      renglones: f.renglones.map((r) => ({
        medicamentoId: r.medicamentoId,
        cantidad: r.cantidad,
        cantidadTachada: r.cantidadTachada != null ? String(r.cantidadTachada) : "",
        posologia: r.posologia ?? "",
      })),
    })),
  };
}

function aPayload(c: Caso) {
  return {
    titulo: c.titulo.trim(),
    contexto: c.contexto.trim() || null,
    pacienteId: c.pacienteId,
    documentoPresentado: c.documentoPresentado.trim() || null,
    orden: c.orden,
    activo: c.activo,
    formulas: c.formulas.map((f) => ({
      medico: f.medico.trim(),
      registroMedico: f.registroMedico.trim(),
      ips: f.ips.trim() || null,
      fechaEmision: new Date(f.fechaEmision).toISOString(),
      diasVigencia: f.diasVigencia,
      cargadaEnSistema: f.cargadaEnSistema,
      nota: f.nota.trim() || null,
      renglones: f.renglones.map((r) => ({
        medicamentoId: r.medicamentoId,
        cantidad: r.cantidad,
        cantidadTachada: r.cantidadTachada.trim() ? Number(r.cantidadTachada) : null,
        posologia: r.posologia.trim() || null,
      })),
    })),
  };
}

export default function CasosDispensacionPage() {
  const [casos, setCasos] = useState<CasoApi[]>([]);
  const [pacientes, setPacientes] = useState<Opcion[]>([]);
  const [medicamentos, setMedicamentos] = useState<Opcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Caso | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/dispensacion/admin/casos");
    const data = await res.json();
    setCasos(data.casos ?? []);
    setPacientes(data.pacientes ?? []);
    setMedicamentos(data.medicamentos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    if (!editando) return;
    const payload = aPayload(editando);
    if (!payload.titulo || !payload.pacienteId || payload.formulas.some((f) => f.renglones.some((r) => !r.medicamentoId))) {
      alert("Faltan datos: título, paciente y un medicamento por renglón.");
      return;
    }
    const url = editando.id
      ? `/api/modulos/dispensacion/admin/casos/${editando.id}`
      : "/api/modulos/dispensacion/admin/casos";
    const res = await fetch(url, {
      method: editando.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("No se pudo guardar. Revisa los campos.");
      return;
    }
    setEditando(null);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este caso?")) return;
    await fetch(`/api/modulos/dispensacion/admin/casos/${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Casos de dispensación</h1>
        <button
          onClick={() => setEditando(casoVacio())}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          Nuevo caso
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Cada caso es un paciente que llega a la ventanilla con una o varias fórmulas. El estudiante los atiende en
        orden. Los &ldquo;problemas&rdquo; se arman combinando la fórmula con la autorización del sistema.
      </p>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-2">
        {casos.map((c) => (
          <div
            key={c.id}
            className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium text-slate-800">
                <span className="text-slate-400">#{c.orden}</span> {c.titulo}
                {!c.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.paciente.nombre} ({c.paciente.cedula}) · {c.formulas.length} fórmula(s) ·{" "}
                {c.formulas.reduce((n, f) => n + f.renglones.length, 0)} renglón(es)
              </p>
            </div>
            <div className="shrink-0 flex gap-3 text-xs">
              <button onClick={() => setEditando(aFormulario(c))} className="text-blue-700 hover:underline">
                Editar
              </button>
              <button onClick={() => eliminar(c.id)} className="text-slate-400 hover:text-red-600">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <Editor
          caso={editando}
          setCaso={setEditando}
          pacientes={pacientes}
          medicamentos={medicamentos}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function Editor({
  caso,
  setCaso,
  pacientes,
  medicamentos,
  onGuardar,
  onCancelar,
}: {
  caso: Caso;
  setCaso: (c: Caso) => void;
  pacientes: Opcion[];
  medicamentos: Opcion[];
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  const set = (patch: Partial<Caso>) => setCaso({ ...caso, ...patch });
  const setFormula = (i: number, patch: Partial<Formula>) =>
    set({ formulas: caso.formulas.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const setRenglon = (fi: number, ri: number, patch: Partial<Renglon>) =>
    setFormula(fi, {
      renglones: caso.formulas[fi].renglones.map((r, j) => (j === ri ? { ...r, ...patch } : r)),
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center overflow-y-auto p-4 z-50">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl my-8">
        <h2 className="font-heading text-lg font-bold text-blue-900 mb-4">
          {caso.id ? "Editar caso" : "Nuevo caso"}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            value={caso.titulo}
            onChange={(e) => set({ titulo: e.target.value })}
            placeholder="Título"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={caso.pacienteId}
            onChange={(e) => set({ pacienteId: e.target.value })}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Paciente…</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.cedula})
              </option>
            ))}
          </select>
          <label className="text-xs text-slate-500 flex items-center gap-2">
            Orden
            <input
              type="number"
              value={caso.orden}
              onChange={(e) => set({ orden: Number(e.target.value) })}
              className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <span className="ml-auto flex items-center gap-1">
              <input type="checkbox" checked={caso.activo} onChange={(e) => set({ activo: e.target.checked })} />
              activo
            </span>
          </label>
          <textarea
            value={caso.contexto}
            onChange={(e) => set({ contexto: e.target.value })}
            placeholder="Contexto: qué dice o pide el paciente"
            rows={2}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={caso.documentoPresentado}
            onChange={(e) => set({ documentoPresentado: e.target.value })}
            placeholder="Documento que presenta la persona (vacío = el correcto)"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {caso.formulas.map((f, fi) => (
          <div key={fi} className="rounded-lg border border-slate-200 p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Fórmula {fi + 1}</span>
              {caso.formulas.length > 1 && (
                <button
                  onClick={() => set({ formulas: caso.formulas.filter((_, j) => j !== fi) })}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Quitar fórmula
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={f.medico} onChange={(e) => setFormula(fi, { medico: e.target.value })} placeholder="Médico" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input value={f.registroMedico} onChange={(e) => setFormula(fi, { registroMedico: e.target.value })} placeholder="Reg. médico" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <label className="text-xs text-slate-500">Emitida<input type="date" value={f.fechaEmision} onChange={(e) => setFormula(fi, { fechaEmision: e.target.value })} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs" /></label>
              <label className="text-xs text-slate-500">Días de vigencia<input type="number" min={1} value={f.diasVigencia} onChange={(e) => setFormula(fi, { diasVigencia: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs" /></label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
              <input type="checkbox" checked={f.cargadaEnSistema} onChange={(e) => setFormula(fi, { cargadaEnSistema: e.target.checked })} />
              Cargada en el sistema de la EPS (si se desmarca → médico particular, no se dispensa)
            </label>
            <input value={f.nota} onChange={(e) => setFormula(fi, { nota: e.target.value })} placeholder="Nota / irregularidad visible (opcional)" className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs mb-2" />

            {f.renglones.map((r, ri) => (
              <div key={ri} className="flex gap-1.5 mb-1.5">
                <select value={r.medicamentoId} onChange={(e) => setRenglon(fi, ri, { medicamentoId: e.target.value })} className="flex-1 min-w-0 rounded border border-slate-300 px-2 py-1 text-xs">
                  <option value="">Medicamento…</option>
                  {medicamentos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <input type="number" min={1} value={r.cantidad} onChange={(e) => setRenglon(fi, ri, { cantidad: Number(e.target.value) })} placeholder="cant." className="w-16 rounded border border-slate-300 px-2 py-1 text-xs" />
                <input value={r.cantidadTachada} onChange={(e) => setRenglon(fi, ri, { cantidadTachada: e.target.value })} placeholder="tachada" className="w-16 rounded border border-slate-300 px-2 py-1 text-xs" />
                <input value={r.posologia} onChange={(e) => setRenglon(fi, ri, { posologia: e.target.value })} placeholder="posología" className="flex-1 min-w-0 rounded border border-slate-300 px-2 py-1 text-xs" />
                {f.renglones.length > 1 && (
                  <button onClick={() => setFormula(fi, { renglones: f.renglones.filter((_, j) => j !== ri) })} className="px-1 text-slate-400 hover:text-red-600">×</button>
                )}
              </div>
            ))}
            <button onClick={() => setFormula(fi, { renglones: [...f.renglones, renglonVacio()] })} className="text-xs text-blue-700 hover:underline">
              + Renglón
            </button>
          </div>
        ))}

        <button onClick={() => set({ formulas: [...caso.formulas, formulaVacia()] })} className="text-xs text-blue-700 hover:underline mb-4 block">
          + Agregar otra fórmula
        </button>

        <div className="flex items-center gap-3">
          <button onClick={onGuardar} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
            Guardar
          </button>
          <button onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
