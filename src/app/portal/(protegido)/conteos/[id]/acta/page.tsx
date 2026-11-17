import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha } from "@/lib/portal/formato";
import BotonImprimir from "../../../activos/etiquetas/BotonImprimir";
import { cargarConteo } from "../../datos";

export const metadata: Metadata = { title: "Acta de conteo" };

export default async function ActaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { consultar } = await obtenerSesion();
  const d = await cargarConteo(consultar, id);
  if (!d) notFound();
  const { c, activos } = d;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 print:hidden"><BotonImprimir texto="Imprimir acta" /></div>
      <h1 className="text-center text-xl font-bold">Fundación Creciendo Feliz</h1>
      <h2 className="text-center text-lg font-semibold">Acta de conteo físico de activos</h2>
      <dl className="mt-6 grid grid-cols-2 gap-2 text-base">
        <div><dt className="inline font-semibold">Ubicación: </dt><dd className="inline">{c.ubicacion}</dd></div>
        <div><dt className="inline font-semibold">Fecha: </dt><dd className="inline">{fecha(c.fecha)}</dd></div>
        <div><dt className="inline font-semibold">Responsable del aula: </dt><dd className="inline">{c.responsable}</dd></div>
        <div><dt className="inline font-semibold">Realizado por: </dt><dd className="inline">{c.realizo ?? "—"}</dd></div>
      </dl>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead><tr>{["N.º", "Placa", "Activo", "Resultado", "Nota"].map((t) => <th key={t} className="border border-slate-400 px-2 py-1 text-left">{t}</th>)}</tr></thead>
        <tbody>
          {activos.map((a, i) => (
            <tr key={a.id}>
              <td className="border border-slate-400 px-2 py-1">{i + 1}</td>
              <td className="border border-slate-400 px-2 py-1">{a.placa ?? "Sin placa"}</td>
              <td className="border border-slate-400 px-2 py-1">{a.tipo_bien}</td>
              <td className="border border-slate-400 px-2 py-1 font-semibold">{a.encontrado ? "Encontrado" : "No encontrado"}</td>
              <td className="border border-slate-400 px-2 py-1">{a.nota ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-base">Total: {activos.length} · encontrados: {activos.filter((a) => a.encontrado).length} · no encontrados: {activos.filter((a) => !a.encontrado).length}</p>
      {c.observaciones && <p className="mt-2 text-base"><strong>Observaciones:</strong> {c.observaciones}</p>}
      <div className="mt-16 grid grid-cols-2 gap-12 text-center text-base">
        <div className="border-t border-slate-800 pt-2">{c.responsable}<br />Responsable del aula</div>
        <div className="border-t border-slate-800 pt-2">{c.realizo ?? ""}<br />Administración</div>
      </div>
      <style>{`@media print { aside, header { display: none !important; } main { margin: 0 !important; padding: 0 !important; } }`}</style>
    </div>
  );
}
