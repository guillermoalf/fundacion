import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { agrupar, filtrarActivos, type ActivoReporte, type ConfigReporte, type TipoReporte } from "@/lib/reportes/activos";
import { hoyCR, rangoMes } from "@/lib/portal/formato";
import type { LineaCompra, MovimientoInventario, ProductoInventario } from "@/lib/reportes/inventario";
import { ivaPorLinea } from "@/lib/calculos/precios";

/** Todos los activos con su depreciación acumulada a la fecha de corte (cálculo de la base, en paridad con src/lib/calculos). */
export async function activosParaReporte(tx: Tx, corte: string): Promise<ActivoReporte[]> {
  const { rows } = await sql<{
    id: string; tipo_bien: string; marca: string | null; modelo: string | null; serie: string | null; placa: string | null; fuente: string;
    ubicacion_id: number | null; ubicacion: string | null; categoria_id: number | null; categoria: string | null; estado: string;
    fecha_adquisicion: string | null; fecha_baja: string | null; costo: string | null; unidades_compra: number | null; total_linea: string | null; dep: string | null;
  }>`
    select a.id, a.tipo_bien, a.marca, a.modelo, a.serie, a.placa, f.codigo as fuente, a.ubicacion_id, u.nombre as ubicacion,
           a.categoria_id, c.nombre as categoria, a.estado::text as estado, a.fecha_adquisicion, a.fecha_baja, a.costo, a.unidades_compra,
           l.total_linea,
           depreciacion_acumulada(a.costo, a.valor_residual, coalesce(a.tasa_anual_override, c.tasa_anual), c.anios_vida, a.metodo,
             a.fecha_adquisicion, least(${corte}::date, coalesce(a.fecha_baja, ${corte}::date))) as dep
    from activos a
    join fuentes_financiamiento f on f.id = a.fuente_id
    left join ubicaciones u on u.id = a.ubicacion_id
    left join categorias_activo c on c.id = a.categoria_id
    left join compra_lineas l on l.id = a.compra_linea_id`.execute(tx);
  const n = (v: string | null) => (v === null ? null : Number(v));
  return rows.map((r) => ({
    id: r.id, tipoBien: r.tipo_bien.trim(), marca: r.marca, modelo: r.modelo, serie: r.serie, placa: r.placa, fuente: r.fuente,
    ubicacionId: r.ubicacion_id, ubicacion: r.ubicacion, categoriaId: r.categoria_id, categoria: r.categoria, estado: r.estado,
    fechaAdquisicion: r.fecha_adquisicion, fechaBaja: r.fecha_baja, costo: n(r.costo), unidades: r.unidades_compra, totalLinea: n(r.total_linea), depreciacion: n(r.dep),
  }));
}

/** El reporte armado: qué activos entran, agrupados como pide la configuración. */
export async function armarReporte(tx: Tx, config: ConfigReporte, corte: string) {
  const umbral = (await sql<{ u: string | null }>`select umbral_activo(${corte}::date) as u`.execute(tx)).rows[0].u;
  const { filas, sinCosto, minimo } = filtrarActivos(await activosParaReporte(tx, corte), config, corte, umbral === null ? null : Number(umbral));
  return { filas, grupos: agrupar(filas, config.agrupar), sinCosto, minimo, umbral: umbral === null ? null : Number(umbral) };
}

/** Líneas de compra del período con su total CON IVA (el IVA de la factura electrónica o prorrateado, ver calculos/precios). */
export async function comprasParaReporte(tx: Tx, desde: string, hasta: string): Promise<LineaCompra[]> {
  const filas = await tx.selectFrom("compra_lineas as l").innerJoin("compras as c", "c.id", "l.compra_id")
    .innerJoin("proveedores as pr", "pr.id", "c.proveedor_id").innerJoin("fuentes_financiamiento as f", "f.id", "c.fuente_id")
    .leftJoin("productos as p", "p.id", "l.producto_id").leftJoin("categorias_producto as cp", "cp.codigo", "p.categoria")
    .select(["l.id", "l.compra_id", "c.fecha", "c.numero_factura", "c.iva as iva_compra", "pr.id as proveedor_id", "pr.nombre as proveedor", "f.codigo as fuente",
      "l.descripcion", "p.nombre as producto", "p.categoria", "cp.nombre as categoria_nombre", "l.cantidad", "l.unidad", "l.total_linea", "l.iva_linea"])
    .where("c.fecha", ">=", desde).where("c.fecha", "<=", hasta).orderBy("c.fecha").orderBy("l.id").execute();
  const porCompra = new Map<string, typeof filas>();
  for (const l of filas) porCompra.set(l.compra_id, [...(porCompra.get(l.compra_id) ?? []), l]);
  const iva = new Map<string, number>();
  for (const ls of porCompra.values()) {
    const montos = ivaPorLinea(ls.map((l) => ({ monto: Number(l.total_linea ?? 0), iva: l.iva_linea === null ? null : Number(l.iva_linea) })), Number(ls[0].iva_compra));
    ls.forEach((l, i) => iva.set(l.id, montos[i]));
  }
  return filas.map((l) => {
    const total = l.total_linea === null ? null : Number(l.total_linea) + (iva.get(l.id) ?? 0);
    const cantidad = Number(l.cantidad);
    return {
      id: l.id, compraId: l.compra_id, fecha: l.fecha, factura: l.numero_factura, proveedorId: l.proveedor_id, proveedor: l.proveedor, fuente: l.fuente,
      descripcion: l.descripcion, producto: l.producto, categoria: l.categoria, categoriaNombre: l.categoria_nombre,
      cantidad, unidad: l.unidad, total, precioConIva: total === null || !cantidad ? null : Math.round((total / cantidad) * 100) / 100,
    };
  });
}

/** Productos y sus movimientos hasta la fecha final (para saldo inicial, entradas, salidas y saldo final). */
export async function inventarioParaReporte(tx: Tx, hasta: string) {
  const [productos, movs] = await Promise.all([
    tx.selectFrom("productos as p").innerJoin("categorias_producto as cp", "cp.codigo", "p.categoria")
      .select(["p.id", "p.nombre", "p.categoria", "cp.nombre as categoria_nombre", "p.unidad"]).execute(),
    tx.selectFrom("inventario_movimientos").select(["producto_id", "fecha", "tipo", "cantidad"]).where("fecha", "<=", hasta).execute(),
  ]);
  return {
    productos: productos.map((p): ProductoInventario => ({ id: p.id, nombre: p.nombre, categoria: p.categoria, categoriaNombre: p.categoria_nombre, unidad: p.unidad })),
    movs: movs.map((m): MovimientoInventario => ({ productoId: m.producto_id, fecha: m.fecha, tipo: m.tipo, cantidad: Number(m.cantidad) })),
  };
}

const esFecha = (v?: string | null) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");

/** Fecha de corte (activos) o período (compras e inventario; por defecto el mes actual) que se escoge al ver o exportar. */
export function periodo(tipo: TipoReporte, sp: { corte?: string | null; desde?: string | null; hasta?: string | null }) {
  const hoy = hoyCR();
  if (tipo === "activos") return { corte: esFecha(sp.corte) ? sp.corte! : hoy, desde: hoy, hasta: hoy };
  const mes = rangoMes(hoy.slice(0, 7));
  return { corte: hoy, desde: esFecha(sp.desde) ? sp.desde! : mes.desde, hasta: esFecha(sp.hasta) ? sp.hasta! : mes.hasta };
}
