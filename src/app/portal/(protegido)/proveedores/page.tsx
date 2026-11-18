import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import { estiloTarjeta } from "../../_ui/estilos";
import FormularioProveedor from "./Formulario";
import { TIPOS_PROVEEDOR } from "./tipos";

export const metadata: Metadata = { title: "Proveedores" };
const nombreTipo = (t: string | null) => TIPOS_PROVEEDOR.find((x) => x.valor === t)?.texto ?? t ?? "—";

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const filas = await consultar((tx) =>
    tx.selectFrom("proveedores as p")
      .select(["p.id", "p.nombre", "p.tipo", "p.telefono", "p.activo", "p.cedula_juridica",
        sql<number>`(select count(*)::int from compras c where c.proveedor_id = p.id)`.as("compras"),
        sql<string | null>`(select sum(total) from compras c where c.proveedor_id = p.id)`.as("total")])
      .orderBy("p.nombre").execute(),
  );
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Proveedores" }]} titulo="Proveedores" />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Cambios guardados.</p>}
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "nombre", titulo: "Proveedor" },
            { clave: "tipo", titulo: "Tipo" },
            { clave: "telefono", titulo: "Teléfono", ocultarEnMovil: true },
            { clave: "compras", titulo: "Facturas", alinear: "derecha" },
            { clave: "total", titulo: "Total comprado", alinear: "derecha" },
            { clave: "estado", titulo: "Estado" },
          ]}
          filtros={[{ clave: "tipo", titulo: "Tipo" }, { clave: "estado", titulo: "Estado" }]}
          filas={filas.map((p) => ({
            id: p.id,
            href: `/portal/proveedores/${p.id}`,
            celdas: {
              nombre: p.nombre, tipo: nombreTipo(p.tipo), telefono: p.telefono ?? { vacio: true }, compras: String(p.compras),
              total: colones(p.total) ?? { vacio: true }, estado: p.activo ? { texto: "Activo", tono: "verde" } : { texto: "Inactivo", tono: "gris" },
            },
            orden: { compras: p.compras, total: p.total === null ? null : Number(p.total) },
            filtros: { tipo: nombreTipo(p.tipo), estado: p.activo ? "Activo" : "Inactivo" },
          }))}
        />
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Agregar un proveedor</h2>
            <FormularioProveedor />
          </section>
        )}
      </div>
    </>
  );
}
