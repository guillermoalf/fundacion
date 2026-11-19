import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR, mesLargo } from "@/lib/portal/formato";
import { resumenAsistencia, type EstadoAsistencia } from "@/lib/calculos/ninos";
import { LETRA } from "@/lib/export/asistenciaNinos";
import { asistenciaDelMes } from "@/lib/portal/ninos";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";

export const metadata: Metadata = { title: "Asistencia de niños" };

const COLOR: Record<EstadoAsistencia, string> = { presente: "text-emerald-700", ausente: "bg-red-50 text-red-700 font-semibold", justificada: "text-slate-500" };

export default async function AsistenciaNinosPage({ searchParams }: { searchParams: Promise<{ mes?: string; fuente?: string; aula?: string }> }) {
  const { consultar, veNinos, esPersonal } = await obtenerSesion();
  if (!veNinos || esPersonal) return <SinPermiso que="el reporte de asistencia de los niños" />;
  const sp = await searchParams;
  const hoy = hoyCR();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy.slice(0, 7);
  const fuente = sp.fuente || null;
  const aula = sp.aula ? Number(sp.aula) || null : null;
  const d = await consultar(async (tx) => ({
    ...(await asistenciaDelMes(tx, mes, { fuente, aula })),
    fuentes: await tx.selectFrom("fuentes_financiamiento").select(["codigo", "nombre"]).orderBy("id").execute(),
    aulas: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy("nombre").execute(),
  }));
  const general = resumenAsistencia(d.filas.flatMap((f) => Object.values(f.porDia)));
  const qs = new URLSearchParams({ mes, ...(fuente ? { fuente } : {}), ...(aula ? { aula: String(aula) } : {}) }).toString();

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Niños y niñas", href: "/portal/ninos" }, { etiqueta: "Asistencia" }]}
        titulo={`Asistencia de ${mesLargo(mes)}`}
        descripcion={d.dias.length ? `${d.filas.length} niños · ${d.dias.length} días con lista · asistencia general ${general.porcentaje ?? 0} %` : "Este mes todavía no se ha pasado lista."}
        acciones={<a href={`/portal/ninos/asistencia/descargar?${qs}`} className={estiloBoton.primario}>Descargar Excel</a>}
      />
      <form className={`${estiloTarjeta} mb-6 flex flex-wrap items-end gap-3`}>
        <label className="text-sm font-medium text-slate-700">Mes
          <input type="month" name="mes" defaultValue={mes} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-base" />
        </label>
        <label className="text-sm font-medium text-slate-700">Subsidio
          <select name="fuente" defaultValue={fuente ?? ""} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-base">
            <option value="">Todos</option>
            {d.fuentes.map((f) => <option key={f.codigo} value={f.codigo}>{f.codigo} · {f.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Aula
          <select name="aula" defaultValue={aula ?? ""} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-base">
            <option value="">Todas</option>
            {d.aulas.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </label>
        <button className={estiloBoton.secundario}>Ver</button>
      </form>

      {d.filas.length === 0 ? <p className="text-slate-600">No hay niños con esos filtros.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">Nombre</th>
                {d.dias.map((x) => <th key={x} className="px-1.5 py-2 text-center font-medium" title={fecha(x)!}>{x.slice(8, 10)}</th>)}
                <th className="px-3 py-2 text-right">Presentes</th>
                <th className="px-3 py-2 text-right">Ausencias</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.filas.map((f) => {
                const r = resumenAsistencia(Object.values(f.porDia));
                return (
                  <tr key={f.id}>
                    <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2"><Link href={`/portal/ninos/${f.id}`} className="font-medium text-sky-700 hover:underline">{f.nombre}</Link></td>
                    {d.dias.map((x) => <td key={x} className={`px-1.5 py-2 text-center ${f.porDia[x] ? COLOR[f.porDia[x]] : "text-slate-300"}`}>{f.porDia[x] ? LETRA[f.porDia[x]] : "·"}</td>)}
                    <td className="px-3 py-2 text-right">{r.presentes}</td>
                    <td className="px-3 py-2 text-right">{r.ausentes}{r.justificadas ? ` (+${r.justificadas} J)` : ""}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.porcentaje === null ? "—" : `${r.porcentaje} %`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-slate-500">P = llegó · A = no vino · J = ausencia justificada. Solo aparecen los días en que se pasó lista.</p>
    </>
  );
}
