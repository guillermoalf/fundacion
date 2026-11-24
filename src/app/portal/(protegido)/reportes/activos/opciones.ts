import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { alfa } from "@/lib/db/orden";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { hoyCR } from "@/lib/portal/formato";

/** Opciones del formulario de reportes (fondos, aulas, categorías, estados) y el umbral de hoy. */
export async function opcionesReporte(tx: Tx) {
  const [fuentes, ubicaciones, categorias, umbral] = await Promise.all([
    tx.selectFrom("fuentes_financiamiento").select(["codigo", "nombre"]).orderBy(alfa("codigo")).execute(),
    tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy(alfa("nombre")).execute(),
    tx.selectFrom("categorias_activo").select(["id", "nombre"]).orderBy(alfa("nombre")).execute(),
    sql<{ u: string | null }>`select umbral_activo(${hoyCR()}::date) as u`.execute(tx),
  ]);
  return {
    fuentes: fuentes.map((f) => ({ valor: f.codigo, texto: `${f.codigo} · ${f.nombre}` })),
    ubicaciones: ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre })),
    categorias: categorias.map((c) => ({ valor: c.id, texto: c.nombre })),
    estados: Object.entries(ESTADOS_ACTIVO).filter(([k]) => k !== "dado_de_baja").map(([valor, texto]) => ({ valor, texto })),
    umbral: umbral.rows[0].u === null ? null : Number(umbral.rows[0].u),
  };
}
