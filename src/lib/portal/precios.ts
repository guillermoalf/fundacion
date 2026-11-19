import type { Tx } from "@/lib/db";
import { variacion } from "@/lib/calculos/precios";
import { colones, fecha } from "@/lib/portal/formato";
import type { Celda } from "@/app/portal/_ui/Tabla";

export type Precio = { fecha: string; proveedor: string; proveedor_id: number; compra_id: string; numero_factura: string; sinIva: number; iva: number; conIva: number; cantidad: number; unidad: string };
export type UltimoPrecio = { ultimo: Precio; anterior: Precio | null; variacion: number | null };

/** Historial de precios (con IVA) de los productos, del más reciente al más viejo. */
export async function historialPrecios(tx: Tx, productoId?: number) {
  let q = tx.selectFrom("v_precios_producto").selectAll();
  if (productoId !== undefined) q = q.where("producto_id", "=", productoId);
  const filas = await q.orderBy("fecha", "desc").orderBy("creado_en", "desc").execute();
  return filas.map((f) => ({
    producto_id: f.producto_id!,
    fecha: f.fecha!, proveedor: f.proveedor!, proveedor_id: f.proveedor_id!, compra_id: f.compra_id!, numero_factura: f.numero_factura!,
    sinIva: Number(f.precio_unitario), iva: Number(f.iva_unitario), conIva: Number(f.precio_con_iva), cantidad: Number(f.cantidad), unidad: f.unidad!,
  }));
}

/** Último precio de cada producto y cuánto cambió respecto a la compra anterior. */
export async function ultimosPrecios(tx: Tx): Promise<Map<number, UltimoPrecio>> {
  const por = new Map<number, Precio[]>();
  for (const p of await historialPrecios(tx)) {
    const l = por.get(p.producto_id) ?? [];
    if (l.length < 2) l.push(p);
    por.set(p.producto_id, l);
  }
  return new Map([...por].map(([id, [ultimo, anterior]]) => [id, { ultimo, anterior: anterior ?? null, variacion: variacion(ultimo.conIva, anterior?.conIva ?? null) }]));
}

/** Celda de la lista: precio con IVA, desglose pequeño y flecha con el cambio. */
export function celdaPrecio(p: UltimoPrecio | undefined): Celda {
  if (!p) return { vacio: true };
  const v = p.variacion;
  return {
    texto: colones(p.ultimo.conIva)!,
    detalle: `${colones(p.ultimo.sinIva)} + IVA ${colones(p.ultimo.iva)}`,
    ...(v !== null && v !== 0 ? { extra: { texto: `${v > 0 ? "↑" : "↓"} ${Math.abs(v).toLocaleString("es-CR")} %`, tono: v > 0 ? "rojo" : "verde" } } : {}),
  };
}

export const textoUltimaCompra = (p: UltimoPrecio | undefined) => (p ? `${fecha(p.ultimo.fecha)} · ${p.ultimo.proveedor}` : null);
