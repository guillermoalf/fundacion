import type { Metadata } from "next";
import Link from "next/link";
import { alfa } from "@/lib/db/orden";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { obtenerSesion } from "@/lib/portal/sesion";
import { hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const corte = hoyCR();
  const { consultar, esAdmin } = await obtenerSesion();
  const reportes = await consultar((tx) => tx.selectFrom("reportes_activos").select(["id", "nombre", "descripcion", "activo"]).orderBy("activo", "desc").orderBy(alfa("nombre")).execute());

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes" }]} titulo="Reportes" />
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Reportes de activos</h2>
          {esAdmin && <Link href="/portal/reportes/activos/nuevo" className={estiloBoton.primario}>+ Nuevo reporte</Link>}
        </div>
        <Tabla
          id="reportes-activos"
          columnas={[{ clave: "nombre", titulo: "Reporte" }, { clave: "descripcion", titulo: "Para qué es" }, { clave: "estado", titulo: "Estado" }]}
          filtros={[{ clave: "estado", titulo: "Estado" }]}
          filas={reportes.map((r) => ({
            id: r.id,
            href: `/portal/reportes/activos/${r.id}`,
            celdas: { nombre: r.nombre, descripcion: r.descripcion ?? { vacio: true }, estado: r.activo ? { texto: "Activo", tono: "verde" } : { texto: "Desactivado", tono: "gris" } },
            filtros: { estado: r.activo ? "Activo" : "Desactivado" },
          }))}
          vacio={<Vacio titulo="Todavía no hay reportes de activos." accion={esAdmin && <Link href="/portal/reportes/activos/nuevo" className={estiloBoton.primario}>Crear el primero</Link>} />}
        />
      </section>

      <section className={`${estiloTarjeta} mt-6 space-y-4`}>
        <h2 className="text-xl font-semibold">Controles mensuales de inventario</h2>
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
