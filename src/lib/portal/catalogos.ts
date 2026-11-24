import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { alfa } from "@/lib/db/orden";

/** Listas que usan los formularios (solo lo activo, ordenado para mostrar). */
export async function catalogosActivos(tx: Tx) {
  const [ubicaciones, fuentes, categorias] = await Promise.all([
    tx.selectFrom("ubicaciones").select(["id", "nombre", "activo"]).orderBy(alfa("nombre")).execute(),
    tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre", "activo"]).orderBy("id").execute(),
    tx.selectFrom("categorias_activo").select(["id", "nombre", "tasa_anual", "anios_vida", "palabras_clave", "activa"]).orderBy(alfa("nombre")).execute(),
  ]);
  return { ubicaciones, fuentes, categorias };
}

export type Catalogos = Awaited<ReturnType<typeof catalogosActivos>>;

export const opciones = <T extends { id: number; nombre: string }>(xs: T[], activo: (x: T) => boolean = () => true) =>
  xs.filter(activo).map((x) => ({ valor: x.id, texto: x.nombre }));

export const ESTADOS_ACTIVO = {
  en_uso: "En uso",
  en_reparacion: "En reparación",
  en_bodega: "En bodega",
  extraviado: "Extraviado",
  dado_de_baja: "Dado de baja",
} as const;

/** Costo por unidad a partir del cual un artículo es activo (25 % de un salario base, parámetros). Null si faltan. */
export async function umbralActivo(tx: Tx, fecha?: string | null): Promise<number | null> {
  const { rows } = await sql<{ u: string | null }>`select umbral_activo(coalesce(${fecha ?? null}::date, current_date)) as u`.execute(tx);
  return rows[0].u === null ? null : Number(rows[0].u);
}

/** Categorías de productos del inventario, en su orden (activas e inactivas). */
export const categoriasProducto = (tx: Tx) =>
  tx.selectFrom("categorias_producto").select(["codigo", "nombre", "reporte", "activo"]).orderBy(alfa("nombre")).execute();
