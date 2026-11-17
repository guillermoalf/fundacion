import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ corte?: string; fuente?: string }> }) {
  const sp = await searchParams;
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(sp.corte ?? "") ? sp.corte! : hoyCR();
  const fuente = sp.fuente ?? "PANI";
  const { consultar } = await obtenerSesion();
  const { fuentes, resumen } = await consultar(async (tx) => ({
    fuentes: await tx.selectFrom("fuentes_financiamiento").select(["codigo", "nombre"]).orderBy("id").execute(),
    resumen: (await sql<{ n: number; costo: string | null; libros: string | null; sin_valor: number }>`
      select count(*)::int as n, sum(costo) as costo, sum(valor_libros) as libros, count(*) filter (where valor_libros is null)::int as sin_valor
      from activos_al_corte(${corte}::date, ${fuente || null})`.execute(tx)).rows[0],
  }));
  const params = new URLSearchParams({ corte, ...(fuente ? { fuente } : {}) });

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes" }]} titulo="Reportes" descripcion="Reportes para los entes que financian a la fundación, con sus columnas oficiales." />
      <section className={`${estiloTarjeta} space-y-5`}>
        <div>
          <h2 className="text-xl font-semibold">Auxiliar de activos fijos (PANI)</h2>
          <p className="text-slate-600">Excel con las columnas exactas del formato oficial: tipo de bien, marca, modelo, serie, ubicación, placa, fecha, costo, depreciación acumulada y valor en libros.</p>
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className={estiloEtiqueta}>Fecha de corte</span>
            <input type="date" name="corte" defaultValue={corte} className={estiloInput} />
          </label>
          <label className="space-y-1.5">
            <span className={estiloEtiqueta}>Fuente de financiamiento</span>
            <select name="fuente" defaultValue={fuente} className={estiloInput}>
              {fuentes.map((f) => <option key={f.codigo} value={f.codigo}>{f.codigo} · {f.nombre}</option>)}
              <option value="">Todas las fuentes</option>
            </select>
          </label>
          <button type="submit" className={estiloBoton.secundario}>Actualizar resumen</button>
        </form>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-base">
          Al {fecha(corte)}{fuente ? ` con recursos ${fuente}` : ""}: <strong>{resumen.n}</strong> activos · costo {colones(resumen.costo) ?? "₡0,00"} · valor en libros {colones(resumen.libros) ?? "₡0,00"}.
          {resumen.sin_valor > 0 && <span className="text-amber-800"> {resumen.sin_valor} sin valor en libros por datos faltantes (sus celdas quedan vacías en el Excel).</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/portal/reportes/pani/descargar?${params}`} className={estiloBoton.primario}>Descargar Excel para el PANI</a>
          <a href={`/portal/reportes/pani/descargar?${params}&pendientes=1`} className={estiloBoton.secundario}>Descargar con hoja de pendientes (uso interno)</a>
        </div>
      </section>

      <section className={`${estiloTarjeta} mt-6 space-y-4`}>
        <div>
          <h2 className="text-xl font-semibold">Controles mensuales de inventario</h2>
          <p className="text-slate-600">Con los formatos que usa la fundación: Formulario N.º 1 (control de inventarios mensual) de alimentos y de aseo, y el control de inventario y consumo de productos de limpieza.</p>
        </div>
        <form action="/portal/reportes/inventario/descargar" className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className={estiloEtiqueta}>Mes</span>
            <input type="month" name="mes" defaultValue={corte.slice(0, 7)} className={estiloInput} />
          </label>
          <button type="submit" name="tipo" value="alimentos" className={estiloBoton.primario}>Alimentos (Formulario 1, Excel)</button>
          <button type="submit" name="tipo" value="aseo" className={estiloBoton.secundario}>Aseo (Formulario 1, Excel)</button>
          <button type="submit" name="tipo" value="limpieza" className={estiloBoton.secundario}>Control de limpieza (Word)</button>
        </form>
      </section>
    </>
  );
}
