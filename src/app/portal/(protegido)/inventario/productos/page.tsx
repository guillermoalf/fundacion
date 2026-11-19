import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";
import { estiloTarjeta } from "../../../_ui/estilos";
import { categoriasProducto } from "@/lib/portal/catalogos";
import { opcionesCategoria } from "../datos";
import { celdaPrecio, ultimosPrecios } from "@/lib/portal/precios";
import { fecha } from "@/lib/portal/formato";
import { FormularioProducto } from "../Formularios";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const { productos, proveedores, cats, precios } = await consultar(async (tx) => ({
    cats: await categoriasProducto(tx),
    precios: await ultimosPrecios(tx),
    productos: await tx.selectFrom("productos as p").leftJoin("proveedores as pr", "pr.id", "p.proveedor_habitual_id")
      .select(["p.id", "p.nombre", "p.categoria", "p.unidad", "p.stock_minimo", "p.activo", "pr.nombre as proveedor"]).orderBy("p.nombre").execute(),
    proveedores: await tx.selectFrom("proveedores").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute(),
  }));
  const nombreCat = new Map(cats.map((c) => [c.codigo, c.nombre]));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Productos" }]} titulo="Productos" descripcion="Lo que se lleva en inventario. Para dejar de usar uno, márquelo inactivo (no se borra)." />
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "nombre", titulo: "Producto" }, { clave: "categoria", titulo: "Categoría" }, { clave: "unidad", titulo: "Unidad" },
            { clave: "minimo", titulo: "Mínimo", alinear: "derecha" }, { clave: "proveedor", titulo: "Proveedor habitual", ocultarEnMovil: true }, { clave: "estado", titulo: "Estado" },
            { clave: "precio", titulo: "Último precio (con IVA)", alinear: "derecha", oculta: true },
            { clave: "ultimoProveedor", titulo: "Último proveedor", oculta: true },
            { clave: "ultima", titulo: "Última compra", oculta: true },
          ]}
          filtros={[{ clave: "categoria", titulo: "Categoría" }, { clave: "estado", titulo: "Estado" }, { clave: "proveedor", titulo: "Proveedor habitual" }]}
          filas={productos.map((p) => ({
            id: p.id,
            href: `/portal/inventario/productos/${p.id}`,
            celdas: {
              nombre: p.nombre, categoria: (nombreCat.get(p.categoria) ?? p.categoria), unidad: p.unidad, minimo: cantidad(p.stock_minimo)!,
              proveedor: p.proveedor ?? { vacio: true }, estado: p.activo ? { texto: "Activo", tono: "verde" } : { texto: "Inactivo", tono: "gris" },
              precio: celdaPrecio(precios.get(p.id)),
              ultimoProveedor: precios.get(p.id)?.ultimo.proveedor ?? { vacio: true },
              ultima: fecha(precios.get(p.id)?.ultimo.fecha) ?? { vacio: true },
            },
            orden: { minimo: Number(p.stock_minimo), precio: precios.get(p.id)?.ultimo.conIva ?? null, ultima: precios.get(p.id)?.ultimo.fecha ?? null },
            filtros: { categoria: (nombreCat.get(p.categoria) ?? p.categoria), estado: p.activo ? "Activo" : "Inactivo", proveedor: p.proveedor ?? "Sin definir" },
          }))}
        />
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Agregar un producto</h2>
            <FormularioProducto categorias={opcionesCategoria(cats)} proveedores={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))} />
          </section>
        )}
      </div>
    </>
  );
}
