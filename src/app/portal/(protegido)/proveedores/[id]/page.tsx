import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { categoriasProducto } from "@/lib/portal/catalogos";
import { opcionesCategoria } from "../../inventario/datos";
import { FormularioProducto } from "../../inventario/Formularios";
import FormularioProveedor from "../Formulario";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Proveedor" };

export default async function ProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { consultar, puedeEscribir } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const p = await tx.selectFrom("proveedores").selectAll().where("id", "=", id).executeTakeFirst();
    if (!p) return null;
    const productos = await tx.selectFrom("productos as pr").innerJoin("v_saldo_inventario as v", "v.producto_id", "pr.id")
      .select(["pr.id", "pr.nombre", "pr.unidad", "pr.categoria", "pr.stock_minimo", "pr.activo", "v.saldo"]).where("pr.proveedor_habitual_id", "=", id).orderBy(alfa("pr.nombre")).execute();
    const proveedores = await tx.selectFrom("proveedores").select(["id", "nombre"]).orderBy(alfa("nombre")).execute();
    return { p, productos, proveedores, cats: await categoriasProducto(tx) };
  });
  if (!d) notFound();
  const { p, productos } = d;
  const nombreCat = new Map(d.cats.map((c) => [c.codigo, c.nombre]));
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Proveedores", href: "/portal/proveedores" }, { etiqueta: p.nombre }]}
        titulo={p.nombre}
        acciones={<Link href={`/portal/proveedores/${id}/pedido`} className={estiloBoton.primario}>Hacer pedido</Link>}
      />
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Productos que se le compran</h2>
          <Tabla
            columnas={[{ clave: "nombre", titulo: "Producto" }, { clave: "categoria", titulo: "Categoría" }, { clave: "hay", titulo: "En bodega", alinear: "derecha" }, { clave: "minimo", titulo: "Mínimo", alinear: "derecha" }]}
            filas={productos.map((x) => ({
              id: x.id, href: `/portal/inventario/productos/${x.id}`,
              celdas: { nombre: x.activo ? x.nombre : `${x.nombre} (inactivo)`, categoria: (nombreCat.get(x.categoria) ?? x.categoria), hay: `${cantidad(x.saldo)} ${x.unidad}`, minimo: Number(x.stock_minimo) ? `${cantidad(x.stock_minimo)} ${x.unidad}` : { vacio: true } },
            }))}
            buscador={productos.length > 10}
          />
          {puedeEscribir && (
            <details className={estiloTarjeta}>
              <summary className="cursor-pointer text-lg font-semibold text-sky-700">+ Agregar un producto de {p.nombre}</summary>
              <div className="mt-4">
                <FormularioProducto v={{ proveedor_habitual_id: id, categoria: p.tipo === "frutas_verduras" ? "frutas_verduras" : undefined }} nuevoConProveedor categorias={opcionesCategoria(d.cats)} proveedores={d.proveedores.map((x) => ({ valor: x.id, texto: x.nombre }))} />
              </div>
            </details>
          )}
        </section>
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Datos del proveedor</h2>
            <FormularioProveedor v={p} />
          </section>
        )}
      </div>
    </>
  );
}
