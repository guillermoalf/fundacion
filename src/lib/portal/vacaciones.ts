import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { calcularVacaciones, type SaldoVacaciones } from "@/lib/calculos/planilla";

/**
 * Saldo de vacaciones de cada persona a una fecha. Si tiene saldo inicial (lo que traía antes del portal), se cuenta
 * desde esa fecha; si no, desde su ingreso. Tomados = vacaciones registradas desde esa fecha, también las aprobadas que todavía no llegan.
 * null si falta el parámetro de días por año. Respeta el RLS (cada quien ve lo que le corresponde).
 */
export async function saldosVacaciones(tx: Tx, corte: string, empleadoIds?: string[]): Promise<{ diasAnuales: number | null; saldos: Map<string, SaldoVacaciones> }> {
  const diasAnuales = (await sql<{ v: string | null }>`select parametro('vacaciones_dias_habiles_anuales', ${corte}::date) as v`.execute(tx)).rows[0].v;
  let q = tx.selectFrom("empleados as e").select(["e.id", "e.fecha_ingreso", "e.vacaciones_saldo_inicial", "e.vacaciones_saldo_al",
    sql<string>`(select coalesce(sum(a.dias_habiles), 0) from ausencias a where a.empleado_id = e.id and a.tipo = 'vacaciones'
      and a.desde >= coalesce(e.vacaciones_saldo_al, e.fecha_ingreso))`.as("tomados"),
    sql<number>`(select count(*)::int from ausencias a where a.empleado_id = e.id and a.tipo = 'permiso_sin_goce' and a.hasta - a.desde >= 29
      and a.desde >= coalesce(e.vacaciones_saldo_al, e.fecha_ingreso))`.as("meses_sin_goce")]);
  if (empleadoIds) q = q.where("e.id", "in", empleadoIds.length ? empleadoIds : ["00000000-0000-0000-0000-000000000000"]);
  const filas = await q.execute();
  const anuales = diasAnuales === null ? null : Number(diasAnuales);
  const saldos = new Map<string, SaldoVacaciones>();
  if (anuales !== null) {
    for (const f of filas) {
      saldos.set(f.id, calcularVacaciones({
        fechaIngreso: f.vacaciones_saldo_al ?? f.fecha_ingreso, corte, diasHabilesAnuales: anuales, diasTomados: Number(f.tomados),
        mesesSinGoce: f.meses_sin_goce, saldoInicial: f.vacaciones_saldo_inicial === null ? 0 : Number(f.vacaciones_saldo_inicial),
      }));
    }
  }
  return { diasAnuales: anuales, saldos };
}
