import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { rangoMes } from "@/lib/portal/formato";
import type { EstadoAsistencia } from "@/lib/calculos/ninos";
import type { FilaAsistenciaNino } from "@/lib/export/asistenciaNinos";
import { alfa } from "@/lib/db/orden";

/**
 * Asistencia de un mes "YYYY-MM": los niños que estuvieron en la fundación ese mes (aunque luego se retiraran)
 * y los días en que se pasó lista. Filtra por fuente (código) y por aula si se piden.
 */
/** Subsidio del niño para mostrar y filtrar: el código de la fuente (PANI, IMAS…) o «Privado». Necesita los alias `n` y `f`. */
export const PRIVADO = "Privado";
/** Únicas fuentes que subsidian niños (además de «Privado»). */
export const SUBSIDIOS_NINOS = ["PANI", "IMAS"];
export const subsidioNino = sql<string | null>`case when n.privado then ${PRIVADO} else f.codigo end`.as("fuente");

export async function asistenciaDelMes(tx: Tx, mes: string, filtro: { fuente?: string | null; aula?: number | null } = {}) {
  const { desde, hasta } = rangoMes(mes);
  let q = tx.selectFrom("ninos as n").leftJoin("ubicaciones as u", "u.id", "n.aula_id").leftJoin("fuentes_financiamiento as f", "f.id", "n.fuente_id")
    .select(["n.id", "n.nombre", "n.apellidos", "n.identificacion", "n.fecha_nacimiento", "u.nombre as aula", subsidioNino])
    .where("n.fecha_ingreso", "<=", hasta)
    .where((eb) => eb.or([eb("n.estado", "=", "activo"), eb("n.fecha_retiro", ">=", desde)]));
  if (filtro.fuente === PRIVADO) q = q.where("n.privado", "=", true);
  else if (filtro.fuente) q = q.where("f.codigo", "=", filtro.fuente);
  if (filtro.aula) q = q.where("n.aula_id", "=", filtro.aula);
  const ninos = await q.orderBy(alfa("n.nombre")).orderBy(alfa("n.apellidos")).execute();
  const marcas = ninos.length
    ? await tx.selectFrom("asistencia_ninos").select(["nino_id", "fecha", "estado"]).where("fecha", ">=", desde).where("fecha", "<=", hasta)
      .where("nino_id", "in", ninos.map((n) => n.id)).execute()
    : [];
  const dias = [...new Set(marcas.map((m) => m.fecha))].sort();
  const porNino = new Map<string, Record<string, EstadoAsistencia>>();
  for (const m of marcas) porNino.set(m.nino_id, { ...(porNino.get(m.nino_id) ?? {}), [m.fecha]: m.estado as EstadoAsistencia });
  const filas: (FilaAsistenciaNino & { id: string })[] = ninos.map((n) => ({
    id: n.id, nombre: `${n.nombre} ${n.apellidos}`, identificacion: n.identificacion, fechaNacimiento: n.fecha_nacimiento, aula: n.aula, fuente: n.fuente,
    porDia: porNino.get(n.id) ?? {},
  }));
  return { dias, filas };
}
