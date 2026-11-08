import type { NodoArbol } from "@/lib/clase/tipos";

/** Árbol de carpetas sencillo (como el panel izquierdo de la app Archivos). */
export default function Arbol({ nodo, nivel = 0 }: { nodo: NodoArbol; nivel?: number }) {
  const esArchivo = nodo.tipo === "archivo";
  return (
    <div>
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: nivel * 20 }}>
        {nivel > 0 && <span className="text-blue-300">└</span>}
        <span aria-hidden>{esArchivo ? "📄" : "📁"}</span>
        <span className={esArchivo ? "font-mono text-sm text-slate-700" : "font-semibold text-blue-900"}>{nodo.nombre}</span>
      </div>
      {nodo.hijos?.map((h) => <Arbol key={h.nombre} nodo={h} nivel={nivel + 1} />)}
    </div>
  );
}
