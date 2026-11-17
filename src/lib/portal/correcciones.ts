/**
 * Editor genérico de correcciones (solo superadministrador): lee cualquier registro de una tabla con bitácora
 * y lo actualiza con un motivo. Las tablas y columnas salen del catálogo de la base (nada se arma con texto libre).
 */
import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { ErrorUsuario } from "./acciones";

export type Columna = { nombre: string; tipo: string; generada: boolean; esLlave: boolean };

export async function tablaCorregible(tx: Tx, tabla: string) {
  const { rows } = await sql<{ tabla: string; llave: string[] }>`select * from tablas_corregibles() where tabla = ${tabla}`.execute(tx);
  if (!rows[0]) throw new ErrorUsuario("Esa tabla no se puede corregir desde aquí, o usted no tiene permiso.");
  const { rows: cols } = await sql<{ nombre: string; tipo: string; generada: boolean }>`
    select a.attname as nombre, format_type(a.atttypid, a.atttypmod) as tipo, (a.attgenerated <> '') as generada
    from pg_attribute a where a.attrelid = ${tabla}::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`.execute(tx);
  const columnas: Columna[] = cols.map((c) => ({ ...c, esLlave: rows[0].llave.includes(c.nombre) }));
  for (const c of columnas) if (!/^[a-z0-9_ ,()[\]".]+$/i.test(c.tipo)) throw new ErrorUsuario("Tipo de dato no soportado.");
  return { tabla, llave: rows[0].llave, columnas };
}

const id = (n: string) => sql.id(n);
const condicion = (llave: string[], valores: Record<string, unknown>) =>
  sql.join(llave.map((k) => sql`${id(k)}::text = ${String(valores[k])}`), sql` and `);

export async function leerRegistro(tx: Tx, tabla: string, clave: Record<string, unknown>) {
  const t = await tablaCorregible(tx, tabla);
  for (const k of t.llave) if (clave[k] === undefined || clave[k] === null) throw new ErrorUsuario("Falta la llave del registro.");
  const { rows } = await sql<{ fila: Record<string, unknown> }>`select to_jsonb(r) - 'contenido' as fila from ${id(tabla)} r where ${condicion(t.llave, clave)}`.execute(tx);
  return { ...t, fila: rows[0]?.fila ?? null };
}

/** Texto del formulario → valor SQL con su tipo. Vacío = null. Arreglos y JSON se escriben como JSON. */
function valorSql(texto: string, tipo: string) {
  const t = texto.trim();
  if (t === "") return sql`null`;
  if (tipo.endsWith("[]")) return sql`(select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(${t}::jsonb) x)::${sql.raw(tipo)}`;
  return sql`${t}::${sql.raw(tipo)}`;
}

export async function corregirRegistro(tx: Tx, tabla: string, clave: Record<string, unknown>, cambios: Record<string, string>, motivo: string) {
  const t = await tablaCorregible(tx, tabla);
  const editables = new Map(t.columnas.filter((c) => !c.generada && !c.esLlave && c.tipo !== "bytea").map((c) => [c.nombre, c]));
  const sets = Object.entries(cambios).filter(([k]) => editables.has(k));
  if (sets.length === 0) throw new ErrorUsuario("No cambió ningún dato.");
  await sql`select set_config('app.motivo', ${motivo}, true)`.execute(tx);
  const r = await sql`update ${id(tabla)} set ${sql.join(sets.map(([k, v]) => sql`${id(k)} = ${valorSql(v, editables.get(k)!.tipo)}`), sql`, `)} where ${condicion(t.llave, clave)}`.execute(tx);
  if (!r.numAffectedRows) throw new ErrorUsuario("No se encontró el registro o no tiene permiso para cambiarlo.");
}
