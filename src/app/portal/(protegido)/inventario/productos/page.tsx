import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";
import { estiloTarjeta } from "../../../_ui/estilos";
import { CATEGORIAS_PRODUCTO } from "../datos";
import { FormularioProducto } from "../Formularios";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const { productos, proveedores } = await consultar(async (tx) => ({
    productos: await tx.selectFrom("productos as p").leftJoin("proveedores as pr", "pr.id", "p.proveedor_habitual_id")
      .select(["p.id", "p.nombre", "p.categoria", "p.unidad", "p.stock_minimo", "p.activo", "pr.nombre as proveedor"]).orderBy("p.nombre").execute(),
    proveedores: await tx.selectFrom("proveedores").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute(),
  }));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Productos" }]} titulo="Productos" descripcion="Lo que se lleva en inventario. Para dejar de usar uno, márquelo inactivo (no se borra)." />
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "nombre", titulo: "Producto" }, { clave: "categoria", titulo: "Categoría" }, { clave: "unidad", titulo: "Unidad" },
            { clave: "minimo", titulo: "Mínimo", alinear: "derecha" }, { clave: "proveedor", titulo: "Proveedor habitual", ocultarEnMovil: true }, { clave: "estado", titulo: "Estado" },
          ]}
          filtros={[{ clave: "categoria", titulo: "Categoría" }, { clave: "estado", titulo: "Estado" }]}
          filas={productos.map((p) => ({
            id: p.id,
            href: `/portal/inventario/productos/${p.id}`,
            celdas: {
              nombre: p.nombre, categoria: CATEGORIAS_PRODUCTO[p.categoria], unidad: p.unidad, minimo: cantidad(p.stock_minimo)!,
              proveedor: p.proveedor ?? { vacio: true }, estado: p.activo ? { texto: "Activo", tono: "verde" } : { texto: "Inactivo", tono: "gris" },
            },
            filtros: { categoria: CATEGORIAS_PRODUCTO[p.categoria], estado: p.activo ? "Activo" : "Inactivo" },
          }))}
        />
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Agregar un producto</h2>
            <FormularioProducto proveedores={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))} />
          </section>
        )}
      </div>
    </>
  );
}
