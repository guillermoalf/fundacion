import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../_ui/estilos";
import { DIAS_AVISO_VENCIMIENTO } from "./datos";
import { celdaPrecio, ultimosPrecios } from "@/lib/portal/precios";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const { saldos, porVencer, precios } = await consultar(async (tx) => ({
    precios: await ultimosPrecios(tx),
    saldos: await tx.selectFrom("v_saldo_inventario as v").innerJoin("productos as p", "p.id", "v.producto_id").innerJoin("categorias_producto as cp", "cp.codigo", "p.categoria")
      .leftJoin("proveedores as ph", "ph.id", "p.proveedor_habitual_id")
      .select(["ph.nombre as habitual", "cp.reporte",
        "v.producto_id", "v.nombre", "cp.nombre as categoria", "v.unidad", "v.stock_minimo", "v.saldo"]).where("p.activo", "=", true).orderBy(alfa("v.nombre")).execute(),
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
          { clave: "precio", titulo: "Último precio (con IVA)", alinear: "derecha" },
          { clave: "estado", titulo: "Estado" },
          { clave: "proveedor", titulo: "Último proveedor", oculta: true },
          { clave: "ultima", titulo: "Última compra", oculta: true },
          { clave: "habitual", titulo: "Proveedor habitual", oculta: true },
          { clave: "unidad", titulo: "Unidad", oculta: true },
          { clave: "reporte", titulo: "Reporte mensual", oculta: true },
        ]}
        filtros={[
          { clave: "categoria", titulo: "Categoría" }, { clave: "estado", titulo: "Estado" },
          { clave: "proveedor", titulo: "Último proveedor" }, { clave: "habitual", titulo: "Proveedor habitual" },
        ]}
        filas={saldos.map((s) => {
          const bajo = Number(s.stock_minimo) > 0 && Number(s.saldo) < Number(s.stock_minimo);
          const p = precios.get(s.producto_id!);
          const estado = bajo ? "Bajo el mínimo" : Number(s.saldo) === 0 ? "Agotado" : "Con existencia";
          return {
            id: s.producto_id!,
            href: `/portal/inventario/productos/${s.producto_id}`,
            celdas: {
              producto: s.nombre!, categoria: s.categoria,
              saldo: `${cantidad(s.saldo)} ${s.unidad}`, minimo: Number(s.stock_minimo) ? `${cantidad(s.stock_minimo)} ${s.unidad}` : { vacio: true },
              estado: bajo ? { texto: "Bajo", tono: "ambar" } : Number(s.saldo) === 0 ? { texto: "Agotado", tono: "gris" } : { vacio: true },
              precio: celdaPrecio(p),
              proveedor: p ? { texto: p.ultimo.proveedor, href: `/portal/proveedores/${p.ultimo.proveedor_id}` } : { vacio: true },
              ultima: p ? { texto: fecha(p.ultimo.fecha)!, href: `/portal/compras/${p.ultimo.compra_id}` } : { vacio: true },
              habitual: s.habitual ?? { vacio: true },
              unidad: s.unidad,
              reporte: s.reporte === "alimentos" ? "Alimentos" : s.reporte === "aseo" ? "Aseo" : "—",
            },
            orden: { saldo: Number(s.saldo), minimo: Number(s.stock_minimo), precio: p ? p.ultimo.conIva : null, ultima: p?.ultimo.fecha ?? null },
            filtros: { categoria: s.categoria, estado, proveedor: p?.ultimo.proveedor ?? "Sin compras", habitual: s.habitual ?? "Sin definir" },
          };
        })}
      />
      <section className={`${estiloTarjeta} mt-8 space-y-4`}>
        <h2 className="text-xl font-semibold">Controles mensuales de inventario</h2>
        <form action="/portal/reportes/inventario/descargar" className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className={estiloEtiqueta}>Mes</span>
            <input type="month" name="mes" defaultValue={hoy.slice(0, 7)} className={estiloInput} />
          </label>
          <button type="submit" name="tipo" value="alimentos" className={estiloBoton.primario}>Alimentos (Formulario 1, Excel)</button>
          <button type="submit" name="tipo" value="aseo" className={estiloBoton.secundario}>Aseo (Formulario 1, Excel)</button>
          <button type="submit" name="tipo" value="limpieza" className={estiloBoton.secundario}>Control de limpieza (Word)</button>
        </form>
      </section>
    </>
  );
}
