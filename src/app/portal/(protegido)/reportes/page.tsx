import type { Metadata } from "next";
import Link from "next/link";
import { alfa } from "@/lib/db/orden";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import { estiloBoton } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const { consultar, esAdmin } = await obtenerSesion();
  const reportes = await consultar((tx) => tx.selectFrom("reportes_activos").select(["id", "nombre", "descripcion", "activo"]).orderBy("activo", "desc").orderBy(alfa("nombre")).execute());

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes" }]} titulo="Reportes" acciones={esAdmin && <Link href="/portal/reportes/activos/nuevo" className={estiloBoton.primario}>+ Nuevo reporte</Link>} />
      <section>
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
          vacio={<Vacio titulo="Todavía no hay reportes." accion={esAdmin && <Link href="/portal/reportes/activos/nuevo" className={estiloBoton.primario}>Crear el primero</Link>} />}
        />
      </section>
    </>
  );
}
