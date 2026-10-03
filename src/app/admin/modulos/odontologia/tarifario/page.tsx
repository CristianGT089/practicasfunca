"use client";

import { useMemo, useState } from "react";
import { FUENTE_TARIFARIO, TARIFARIO_ODONTOLOGIA, UVB_VIGENTE, valorEnPesos } from "@/lib/modulos/odontologia/tarifario";

const pesos = (n: number) => `$${n.toLocaleString("es-CO")}`;
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Consulta del tarifario oficial de odontología (Manual SOAT en UVB). Es el mismo que usan
 * los estudiantes en el plan de tratamiento de la historia clínica.
 */
export default function TarifarioOdontologiaPage() {
  const [texto, setTexto] = useState("");
  const grupos = useMemo(() => {
    const palabras = sinTildes(texto).split(/\s+/).filter(Boolean);
    const filtrados = TARIFARIO_ODONTOLOGIA.filter((i) => palabras.every((p) => sinTildes(`${i.codigo} ${i.descripcion} ${i.grupo}`).includes(p)));
    return [...new Set(filtrados.map((i) => i.grupo))].map((g) => ({ grupo: g, items: filtrados.filter((i) => i.grupo === g) }));
  }, [texto]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Odontología</p>
      <h1 className="titulo-pagina mt-1">Tarifario oficial</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        {FUENTE_TARIFARIO}. Valor en pesos = tarifa en UVB × {pesos(UVB_VIGENTE.valor)} (UVB {UVB_VIGENTE.anio}, {UVB_VIGENTE.norma}), ajustado a la
        centena más próxima. Los estudiantes lo usan en el plan de tratamiento de la historia clínica.
      </p>

      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por código o palabra (resina, conductos, exodoncia…)"
        aria-label="Buscar en el tarifario"
        className="mt-5 mb-5 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
      />

      <div className="flex flex-col gap-5">
        {grupos.map(({ grupo, items }) => (
          <section key={grupo} className="tarjeta overflow-hidden">
            <h2 className="bg-blue-50 px-5 py-2.5 font-heading text-sm font-bold text-blue-900">{grupo}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-semibold w-20">Código</th>
                    <th className="px-2 py-2 font-semibold">Procedimiento</th>
                    <th className="px-2 py-2 font-semibold w-20 text-right">UVB</th>
                    <th className="px-5 py-2 font-semibold w-28 text-right">Valor {UVB_VIGENTE.anio}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.codigo} className="border-t border-blue-100">
                      <td className="px-5 py-2 font-mono font-semibold text-blue-800">{i.codigo}</td>
                      <td className="px-2 py-2 text-slate-700">{i.descripcion}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{i.uvb.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{pesos(valorEnPesos(i.uvb))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {grupos.length === 0 && <p className="text-sm text-slate-500">Sin resultados.</p>}
      </div>
    </div>
  );
}
