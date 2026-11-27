import type { Metadata } from "next";
import Link from "next/link";
import { alfa } from "@/lib/db/orden";
import { tipoReporte, TIPOS_REPORTE } from "@/lib/reportes/activos";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import { estiloBoton } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const { consultar, esAdmin } = await obtenerSesion();
  const reportes = await consultar((tx) => tx.selectFrom("reportes").select(["id", "nombre", "descripcion", "tipo", "activo"]).orderBy("activo", "desc").orderBy(alfa("nombre")).execute());

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes" }]} titulo="Reportes" acciones={esAdmin && <Link href="/portal/reportes/nuevo" className={estiloBoton.primario}>+ Nuevo reporte</Link>} />
      <section>
        <Tabla
          id="reportes"
          columnas={[{ clave: "nombre", titulo: "Reporte" }, { clave: "tipo", titulo: "De qué es" }, { clave: "descripcion", titulo: "Para qué es" }, { clave: "estado", titulo: "Estado" }]}
          filtros={[{ clave: "tipo", titulo: "De qué es" }, { clave: "estado", titulo: "Estado" }]}
          filas={reportes.map((r) => ({
            id: r.id,
            href: `/portal/reportes/${r.id}`,
            celdas: { nombre: r.nombre, tipo: TIPOS_REPORTE[tipoReporte(r.tipo)], descripcion: r.descripcion ?? { vacio: true }, estado: r.activo ? { texto: "Activo", tono: "verde" } : { texto: "Desactivado", tono: "gris" } },
            filtros: { tipo: TIPOS_REPORTE[tipoReporte(r.tipo)], estado: r.activo ? "Activo" : "Desactivado" },
          }))}
          vacio={<Vacio titulo="Todavía no hay reportes." accion={esAdmin && <Link href="/portal/reportes/nuevo" className={estiloBoton.primario}>Crear el primero</Link>} />}
        />
      </section>
    </>
  );
}
