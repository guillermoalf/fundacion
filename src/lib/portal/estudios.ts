import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { estadoEstudio, type EstadoEstudio, type ReglasEstudio } from "@/lib/calculos/ninos";

export type EstudioNino = {
  ninoId: string; nombre: string; aula: string | null;
  ultimo: { fecha: string; vence: string; trabajador: string | null; documento: string | null } | null;
  estado: EstadoEstudio; vence: string | null; diasRestantes: number | null;
};

/** Reglas vigentes (años de vigencia y días de aviso) desde Parámetros. null si falta alguna. */
export async function reglasEstudio(tx: Tx, fecha: string): Promise<ReglasEstudio | null> {
  const { rows } = await sql<{ v: string | null; a: string | null; u: string | null }>`select
    parametro('estudio_socioeconomico_vigencia_anios', ${fecha}::date) as v,
    parametro('estudio_socioeconomico_aviso_dias', ${fecha}::date) as a,
    parametro('estudio_socioeconomico_urgente_dias', ${fecha}::date) as u`.execute(tx);
  const r = rows[0];
  return r.v === null || r.a === null || r.u === null ? null : { vigenciaAnios: Number(r.v), avisoDias: Number(r.a), urgenteDias: Number(r.u) };
}

/**
 * Estado del estudio socioeconómico de cada niño PANI activo (el último estudio registrado).
 * Solo para quien ve las notas de los niños (dirección, coordinación, auditoría): a los demás el RLS no les muestra estudios.
 */
export async function estudiosPani(tx: Tx, hoy: string, soloNino?: string): Promise<{ reglas: ReglasEstudio | null; estudios: EstudioNino[] }> {
  const reglas = await reglasEstudio(tx, hoy);
  // Sin los parámetros no se puede calcular nada (los plazos nunca van en el código).
  if (!reglas) return { reglas: null, estudios: [] };
  let q = tx.selectFrom("ninos as n").innerJoin("fuentes_financiamiento as f", "f.id", "n.fuente_id").leftJoin("ubicaciones as u", "u.id", "n.aula_id")
    .select(["n.id", "n.nombre", "n.apellidos", "u.nombre as aula"]).where("f.codigo", "=", "PANI").where("n.estado", "=", "activo");
  if (soloNino) q = q.where("n.id", "=", soloNino);
  const ninos = await q.execute();
  const ultimos = ninos.length
    ? await tx.selectFrom("estudios_socioeconomicos").select(["nino_id", "fecha_elaboracion", "fecha_vencimiento", "trabajador_social", "documento_url"])
      .where("nino_id", "in", ninos.map((n) => n.id)).orderBy("fecha_elaboracion", "desc").orderBy("creado_en", "desc").execute()
    : [];
  const porNino = new Map<string, (typeof ultimos)[number]>();
  for (const e of ultimos) if (!porNino.has(e.nino_id)) porNino.set(e.nino_id, e);
  return {
    reglas,
    estudios: ninos.map((n) => {
      const e = porNino.get(n.id);
      return {
        ninoId: n.id, nombre: `${n.nombre} ${n.apellidos}`, aula: n.aula,
        ultimo: e ? { fecha: e.fecha_elaboracion, vence: e.fecha_vencimiento, trabajador: e.trabajador_social, documento: e.documento_url } : null,
        ...estadoEstudio(e?.fecha_elaboracion ?? null, hoy, reglas, e?.fecha_vencimiento),
      };
    }),
  };
}

/** Cuántos niños PANI hay en cada situación (para los avisos). */
export function resumenEstudios(estudios: EstudioNino[]) {
  const c = { falta: 0, vencido: 0, urgente: 0, aviso: 0, vigente: 0 } as Record<EstadoEstudio, number>;
  for (const e of estudios) c[e.estado]++;
  return c;
}
