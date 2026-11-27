/**
 * Lectura de activos con su depreciación al día (calculada con src/lib/calculos, la fuente de verdad).
 * Si falta costo, fecha o categoría, la depreciación y el valor en libros quedan en null: nunca se inventan.
 */
import type { Tx } from "@/lib/db";
import { calcularDepreciacion, calendarioDepreciacion, type ActivoDepreciable } from "@/lib/calculos/depreciacion";
import { hoyCR } from "./formato";

export function consultaActivos(tx: Tx) {
  return tx
    .selectFrom("activos as a")
    .leftJoin("ubicaciones as u", "u.id", "a.ubicacion_id")
    .innerJoin("fuentes_financiamiento as f", "f.id", "a.fuente_id")
    .leftJoin("categorias_activo as c", "c.id", "a.categoria_id")
    .select([
      "a.id", "a.placa", "a.tipo_bien", "a.marca", "a.modelo", "a.serie", "a.estado", "a.costo", "a.fecha_adquisicion",
      "a.fecha_baja", "a.motivo_baja", "a.metodo", "a.tasa_anual_override", "a.valor_residual", "a.notas", "a.origen",
      "a.fila_origen", "a.unidades_compra", "a.compra_linea_id", "a.ubicacion_id", "a.fuente_id", "a.categoria_id", "a.foto_url", "a.creado_en",
      "u.nombre as ubicacion", "u.color as color_ubicacion", "f.codigo as fuente", "c.nombre as categoria", "c.tasa_anual", "c.anios_vida",
    ]);
}

type FilaConsulta = Awaited<ReturnType<ReturnType<typeof consultaActivos>["execute"]>>[number];

/** Datos para el cálculo, o null si falta algo (costo, fecha o tasa). */
export function depreciable(a: FilaConsulta): ActivoDepreciable | null {
  const tasa = a.tasa_anual_override ?? a.tasa_anual;
  if (a.costo === null || a.fecha_adquisicion === null || tasa === null || a.anios_vida === null) return null;
  return {
    costo: Number(a.costo),
    valorResidual: Number(a.valor_residual),
    tasaAnual: Number(tasa),
    aniosVida: a.anios_vida,
    metodo: a.metodo,
    fechaAdquisicion: a.fecha_adquisicion,
    fechaBaja: a.fecha_baja,
  };
}

export function conDepreciacion(a: FilaConsulta, corte = hoyCR()) {
  const d = depreciable(a);
  const r = d ? calcularDepreciacion(d, corte) : null;
  return { ...a, depreciacion: r?.depreciacionAcumulada ?? null, valorLibros: r?.valorLibros ?? null, totalmenteDepreciado: r?.totalmenteDepreciado ?? false };
}

export function calendario(a: FilaConsulta) {
  const d = depreciable(a);
  return d ? calendarioDepreciacion(d) : null;
}

export type ActivoConDepreciacion = ReturnType<typeof conDepreciacion>;
