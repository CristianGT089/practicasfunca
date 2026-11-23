import type { NodoArbol } from "@/lib/clase/tipos";

/** Árbol de carpetas sencillo (como el panel izquierdo de la app Archivos). */
export default function Arbol({ nodo, nivel = 0 }: { nodo: NodoArbol; nivel?: number }) {
  const esArchivo = nodo.tipo === "archivo";
  return (
    <div>
      <div className="flex min-w-0 items-start gap-2 py-0.5" style={{ paddingLeft: nivel * 20 }}>
        {nivel > 0 && <span className="shrink-0 text-blue-300">└</span>}
        <span className="shrink-0" aria-hidden>{esArchivo ? "📄" : "📁"}</span>
        <span className={`min-w-0 break-all ${esArchivo ? "font-mono text-sm text-slate-700" : "font-semibold text-blue-900"}`}>{nodo.nombre}</span>
      </div>
      {nodo.hijos?.map((h) => <Arbol key={h.nombre} nodo={h} nivel={nivel + 1} />)}
    </div>
  );
}
