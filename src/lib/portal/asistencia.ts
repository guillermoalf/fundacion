/**
 * Resumen de asistencia de un mes por persona: tardías y horas trabajadas.
 * Los cálculos son los de src/lib/calculos/planilla.ts; aquí solo se arman los datos y se pasan a hora de Costa Rica.
 */
import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { detectarTardias, horasTrabajadas, type Tardia } from "@/lib/calculos/planilla";
import { partesCR, rangoMes, relojCR } from "./formato";

export type ResumenAsistencia = {
  empleadoId: string;
  nombre: string;
  tardias: Tardia[];
  minutosTarde: number;
  horas: number;
  diasConMarca: number;
  diasInconsistentes: string[];
};

export async function resumenAsistenciaMes(tx: Tx, mes: string, empleadoId?: string): Promise<{ tolerancia: number | null; filas: ResumenAsistencia[] }> {
  const { desde, hasta } = rangoMes(mes);
  const [personas, marcas, horarios, tol] = await Promise.all([
    tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).$if(!!empleadoId, (q) => q.where("id", "=", empleadoId!)).orderBy("nombre").execute(),
    tx.selectFrom("marcas").select(["empleado_id", "tipo", "marcado_en"])
      .where(sql<boolean>`(marcado_en at time zone 'America/Costa_Rica')::date between ${desde}::date and ${hasta}::date`).orderBy("marcado_en").execute(),
    tx.selectFrom("horarios").select(["empleado_id", "dia_semana", "hora_entrada", "vigente_desde", "vigente_hasta"])
      .where("vigente_desde", "<=", hasta).where((eb) => eb.or([eb("vigente_hasta", "is", null), eb("vigente_hasta", ">=", desde)])).execute(),
    sql<{ v: string | null }>`select parametro('tardia_tolerancia_min', ${hasta}::date) as v`.execute(tx),
  ]);
  const tolerancia = tol.rows[0].v === null ? null : Number(tol.rows[0].v);

  const filas = personas.map((p) => {
    const suyas = marcas.filter((m) => m.empleado_id === p.id);
    const porDia = new Map<string, typeof suyas>();
    for (const m of suyas) {
      const d = partesCR(m.marcado_en).ymd;
      porDia.set(d, [...(porDia.get(d) ?? []), m]);
    }
    const tardias: Tardia[] = [];
    let horas = 0;
    const inconsistentes: string[] = [];
    for (const [dia, ms] of porDia) {
      const marcasCR = ms.map((m) => ({ tipo: m.tipo, marcadoEn: relojCR(m.marcado_en) }));
      // El horario que regía ese día (puede cambiar a mitad de mes).
      const horario = horarios
        .filter((h) => h.empleado_id === p.id && h.vigente_desde <= dia && (h.vigente_hasta === null || h.vigente_hasta >= dia))
        .map((h) => ({ diaSemana: h.dia_semana, horaEntrada: h.hora_entrada.slice(0, 5) }));
      if (tolerancia !== null) tardias.push(...detectarTardias(marcasCR, horario, tolerancia));
      const h = horasTrabajadas(marcasCR);
      horas += h.horas;
      if (h.inconsistente) inconsistentes.push(dia);
    }
    return {
      empleadoId: p.id, nombre: p.nombre, tardias: tardias.sort((a, b) => a.fecha.localeCompare(b.fecha)),
      minutosTarde: tardias.reduce((s, t) => s + t.minutosTarde, 0), horas: Math.round(horas * 100) / 100,
      diasConMarca: porDia.size, diasInconsistentes: inconsistentes.sort(),
    };
  });
  return { tolerancia, filas };
}
