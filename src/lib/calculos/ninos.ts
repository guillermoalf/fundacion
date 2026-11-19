/**
 * Niños: edad y resumen de asistencia. Fechas como "YYYY-MM-DD" (hora de Costa Rica).
 */

/** Edad cumplida en años y meses a una fecha. null si falta la fecha de nacimiento. */
export function edad(nacimiento: string | null, al: string): { anios: number; meses: number } | null {
  if (!nacimiento) return null;
  const [ay, am, ad] = nacimiento.split("-").map(Number);
  const [by, bm, bd] = al.split("-").map(Number);
  let meses = (by - ay) * 12 + (bm - am) - (bd < ad ? 1 : 0);
  if (meses < 0) meses = 0;
  return { anios: Math.floor(meses / 12), meses: meses % 12 };
}

/** "3 años y 2 meses", "11 meses", "1 año". */
export function textoEdad(e: { anios: number; meses: number } | null): string | null {
  if (!e) return null;
  const a = e.anios ? `${e.anios} ${e.anios === 1 ? "año" : "años"}` : "";
  const m = e.meses ? `${e.meses} ${e.meses === 1 ? "mes" : "meses"}` : "";
  return [a, m].filter(Boolean).join(" y ") || "0 meses";
}

export type EstadoAsistencia = "presente" | "ausente" | "justificada";

/**
 * Resumen de un niño en un período: días con lista pasada, presentes, ausencias y porcentaje
 * (presentes / días con lista; las justificadas cuentan como días con lista pero no como presentes).
 * El porcentaje es null si no hay ningún día con lista.
 */
export function resumenAsistencia(estados: EstadoAsistencia[]) {
  const presentes = estados.filter((e) => e === "presente").length;
  const ausentes = estados.filter((e) => e === "ausente").length;
  const justificadas = estados.filter((e) => e === "justificada").length;
  const dias = estados.length;
  return { dias, presentes, ausentes, justificadas, porcentaje: dias ? Math.round((presentes / dias) * 1000) / 10 : null };
}

/** Ausencias sin justificar seguidas al final (de la más reciente hacia atrás); fechas en cualquier orden. */
export function ausenciasSeguidas(registros: { fecha: string; estado: EstadoAsistencia }[]): number {
  let n = 0;
  for (const r of [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha))) {
    if (r.estado === "ausente") n++;
    else break;
  }
  return n;
}
