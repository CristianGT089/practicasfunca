"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALERTAS_MEDICAS,
  ANTECEDENTES_ODONTOLOGICOS,
  ANTECEDENTES_PERSONALES,
  EXAMEN_DENTAL,
  EXAMEN_ESTOMATOLOGICO_NA,
  EXAMEN_ESTOMATOLOGICO_SN,
  REMISIONES,
  calcularIndicePlaca,
  esperadoVacio,
  normalizarEsperado,
  type EsperadoOdontologia,
} from "@/lib/modulos/odontologia/historia";
import { DENTICIONES, relatoOdontograma, type Denticion } from "@/lib/modulos/odontologia/odontograma";
import { requiereRadiografia } from "@/lib/modulos/odontologia/pasos";
import Odontograma from "@/components/modulos/odontologia/Odontograma";
import IndicePlaca from "@/components/modulos/odontologia/IndicePlaca";
import { GrillaSi } from "@/components/modulos/odontologia/SeccionesHistoria";

type Paciente = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: "CC" | "TI" | "RC" | "CE";
  documento: string;
  sexo: "M" | "F";
  fechaNacimiento: string;
  eps: string;
  profesion: string;
  ocupacion: string;
  estadoCivil: string;
  telefono: string;
  direccion: string;
  contactoEmergencia: string;
  parentescoContacto: string;
  telefonoContacto: string;
};

type Caso = {
  id?: string;
  titulo: string;
  descripcion: string;
  descripcionDificil: string;
  activo: boolean;
  resultadoEsperado: string;
  denticion: Denticion;
  motivoConsulta: string;
  relatoAnamnesis: string;
  relatoExamen: string;
  relatoRadiografia: string;
  paciente: Paciente;
  esperado: EsperadoOdontologia;
};

type CasoApi = {
  id: string;
  titulo: string;
  descripcion: string;
  descripcionDificil: string | null;
  activo: boolean;
  resultadoEsperado: string;
  _count: { intentos: number };
  odontologia: {
    denticion: string;
    motivoConsulta: string;
    relatoAnamnesis: string;
    relatoExamen: string | null;
    relatoRadiografia: string | null;
    esperado: unknown;
    paciente: Record<string, string | null>;
  } | null;
};

const pacienteVacio = (): Paciente => ({
  nombres: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CC",
  documento: "",
  sexo: "F",
  fechaNacimiento: "",
  eps: "",
  profesion: "",
  ocupacion: "",
  estadoCivil: "",
  telefono: "",
  direccion: "",
  contactoEmergencia: "",
  parentescoContacto: "",
  telefonoContacto: "",
});

const casoVacio = (): Caso => ({
  titulo: "",
  descripcion: "",
  descripcionDificil: "",
  activo: true,
  resultadoEsperado: "ATENCION_EN_CONSULTA",
  denticion: "PERMANENTE",
  motivoConsulta: "",
  relatoAnamnesis: "",
  relatoExamen: "",
  relatoRadiografia: "",
  paciente: pacienteVacio(),
  esperado: esperadoVacio(),
});

function aFormulario(c: CasoApi): Caso {
  const o = c.odontologia!;
  const p = o.paciente;
  const paciente = Object.fromEntries(Object.keys(pacienteVacio()).map((k) => [k, p[k] ?? ""])) as Paciente;
  paciente.fechaNacimiento = (p.fechaNacimiento ?? "").slice(0, 10);
  return {
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion,
    descripcionDificil: c.descripcionDificil ?? "",
    activo: c.activo,
    resultadoEsperado: c.resultadoEsperado,
    denticion: o.denticion as Denticion,
    motivoConsulta: o.motivoConsulta,
    relatoAnamnesis: o.relatoAnamnesis,
    relatoExamen: o.relatoExamen ?? "",
    relatoRadiografia: o.relatoRadiografia ?? "",
    paciente,
    esperado: normalizarEsperado(o.esperado),
  };
}

const nulo = (s: string) => (s.trim() ? s.trim() : null);

function aPayload(c: Caso) {
  const p = c.paciente;
  return {
    titulo: c.titulo.trim(),
    descripcion: c.descripcion.trim(),
    descripcionDificil: nulo(c.descripcionDificil),
    activo: c.activo,
    resultadoEsperado: c.resultadoEsperado,
    denticion: c.denticion,
    motivoConsulta: c.motivoConsulta.trim(),
    relatoAnamnesis: c.relatoAnamnesis.trim(),
    relatoExamen: nulo(c.relatoExamen),
    relatoRadiografia: nulo(c.relatoRadiografia),
    paciente: {
      ...p,
      segundoApellido: nulo(p.segundoApellido),
      eps: nulo(p.eps),
      profesion: nulo(p.profesion),
      ocupacion: nulo(p.ocupacion),
      estadoCivil: nulo(p.estadoCivil),
      telefono: nulo(p.telefono),
      direccion: nulo(p.direccion),
      contactoEmergencia: nulo(p.contactoEmergencia),
      parentescoContacto: nulo(p.parentescoContacto),
      telefonoContacto: nulo(p.telefonoContacto),
    },
    esperado: c.esperado,
  };
}

const claseInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500";

/**
 * Casos de Odontología: el docente arma el paciente, lo que cuenta y lo que se ve al
 * examinarlo, y dibuja la historia correcta (odontograma, placa, antecedentes, alerta) con
 * las mismas herramientas que usará el estudiante. El checklist de proceso se deriva solo.
 */
export default function CasosOdontologiaPage() {
  const [casos, setCasos] = useState<CasoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Caso | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/modulos/odontologia/admin/casos");
    const data = await res.json();
    setCasos(data.casos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    if (!editando) return;
    const c = editando;
    if (!c.titulo.trim() || !c.descripcion.trim() || !c.motivoConsulta.trim() || !c.relatoAnamnesis.trim()) {
      setError("Faltan datos: título, descripción, motivo de consulta y relato de la anamnesis.");
      return;
    }
    const p = c.paciente;
    if (!p.nombres.trim() || !p.primerApellido.trim() || !p.documento.trim() || !p.fechaNacimiento) {
      setError("Faltan datos del paciente: nombres, primer apellido, documento y fecha de nacimiento.");
      return;
    }
    const res = await fetch(c.id ? `/api/modulos/odontologia/admin/casos/${c.id}` : "/api/modulos/odontologia/admin/casos", {
      method: c.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aPayload(c)),
    });
    if (!res.ok) {
      setError("No se pudo guardar. Revisa los campos.");
      return;
    }
    setError(null);
    setEditando(null);
    cargar();
  }

  async function eliminar(c: CasoApi) {
    const aviso = c._count.intentos > 0 ? "Tiene intentos de estudiantes: se desactivará en vez de borrarse. ¿Continuar?" : "¿Eliminar este caso?";
    if (!confirm(aviso)) return;
    await fetch(`/api/modulos/odontologia/admin/casos/${c.id}`, { method: "DELETE" });
    cargar();
  }

  if (editando) {
    return <Editor caso={editando} setCaso={setEditando} error={error} onGuardar={guardar} onCancelar={() => { setEditando(null); setError(null); }} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Casos de odontología</h1>
        <button onClick={() => setEditando(casoVacio())} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Nuevo caso
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Cada caso es un paciente con su historia clínica correcta. El estudiante lo interroga, lo examina y diligencia la historia; se califica
        sobre todo el odontograma.
      </p>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-2">
        {casos.map((c) => {
          const e = normalizarEsperado(c.odontologia?.esperado);
          return (
            <div key={c.id} className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">
                  {c.titulo}
                  {!c.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.odontologia?.paciente.nombres} {c.odontologia?.paciente.primerApellido} · dentición {c.odontologia?.denticion.toLowerCase()} ·{" "}
                  {e.odontograma.length} marca(s) en el odontograma
                  {e.placa.length > 0 && " · índice de placa"}
                  {requiereRadiografia(e) && " · radiografía"} · {c._count.intentos} intento(s)
                </p>
              </div>
              <div className="shrink-0 flex gap-3 text-xs">
                <button onClick={() => setEditando(aFormulario(c))} className="text-blue-700 hover:underline">
                  Editar
                </button>
                <button onClick={() => eliminar(c)} className="text-slate-400 hover:text-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Seccion({ titulo, children, ayuda }: { titulo: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="font-heading font-semibold text-cyan-900 text-sm">{titulo}</h2>
      {ayuda && <p className="text-xs text-slate-500 mt-0.5">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {etiqueta}
      {children}
    </label>
  );
}

function Editor({
  caso,
  setCaso,
  error,
  onGuardar,
  onCancelar,
}: {
  caso: Caso;
  setCaso: (c: Caso) => void;
  error: string | null;
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  const set = (c: Partial<Caso>) => setCaso({ ...caso, ...c });
  const setP = (c: Partial<Paciente>) => set({ paciente: { ...caso.paciente, ...c } });
  const setE = (c: Partial<EsperadoOdontologia>) => set({ esperado: { ...caso.esperado, ...c } });
  const e = caso.esperado;
  const indice = calcularIndicePlaca(caso.denticion, e.odontograma, e.placa);
  const necesitaRx = requiereRadiografia(e);

  const texto = (etiqueta: string, valor: string, cambiar: (v: string) => void, filas = 1) => (
    <Campo etiqueta={etiqueta}>
      {filas > 1 ? (
        <textarea rows={filas} value={valor} onChange={(ev) => cambiar(ev.target.value)} className={claseInput} />
      ) : (
        <input value={valor} onChange={(ev) => cambiar(ev.target.value)} className={claseInput} />
      )}
    </Campo>
  );

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-blue-900">{caso.id ? "Editar caso" : "Nuevo caso"}</h1>
        <button onClick={onCancelar} className="text-sm text-slate-500 hover:text-slate-800">
          ← Volver a la lista
        </button>
      </div>

      <Seccion titulo="Caso">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {texto("Título", caso.titulo, (v) => set({ titulo: v }))}
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Dentición">
              <select value={caso.denticion} onChange={(ev) => set({ denticion: ev.target.value as Denticion })} className={claseInput}>
                {DENTICIONES.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Conducta correcta (remisión)">
              <select value={caso.resultadoEsperado} onChange={(ev) => set({ resultadoEsperado: ev.target.value })} className={claseInput}>
                {REMISIONES.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          {texto("Descripción — modo fácil (con pistas)", caso.descripcion, (v) => set({ descripcion: v }), 3)}
          {texto("Descripción — modo difícil (sin pistas, opcional)", caso.descripcionDificil, (v) => set({ descripcionDificil: v }), 3)}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={caso.activo} onChange={(ev) => set({ activo: ev.target.checked })} /> Activo (visible para los estudiantes)
        </label>
      </Seccion>

      <Seccion titulo="Paciente" ayuda="Aparece ya diligenciado en la historia (datos de admisiones).">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {texto("Nombres", caso.paciente.nombres, (v) => setP({ nombres: v }))}
          {texto("Primer apellido", caso.paciente.primerApellido, (v) => setP({ primerApellido: v }))}
          {texto("Segundo apellido", caso.paciente.segundoApellido, (v) => setP({ segundoApellido: v }))}
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Campo etiqueta="Tipo">
              <select value={caso.paciente.tipoDocumento} onChange={(ev) => setP({ tipoDocumento: ev.target.value as Paciente["tipoDocumento"] })} className={claseInput}>
                {["CC", "TI", "RC", "CE"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Campo>
            {texto("Documento", caso.paciente.documento, (v) => setP({ documento: v }))}
          </div>
          <Campo etiqueta="Sexo">
            <select value={caso.paciente.sexo} onChange={(ev) => setP({ sexo: ev.target.value as "M" | "F" })} className={claseInput}>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </Campo>
          <Campo etiqueta="Fecha de nacimiento">
            <input type="date" value={caso.paciente.fechaNacimiento} onChange={(ev) => setP({ fechaNacimiento: ev.target.value })} className={claseInput} />
          </Campo>
          {texto("EPS", caso.paciente.eps, (v) => setP({ eps: v }))}
          {texto("Estado civil", caso.paciente.estadoCivil, (v) => setP({ estadoCivil: v }))}
          {texto("Profesión", caso.paciente.profesion, (v) => setP({ profesion: v }))}
          {texto("Ocupación", caso.paciente.ocupacion, (v) => setP({ ocupacion: v }))}
          {texto("Teléfono", caso.paciente.telefono, (v) => setP({ telefono: v }))}
          {texto("Dirección", caso.paciente.direccion, (v) => setP({ direccion: v }))}
          {texto("Contacto de emergencia", caso.paciente.contactoEmergencia, (v) => setP({ contactoEmergencia: v }))}
          {texto("Parentesco", caso.paciente.parentescoContacto, (v) => setP({ parentescoContacto: v }))}
          {texto("Teléfono del contacto", caso.paciente.telefonoContacto, (v) => setP({ telefonoContacto: v }))}
        </div>
      </Seccion>

      <Seccion
        titulo="Lo que cuenta el paciente (al interrogarlo)"
        ayuda="Escribe el relato de modo que de ahí salgan los antecedentes y la alerta médica que marcas abajo."
      >
        <div className="grid grid-cols-1 gap-3">
          {texto("Motivo de consulta (en palabras del paciente)", caso.motivoConsulta, (v) => set({ motivoConsulta: v }), 2)}
          {texto("Relato: enfermedad actual, antecedentes médicos y odontológicos, hábitos", caso.relatoAnamnesis, (v) => set({ relatoAnamnesis: v }), 6)}
        </div>
      </Seccion>

      <Seccion titulo="Respuesta esperada: alerta médica y antecedentes">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Alerta médica</p>
            <GrillaSi items={ALERTAS_MEDICAS} seleccion={e.alertaMedica} onChange={(v) => setE({ alertaMedica: v })} columnas="sm:grid-cols-2 lg:grid-cols-3" etiquetaSi="Alerta" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">IV. Antecedentes personales y familiares</p>
            <GrillaSi items={ANTECEDENTES_PERSONALES} seleccion={e.antecedentesPersonales} onChange={(v) => setE({ antecedentesPersonales: v })} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">V. Antecedentes odontológicos</p>
            <GrillaSi items={ANTECEDENTES_ODONTOLOGICOS} seleccion={e.antecedentesOdontologicos} onChange={(v) => setE({ antecedentesOdontologicos: v })} />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Examen clínico" ayuda="El relato va antes de la lista de hallazgos dentales, que se genera sola a partir del odontograma de abajo.">
        <div className="flex flex-col gap-4">
          {texto("Relato del examen (extraoral, tejidos blandos, encía, ATM...)", caso.relatoExamen, (v) => set({ relatoExamen: v }), 4)}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1">VI. Examen estomatológico (anormal / sí)</p>
              <GrillaSi
                items={[...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN]}
                seleccion={e.examenEstomatologico}
                onChange={(v) => setE({ examenEstomatologico: v })}
                columnas="sm:grid-cols-2"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1">VII. Examen pulpar, dental y periodontal (sí)</p>
              <GrillaSi items={EXAMEN_DENTAL.flatMap((g) => g.items)} seleccion={e.examenDental} onChange={(v) => setE({ examenDental: v })} columnas="sm:grid-cols-2" />
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion
        titulo="Odontograma correcto"
        ayuda="Dibújalo con las convenciones. Lo que el estudiante lee al examinar se genera de aquí (abajo ves la vista previa)."
      >
        <Odontograma denticion={caso.denticion} marcas={e.odontograma} onChange={(v) => setE({ odontograma: v })} />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-500 mb-1">Vista previa del examen clínico (modo fácil)</p>
            <ul className="list-disc pl-4 flex flex-col gap-0.5">
              {relatoOdontograma(e.odontograma, "CLINICO", true).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-500 mb-1">Vista previa de la radiografía</p>
            {necesitaRx ? (
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                {relatoOdontograma(e.odontograma, "RADIOGRAFICO", true).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">El caso no tiene hallazgos radiográficos.</p>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion titulo="IX. Radiografía">
        <label className="flex items-center gap-2 text-xs text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={necesitaRx}
            disabled={requiereRadiografia({ ...e, requiereRadiografia: false })}
            onChange={(ev) => setE({ requiereRadiografia: ev.target.checked })}
          />
          El caso requiere radiografía
          {requiereRadiografia({ ...e, requiereRadiografia: false }) && (
            <span className="text-slate-400">(obligatorio: hay hallazgos que solo se ven en la radiografía)</span>
          )}
        </label>
        {texto("Lectura radiográfica adicional (opcional)", caso.relatoRadiografia, (v) => set({ relatoRadiografia: v }), 3)}
      </Seccion>

      <Seccion titulo="XIII. Índice de placa (O'Leary)" ayuda="Pinta las superficies teñidas. Si no pintas ninguna, el caso no evalúa índice de placa.">
        <IndicePlaca denticion={caso.denticion} odontograma={e.odontograma} marcas={e.placa} onChange={(v) => setE({ placa: v })} mostrarIndice />
        {e.placa.length > 0 && <p className="mt-1 text-xs text-cyan-800">El estudiante deberá calcular {indice.indice}% (se acepta ±1).</p>}
      </Seccion>

      <div className="fixed bottom-0 inset-x-0 bg-white/95 border-t border-slate-200 px-6 py-3 z-20">
        <div className="mx-auto max-w-6xl flex items-center justify-end gap-3">
          {error && <p className="mr-auto text-sm text-red-600">{error}</p>}
          <button onClick={onCancelar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onGuardar} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
            Guardar caso
          </button>
        </div>
      </div>
    </div>
  );
}
