import type { ReactNode } from "react";

export default function Vacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="text-lg font-semibold text-slate-800">{titulo}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-slate-600">{children}</div>}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}
