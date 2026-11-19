import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import { estiloBoton, estiloTarjeta } from "../../_ui/estilos";
import { DIAS_AVISO_VENCIMIENTO } from "./datos";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const { saldos, porVencer } = await consultar(async (tx) => ({
    saldos: await tx.selectFrom("v_saldo_inventario as v").innerJoin("productos as p", "p.id", "v.producto_id").innerJoin("categorias_producto as cp", "cp.codigo", "p.categoria")
      .select(["v.producto_id", "v.nombre", "cp.nombre as categoria", "v.unidad", "v.stock_minimo", "v.saldo"]).where("p.activo", "=", true).orderBy("v.nombre").execute(),
    porVencer: await tx.selectFrom("inventario_movimientos as m").innerJoin("v_saldo_inventario as v", "v.producto_id", "m.producto_id")
      .select(["m.id", "m.fecha_vencimiento", "m.cantidad", "v.nombre", "v.unidad", "v.saldo"])
      .where("m.tipo", "=", "entrada").where("m.fecha_vencimiento", "is not", null)
      .where("m.fecha_vencimiento", "<=", sql<string>`(${hoy}::date + ${DIAS_AVISO_VENCIMIENTO}::int)`)
      .where("m.fecha_vencimiento", ">=", sql<string>`(${hoy}::date - 30)`)
      .where("v.saldo", ">", "0").orderBy("m.fecha_vencimiento").execute(),
  }));
  const bajos = saldos.filter((s) => Number(s.stock_minimo) > 0 && Number(s.saldo) < Number(s.stock_minimo));

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Inventario" }]}
        titulo="Inventario"
        descripcion="Alimentos, limpieza y otros consumibles. Las compras suman; las entregas y mermas restan."
        acciones={
          <>
            {puedeEscribir && <Link href="/portal/inventario/movimiento" className={estiloBoton.primario}>Registrar salida o merma</Link>}
            {puedeEscribir && <Link href="/portal/compras/nueva" className={estiloBoton.secundario}>Registrar compra (factura)</Link>}
            <Link href="/portal/proveedores" className={estiloBoton.secundario}>Hacer pedido a un proveedor</Link>
            <Link href="/portal/inventario/productos" className={estiloBoton.secundario}>Productos</Link>
            <Link href="/portal/inventario/categorias" className={estiloBoton.secundario}>Categorías</Link>
            <Link href="/portal/inventario/consumo" className={estiloBoton.secundario}>Consumo mensual</Link>
          </>
        }
      />
      {(bajos.length > 0 || porVencer.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {bajos.length > 0 && (
            <section className={`${estiloTarjeta} border-amber-300`}>
              <h2 className="mb-2 text-lg font-semibold text-amber-900">Por debajo del mínimo ({bajos.length})</h2>
              <ul className="space-y-1 text-base">
                {bajos.map((b) => (
                  <li key={b.producto_id}><Link className={estiloBoton.enlace} href={`/portal/inventario/productos/${b.producto_id}`}>{b.nombre}</Link>: quedan {cantidad(b.saldo)} {b.unidad} (mínimo {cantidad(b.stock_minimo)})</li>
                ))}
              </ul>
            </section>
          )}
          {porVencer.length > 0 && (
            <section className={`${estiloTarjeta} border-red-300`}>
              <h2 className="mb-2 text-lg font-semibold text-red-900">Vencen pronto o ya vencieron</h2>
              <ul className="space-y-1 text-base">
                {porVencer.map((v) => (
                  <li key={v.id}>{v.nombre}: entrada de {cantidad(v.cantidad)} {v.unidad} {v.fecha_vencimiento! < hoy ? "venció" : "vence"} el <strong>{fecha(v.fecha_vencimiento)}</strong></li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-slate-600">Si ya se usó o se botó, registre la salida o la merma.</p>
            </section>
          )}
        </div>
      )}
      <Tabla
        columnas={[
          { clave: "producto", titulo: "Producto" },
          { clave: "categoria", titulo: "Categoría" },
          { clave: "saldo", titulo: "En bodega", alinear: "derecha" },
          { clave: "minimo", titulo: "Mínimo", alinear: "derecha", ocultarEnMovil: true },
          { clave: "estado", titulo: "" },
        ]}
        filtros={[{ clave: "categoria", titulo: "Categoría" }]}
        filas={saldos.map((s) => {
          const bajo = Number(s.stock_minimo) > 0 && Number(s.saldo) < Number(s.stock_minimo);
          return {
            id: s.producto_id!,
            href: `/portal/inventario/productos/${s.producto_id}`,
            celdas: {
              producto: s.nombre!, categoria: s.categoria,
              saldo: `${cantidad(s.saldo)} ${s.unidad}`, minimo: Number(s.stock_minimo) ? `${cantidad(s.stock_minimo)} ${s.unidad}` : { vacio: true },
              estado: bajo ? { texto: "Bajo", tono: "ambar" } : Number(s.saldo) === 0 ? { texto: "Agotado", tono: "gris" } : { vacio: true },
            },
            orden: { saldo: Number(s.saldo) },
            filtros: { categoria: s.categoria },
          };
        })}
      />
    </>
  );
}
