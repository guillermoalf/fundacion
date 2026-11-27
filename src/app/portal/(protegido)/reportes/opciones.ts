import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { alfa } from "@/lib/db/orden";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { hoyCR } from "@/lib/portal/formato";

/** Opciones del formulario de reportes (fondos, aulas, categorías, estados) y el umbral de hoy. */
export async function opcionesReporte(tx: Tx) {
  const [fuentes, ubicaciones, categorias, categoriasProducto, proveedores, umbral] = await Promise.all([
    tx.selectFrom("fuentes_financiamiento").select(["codigo", "nombre"]).orderBy(alfa("codigo")).execute(),
    tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy(alfa("nombre")).execute(),
    tx.selectFrom("categorias_activo").select(["id", "nombre", "activa", "tasa_anual", "anios_vida"]).orderBy(alfa("nombre")).execute(),
    tx.selectFrom("categorias_producto").select(["codigo", "nombre", "activo"]).orderBy(alfa("nombre")).execute(),
    tx.selectFrom("proveedores").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute(),
    sql<{ u: string | null }>`select umbral_activo(${hoyCR()}::date) as u`.execute(tx),
  ]);
  return {
    fuentes: fuentes.map((f) => ({ valor: f.codigo, texto: `${f.codigo} · ${f.nombre}` })),
    ubicaciones: ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre })),
    categorias: categorias.map((c) => ({ valor: c.id, texto: c.nombre, activa: c.activa, detalle: `${Number(c.tasa_anual)} % al año · ${c.anios_vida} años` })),
    categoriasProducto: categoriasProducto.map((c) => ({ valor: c.codigo, texto: c.nombre, activa: c.activo })),
    proveedores: proveedores.map((p) => ({ valor: p.id, texto: p.nombre })),
    estados: Object.entries(ESTADOS_ACTIVO).filter(([k]) => k !== "dado_de_baja").map(([valor, texto]) => ({ valor, texto })),
    umbral: umbral.rows[0].u === null ? null : Number(umbral.rows[0].u),
  };
}
