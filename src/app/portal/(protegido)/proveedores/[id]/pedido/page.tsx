import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../../_ui/Encabezado";
import Vacio from "../../../../_ui/Vacio";
import { estiloBoton } from "../../../../_ui/estilos";
import Pedido from "./Pedido";

export const metadata: Metadata = { title: "Hacer pedido" };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { consultar } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const p = await tx.selectFrom("proveedores").select(["id", "nombre", "telefono"]).where("id", "=", id).executeTakeFirst();
    if (!p) return null;
    const items = await tx.selectFrom("productos as pr").innerJoin("v_saldo_inventario as v", "v.producto_id", "pr.id")
      .select(["pr.id", "pr.nombre", "pr.unidad", "v.saldo", "pr.stock_minimo"]).where("pr.proveedor_habitual_id", "=", id).where("pr.activo", "=", true).orderBy("pr.nombre").execute();
    return { p, items };
  });
  if (!d) notFound();
  return (
    <>
      <div className="print:hidden">
        <Encabezado
          migas={[{ etiqueta: "Proveedores", href: "/portal/proveedores" }, { etiqueta: d.p.nombre, href: `/portal/proveedores/${id}` }, { etiqueta: "Hacer pedido" }]}
          titulo={`Pedido a ${d.p.nombre}`}
          descripcion={d.p.telefono ? `Teléfono: ${d.p.telefono}` : undefined}
        />
      </div>
      <div className="mb-4 hidden print:block">
        <h1 className="text-xl font-bold">Fundación Creciendo Feliz — Pedido a {d.p.nombre}</h1>
        <p>Fecha: {fecha(hoyCR())}</p>
      </div>
      {d.items.length === 0 ? (
        <Vacio titulo="Este proveedor todavía no tiene productos." accion={<Link href={`/portal/proveedores/${id}`} className={estiloBoton.primario}>Agregar sus productos</Link>}>
          Agregue lo que se le compra (con el mínimo que debe haber en bodega) y aquí aparecerá el pedido sugerido.
        </Vacio>
      ) : (
        <Pedido proveedor={d.p.nombre} fecha={fecha(hoyCR())!} items={d.items.map((i) => ({ id: i.id, nombre: i.nombre, unidad: i.unidad, saldo: Number(i.saldo), minimo: Number(i.stock_minimo) }))} />
      )}
    </>
  );
}
