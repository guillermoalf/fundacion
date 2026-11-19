"use client";

import { useState, useTransition } from "react";
import { useAviso } from "../../../_ui/Avisos";
import { marcarAsistencia } from "../acciones";

type Estado = "presente" | "ausente" | "justificada";
type Marca = { estado: Estado; hora: string | null; motivo: string | null };

const BOTONES: { estado: Estado; texto: string; activo: string }[] = [
  { estado: "presente", texto: "Llegó", activo: "bg-emerald-600 text-white border-emerald-600" },
  { estado: "ausente", texto: "No vino", activo: "bg-red-600 text-white border-red-600" },
  { estado: "justificada", texto: "Justificada", activo: "bg-slate-600 text-white border-slate-600" },
];

export default function Lista({ fecha, aulas, aulaInicial, ninos, marcas: inicial }: {
  fecha: string;
  aulas: { id: number; nombre: string }[];
  aulaInicial: number | null;
  ninos: { id: string; nombre: string; aula: number; alergias: string | null }[];
  marcas: Record<string, Marca>;
}) {
  const [aula, setAula] = useState<number | null>(aulaInicial !== null && aulas.some((a) => a.id === aulaInicial) ? aulaInicial : null);
  const [marcas, setMarcas] = useState(inicial);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const aviso = useAviso();

  const visibles = ninos.filter((n) => aula === null || n.aula === aula);
  const cuenta = (e: Estado) => visibles.filter((n) => marcas[n.id]?.estado === e).length;
  const faltan = visibles.filter((n) => !marcas[n.id]);

  function marcar(id: string, estado: Estado, motivo: string | null = null) {
    const antes = marcas[id];
    setMarcas((m) => ({ ...m, [id]: { estado, hora: estado === "presente" ? (antes?.hora ?? null) : null, motivo } }));
    setGuardando(id);
    iniciar(async () => {
      const r = await marcarAsistencia(id, fecha, estado, motivo);
      setGuardando(null);
      if (!r.ok) {
        setMarcas((m) => {
          const c = { ...m };
          if (antes) c[id] = antes; else delete c[id];
          return c;
        });
        aviso(r.error, "error");
      } else if (estado === "presente") {
        setMarcas((m) => ({ ...m, [id]: { ...m[id], hora: r.hora } }));
      }
    });
  }

  function faltantesAusentes() {
    if (!confirm(`¿Marcar ${faltan.length} como "No vino"?`)) return;
    for (const n of faltan) marcar(n.id, "ausente");
  }

  if (ninos.length === 0) return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No hay niños activos ese día.</p>;

  return (
    <div className="space-y-4">
      {aulas.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Aula">
          {[{ id: null as number | null, nombre: "Todas" }, ...aulas].map((a) => (
            <button key={a.id ?? "todas"} type="button" role="tab" aria-selected={aula === a.id} onClick={() => setAula(a.id)}
              className={`rounded-full border px-4 py-2 font-medium ${aula === a.id ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              {a.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="sticky top-[4.75rem] z-10 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-base shadow-sm backdrop-blur lg:top-2">
        <span className="font-semibold text-emerald-800">{cuenta("presente")} llegaron</span>
        <span className="font-semibold text-red-700">{cuenta("ausente")} no vinieron</span>
        <span className="text-slate-600">{cuenta("justificada")} justificadas</span>
        <span className={faltan.length ? "font-semibold text-amber-800" : "text-slate-500"}>{faltan.length} sin marcar</span>
      </div>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {visibles.map((n) => {
          const m = marcas[n.id];
          return (
            <li key={n.id} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${m ? "" : "bg-amber-50/60"}`}>
              <div>
                <p className="text-lg font-medium">{n.nombre}</p>
                <p className="text-sm text-slate-500">
                  {m?.estado === "presente" && m.hora ? `Llegó a las ${m.hora}` : m?.estado === "justificada" && m.motivo ? m.motivo : guardando === n.id ? "Guardando…" : m ? "" : "Sin marcar"}
                  {n.alergias && <span className="ml-2 font-medium text-red-700">Alergias: {n.alergias}</span>}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex">
                {BOTONES.map((b) => (
                  <button key={b.estado} type="button" aria-pressed={m?.estado === b.estado}
                    onClick={() => {
                      if (b.estado === "justificada") {
                        const motivo = prompt("¿Por qué no vino? (enfermedad, cita médica…)", m?.motivo ?? "");
                        if (motivo === null) return;
                        marcar(n.id, b.estado, motivo);
                      } else marcar(n.id, b.estado);
                    }}
                    className={`min-h-12 rounded-xl border px-3 py-2 text-base font-semibold ${m?.estado === b.estado ? b.activo : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    {b.texto}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {faltan.length > 0 && cuenta("presente") > 0 && (
        <button type="button" onClick={faltantesAusentes} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700">
          Ya terminé: marcar los {faltan.length} sin marcar como &quot;No vino&quot;
        </button>
      )}
    </div>
  );
}
