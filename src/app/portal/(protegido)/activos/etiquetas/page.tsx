import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import Vacio from "../../../_ui/Vacio";
import { estiloBoton, estiloInput } from "../../../_ui/estilos";
import BotonImprimir from "./BotonImprimir";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Etiquetas de activos" };

/**
 * Hoja A4 de etiquetas (3 × 8 = 24 por hoja, 70 × 37 mm, formato de etiqueta adhesiva común).
 * El QR lleva a la ficha del activo: sirve para el conteo físico desde el celular.
 */
export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ ids?: string; ubicacion?: string; sinPlaca?: string }> }) {
  const { ids, ubicacion, sinPlaca } = await searchParams;
  const { consultar } = await obtenerSesion();
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const { ubicaciones, activos } = await consultar(async (tx) => {
    const ubicaciones = await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy(alfa("nombre")).execute();
    if (!ids && !ubicacion) return { ubicaciones, activos: [] };
    let q = tx.selectFrom("activos as a").leftJoin("ubicaciones as u", "u.id", "a.ubicacion_id")
      .select(["a.id", "a.placa", "a.tipo_bien", "u.nombre as ubicacion"]).where("a.estado", "<>", "dado_de_baja");
    if (ids) q = q.where("a.id", "in", ids.split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)));
    if (ubicacion && ubicacion !== "todas") q = q.where("a.ubicacion_id", "=", Number(ubicacion));
    if (!sinPlaca) q = q.where("a.placa", "is not", null);
    return { ubicaciones, activos: await q.orderBy(alfa("u.nombre")).orderBy("a.placa").execute() };
  });

  const etiquetas = await Promise.all(
    activos.map(async (a) => ({ ...a, qr: await QRCode.toString(`${origen}/portal/activos/${a.id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) })),
  );

  return (
    <>
      <div className="print:hidden">
        <Encabezado
          migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: "Etiquetas" }]}
          titulo="Imprimir etiquetas"
          descripcion="Hoja A4 con 24 etiquetas (3 columnas × 8 filas). Cada etiqueta lleva la placa y un código QR que abre la ficha del activo."
          acciones={etiquetas.length > 0 && <BotonImprimir texto={`Imprimir ${etiquetas.length} etiquetas`} />}
        />
        <form className="mb-6 flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">Ubicación</span>
            <select name="ubicacion" defaultValue={ubicacion ?? ""} className={estiloInput}>
              <option value="todas">Todas</option>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-3 text-base">
            <input type="checkbox" name="sinPlaca" value="1" defaultChecked={!!sinPlaca} className="h-5 w-5" /> Incluir los que no tienen placa
          </label>
          <button type="submit" className={estiloBoton.secundario}>Ver etiquetas</button>
        </form>
        {(ids || ubicacion) && etiquetas.length === 0 && <Vacio titulo="No hay activos con placa para esa selección." />}
      </div>

      {etiquetas.length > 0 && (
        <div className="etiquetas mx-auto grid w-[210mm] grid-cols-3 bg-white print:w-auto">
          {etiquetas.map((e) => (
            <div key={e.id} className="flex h-[37mm] w-[70mm] items-center gap-2 overflow-hidden border border-dashed border-slate-300 px-[3mm] print:border-0">
              <div className="h-[28mm] w-[28mm] shrink-0" dangerouslySetInnerHTML={{ __html: e.qr }} />
              <div className="min-w-0 leading-tight">
                <p className="text-[8pt] font-semibold uppercase text-slate-500">Fundación Creciendo Feliz</p>
                <p className="text-[16pt] font-bold">{e.placa ?? "SIN PLACA"}</p>
                <p className="truncate text-[9pt]">{e.tipo_bien}</p>
                <p className="truncate text-[8pt] text-slate-600">{e.ubicacion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@media print { @page { size: A4; margin: 13mm 0 0 0; } aside, header { display: none !important; } main { margin: 0 !important; padding: 0 !important; } .etiquetas > div { break-inside: avoid; } }`}</style>
    </>
  );
}
