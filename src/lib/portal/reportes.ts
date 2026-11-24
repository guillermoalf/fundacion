import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { agrupar, filtrarActivos, type ActivoReporte, type ConfigReporte } from "@/lib/reportes/activos";

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
