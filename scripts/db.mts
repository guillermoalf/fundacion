/**
 * Comandos de la base de datos (Postgres local en Docker o Neon).
 *
 *   npm run db:migrar   aplica las migraciones pendientes (db/migrations) y, si la base está vacía,
 *                       carga los catálogos iniciales (db/seed.sql). Es lo que corre Vercel en cada deploy.
 *   npm run db:reset    SOLO LOCAL: borra la base, la crea de nuevo, migra y carga el seed.
 *   npm run db:test     corre los tests pgTAP de db/tests (cada archivo se revierte al terminar).
 *
 * Usa DATABASE_URL_UNPOOLED (conexión directa, la que necesitan las migraciones en Neon) y si no existe
 * DATABASE_URL. Toma los valores de .env.local; las variables del entorno tienen prioridad.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  // En Vercel, mientras no exista la base de Neon, el sitio público igual tiene que poder publicarse.
  if (process.env.VERCEL) {
    console.warn("⚠ Sin DATABASE_URL: no se aplicaron migraciones. El portal no funcionará hasta conectar Neon.");
    process.exit(0);
  }
  console.error("Falta DATABASE_URL (en .env.local o en el entorno).");
  process.exit(1);
}

// dbmate (lib/pq) no entiende channel_binding, que Neon agrega a sus cadenas de conexión.
const urlDbmate = (() => {
  const u = new URL(url);
  u.searchParams.delete("channel_binding");
  return u.toString();
})();

const dbmate = (...args: string[]) =>
  execFileSync("npx", ["dbmate", "--url", urlDbmate, "--migrations-dir", "db/migrations", "--no-dump-schema", ...args], {
    stdio: "inherit",
  });

async function conCliente<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    return await fn(cliente);
  } finally {
    await cliente.end();
  }
}

async function cargarSeedSiHaceFalta() {
  await conCliente(async (c) => {
    const { rows } = await c.query("select count(*)::int as n from fuentes_financiamiento");
    if (rows[0].n > 0) return;
    await c.query(readFileSync("db/seed.sql", "utf8"));
    console.log("Catálogos iniciales cargados (db/seed.sql).");
  });
}

async function migrar() {
  dbmate("up");
  await cargarSeedSiHaceFalta();
}

async function reset() {
  const { hostname } = new URL(url!);
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    console.error(`db:reset borra la base completa y solo se permite en local (la URL apunta a ${hostname}).`);
    process.exit(1);
  }
  dbmate("drop");
  dbmate("create");
  await migrar();
}

async function test() {
  const archivos = readdirSync("db/tests").filter((f) => f.endsWith(".sql")).sort();
  let fallos = 0;
  for (const archivo of archivos) {
    const salida = await conCliente(async (c) => {
      try {
        const resultados = await c.query(readFileSync(`db/tests/${archivo}`, "utf8"));
        return [resultados].flat().flatMap((r) => r.rows.map((fila) => String(Object.values(fila)[0])));
      } catch (e) {
        await c.query("rollback").catch(() => {});
        return [`not ok - el archivo se detuvo con un error: ${(e as Error).message}`];
      }
    });
    const lineas = salida.flatMap((l) => l.split("\n"));
    const malas = lineas.filter((l) => l.startsWith("not ok") || l.startsWith("# Looks like"));
    const buenas = lineas.filter((l) => l.startsWith("ok ")).length;
    if (malas.length) {
      fallos++;
      console.log(`✗ ${archivo}`);
      for (const l of lineas.filter((l) => l.startsWith("not ok") || l.startsWith("#"))) console.log(`    ${l}`);
    } else {
      console.log(`✓ ${archivo} (${buenas})`);
    }
  }
  if (fallos) process.exit(1);
}

const comandos: Record<string, () => Promise<void>> = { migrar, reset, test };
const comando = process.argv[2];
if (!comandos[comando]) {
  console.error("Uso: node scripts/db.mts migrar | reset | test");
  process.exit(1);
}
await comandos[comando]();
