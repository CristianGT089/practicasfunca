"use client";

import { FILAS, dientesPresentes, esLadoDerecho, esSuperior, nombreDiente, nombreSuperficie, type Denticion, type Marca } from "@/lib/modulos/odontologia/odontograma";
import { calcularIndicePlaca, clavePlaca, type MarcaPlaca, type SuperficiePlaca } from "@/lib/modulos/odontologia/historia";

const LADO = 30;
const GUIA = 12;

type Triangulo = "arriba" | "abajo" | "izquierda" | "derecha";

/** Misma orientación que el odontograma: vestibular hacia afuera de la boca, mesial hacia la línea media. */
function trianguloDe(diente: number, s: SuperficiePlaca): Triangulo {
  if (s === "V") return esSuperior(diente) ? "arriba" : "abajo";
  if (s === "L") return esSuperior(diente) ? "abajo" : "arriba";
  const mesialDerecha = esLadoDerecho(diente);
  if (s === "M") return mesialDerecha ? "derecha" : "izquierda";
  return mesialDerecha ? "izquierda" : "derecha";
}

function puntos(x: number, y: number, t: Triangulo): string {
  const c = [x + LADO / 2, y + LADO / 2];
  const esquinas = {
    arriba: [[x, y], [x + LADO, y]],
    derecha: [[x + LADO, y], [x + LADO, y + LADO]],
    abajo: [[x + LADO, y + LADO], [x, y + LADO]],
    izquierda: [[x, y + LADO], [x, y]],
  }[t];
  return [...esquinas, c].map((p) => p.join(",")).join(" ");
}

type Props = {
  denticion: Denticion;
  /** Odontograma de la misma historia: los dientes ausentes o sin erupcionar no cuentan. */
  odontograma: Marca[];
  marcas: MarcaPlaca[];
  onChange?: (marcas: MarcaPlaca[]) => void;
  /** Muestra el conteo y el índice ya calculado (revisión). En la práctica el % lo calcula el estudiante. */
  mostrarIndice?: boolean;
};

/**
 * Índice de placa de O'Leary (sección XIII): cada diente es un cuadro dividido en 4 por
 * una X; se pinta de rojo la superficie teñida por el revelador.
 */
export default function IndicePlaca({ denticion, odontograma, marcas, onChange, mostrarIndice }: Props) {
  const presentes = new Set(dientesPresentes(denticion, odontograma));
  const tenidas = new Set(marcas.map(clavePlaca));
  const filas =
    denticion === "PERMANENTE"
      ? [FILAS.permanenteSuperior, FILAS.permanenteInferior]
      : denticion === "TEMPORAL"
        ? [FILAS.temporalSuperior, FILAS.temporalInferior]
        : [FILAS.permanenteSuperior, FILAS.temporalSuperior, FILAS.temporalInferior, FILAS.permanenteInferior];
  const porFila = Math.max(...filas.map((f) => f.length));
  const ancho = porFila * LADO + GUIA;
  const altoFila = LADO + 14;
  const { tenidas: nTenidas, superficiesPresentes, indice } = calcularIndicePlaca(denticion, odontograma, marcas);

  function alternar(diente: number, s: SuperficiePlaca) {
    if (!onChange || !presentes.has(diente)) return;
    const clave = clavePlaca({ diente, superficie: s });
    onChange(tenidas.has(clave) ? marcas.filter((m) => clavePlaca(m) !== clave) : [...marcas, { diente, superficie: s }]);
  }

  return (
    <div>
      <svg viewBox={`-2 -2 ${ancho + 4} ${filas.length * altoFila + 4}`} className="w-full h-auto select-none" role="img" aria-label="Índice de O'Leary">
        {filas.map((fila, fi) => {
          const desplazamiento = Math.floor((porFila - fila.length) / 2);
          const y = fi * altoFila + (esSuperior(fila[0]) ? 0 : 14);
          return fila.map((diente, i) => {
            const slot = i + desplazamiento;
            const x = slot * LADO + (i >= fila.length / 2 ? GUIA : 0);
            const presente = presentes.has(diente);
            const etiquetaY = esSuperior(diente) ? y + LADO + 11 : y - 3;
            return (
              <g key={diente}>
                <title>{`${diente} · ${nombreDiente(diente)}${presente ? "" : " (no presente)"}`}</title>
                {(["V", "L", "M", "D"] as SuperficiePlaca[]).map((s) => {
                  const pintada = tenidas.has(clavePlaca({ diente, superficie: s }));
                  return (
                    <polygon
                      key={s}
                      points={puntos(x, y, trianguloDe(diente, s))}
                      fill={!presente ? "#e2e8f0" : pintada ? "#dc2626" : "#ffffff"}
                      stroke="#64748b"
                      strokeWidth={0.8}
                      style={{ cursor: onChange && presente ? "pointer" : "default" }}
                      onClick={() => alternar(diente, s)}
                    >
                      <title>{`${diente} · cara ${nombreSuperficie(diente, s)}`}</title>
                    </polygon>
                  );
                })}
                {!presente && <line x1={x + 3} y1={y + LADO - 3} x2={x + LADO - 3} y2={y + 3} stroke="#94a3b8" strokeWidth={1.5} pointerEvents="none" />}
                <text x={x + LADO / 2} y={etiquetaY} textAnchor="middle" fontSize={9} fontWeight={600} fill="#334155" fontFamily="Inter, sans-serif">
                  {diente}
                </text>
              </g>
            );
          });
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600">
        <span>
          Superficies teñidas: <span className="font-semibold">{nTenidas}</span>
        </span>
        <span>
          Superficies presentes: <span className="font-semibold">{superficiesPresentes}</span> ({presentes.size} dientes × 4)
        </span>
        {mostrarIndice && (
          <span>
            Índice: <span className="font-semibold">{indice}%</span>
          </span>
        )}
      </div>
    </div>
  );
}
