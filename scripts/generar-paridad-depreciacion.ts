/**
 * Genera src/lib/calculos/paridad-sql.json: casos sintéticos con el resultado de la función SQL
 * depreciacion_acumulada. El test paridad.test.ts verifica que calcularDepreciacion (TS) dé lo mismo,
 * sin necesitar una base de datos en CI. Regenerar si cambia la fórmula en la migración.
 * Uso (con la base local corriendo y migrada): npx vite-node scripts/generar-paridad-depreciacion.ts
 */
import { existsSync, writeFileSync } from "node:fs";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

let semilla = 42;
const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const tasas: [number, number][] = [[5, 20], [10, 10], [20, 5], [25, 4], [7, 15], [15, 7], [50, 2]];

const casos = Array.from({ length: 2000 }, () => {
  const [tasaAnual, aniosVida] = tasas[Math.floor(rnd() * tasas.length)];
  const costo = Math.round(rnd() * 3_000_000 * 100) / 100;
  const valorResidual = rnd() < 0.3 ? Math.round(costo * rnd() * 0.2 * 100) / 100 : 0;
  const adq = new Date(Date.UTC(2005 + Math.floor(rnd() * 21), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)));
  const corte = new Date(adq.getTime() + Math.floor(rnd() * 25 * 365) * 86_400_000);
  return {
    costo, valorResidual, tasaAnual, aniosVida,
    metodo: rnd() < 0.5 ? "linea_recta" : "suma_digitos",
    fechaAdquisicion: adq.toISOString().slice(0, 10),
    corte: corte.toISOString().slice(0, 10),
  };
});

const valores = casos
  .map((c, i) => `(${i},${c.costo},${c.valorResidual},${c.tasaAnual},${c.aniosVida},'${c.metodo}'::metodo_depreciacion,'${c.fechaAdquisicion}'::date,'${c.corte}'::date)`)
  .join(",");
const sql = `select depreciacion_acumulada(c,r,t,a,m,ad,co) as d from (values ${valores}) v(i,c,r,t,a,m,ad,co) order by i`;
const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
await cliente.connect();
const salida = (await cliente.query<{ d: string | null }>(sql)).rows.map((r) => r.d);
await cliente.end();

const conSql = casos.map((c, i) => ({ ...c, sql: Number(salida[i]) }));
writeFileSync(new URL("../src/lib/calculos/paridad-sql.json", import.meta.url), JSON.stringify(conSql) + "\n");
console.log(`${conSql.length} casos guardados en src/lib/calculos/paridad-sql.json`);
