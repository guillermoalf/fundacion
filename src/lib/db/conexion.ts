/**
 * Conexión a Postgres (Neon en producción, Docker en local) con el usuario dueño de la base.
 *
 * NO usar fuera de src/lib/db/index.ts y src/lib/auth.ts (ESLint lo bloquea): esta conexión se salta
 * el RLS y la bitácora no sabría quién escribió. El portal consulta siempre con `conUsuario()`.
 */
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "./tipos";

// Las fechas (date) llegan como texto "2026-11-16": un Date de JS las correría por la zona horaria.
// numeric y bigint ya llegan como texto (montos exactos, sin errores de redondeo).
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

// Un solo pool por proceso (en desarrollo Next recarga los módulos y abriría conexiones de más).
const global_ = globalThis as unknown as { poolFundacion?: pg.Pool };

export const pool =
  global_.poolFundacion ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") global_.poolFundacion = pool;

export const dbDueno = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
