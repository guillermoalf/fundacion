/**
 * Única puerta del portal a la base de datos.
 *
 * Cada llamada corre en una transacción que:
 *   1. cambia al rol app_portal (no es dueño de nada: el RLS siempre le aplica y no tiene DELETE), y
 *   2. guarda quién es el usuario en app.usuario_id, que leen el RLS (rol_actual) y la bitácora.
 * Si algo falla, la transacción se revierte completa.
 */
import { sql, type Transaction } from "kysely";
import { dbDueno } from "./conexion";
import type { DB } from "./tipos";

export type Tx = Transaction<DB>;
export type { DB } from "./tipos";

export function conUsuario<T>(usuarioId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return dbDueno.transaction().execute(async (tx) => {
    await sql`select set_config('role', 'app_portal', true), set_config('app.usuario_id', ${usuarioId}, true)`.execute(tx);
    return fn(tx);
  });
}
