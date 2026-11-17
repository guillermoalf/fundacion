import type { ReactNode } from "react";

const TONOS = {
  gris: "bg-slate-100 text-slate-700 ring-slate-200",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  azul: "bg-sky-50 text-sky-800 ring-sky-200",
};
export type Tono = keyof typeof TONOS;

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${TONOS[tono]}`}>{children}</span>;
}

/** Dato que falta: se muestra así en vez de inventar un valor o poner cero. */
export function Falta({ que }: { que?: string }) {
  return (
    <span title={que ? `Falta ${que}` : "Falta este dato"}>
      <Insignia tono="ambar">Falta</Insignia>
    </span>
  );
}

/** Muestra el valor o la insignia "Falta" si es null. */
export function Valor({ v, que }: { v: ReactNode | null | undefined; que?: string }) {
  return v === null || v === undefined || v === "" ? <Falta que={que} /> : <>{v}</>;
}
