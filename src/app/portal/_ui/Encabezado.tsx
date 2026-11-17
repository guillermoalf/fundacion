import Link from "next/link";
import type { ReactNode } from "react";

export type Miga = { etiqueta: string; href?: string };

/** Migas de pan + título de la página + acciones a la derecha. */
export default function Encabezado({ migas = [], titulo, descripcion, acciones }: { migas?: Miga[]; titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 space-y-2">
      <nav aria-label="Ruta" className="text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/portal" className="hover:text-sky-700 hover:underline">Inicio</Link>
          </li>
          {migas.map((m) => (
            <li key={m.etiqueta} className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              {m.href ? <Link href={m.href} className="hover:text-sky-700 hover:underline">{m.etiqueta}</Link> : <span>{m.etiqueta}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="mt-1 max-w-3xl text-slate-600">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
