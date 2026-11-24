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

// ---------------------------------------------------------------- Estudio socioeconómico (PANI)
export type EstadoEstudio = "falta" | "vencido" | "urgente" | "aviso" | "vigente";
export type ReglasEstudio = { vigenciaAnios: number; avisoDias: number; urgenteDias: number };

/** Suma años a una fecha "YYYY-MM-DD" (el 29 de febrero pasa al 28 si el año no es bisiesto). */
export function sumarAnios(fecha: string, anios: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y + anios, m, 0)).getUTCDate();
  return `${y + anios}-${String(m).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}
const dias = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);

/**
 * Estado del estudio socioeconómico a una fecha. Vence en la fecha que trae el estudio (`venceEl`); si no la trae,
 * `vigenciaAnios` después de elaborado.
 * «urgente» cuando faltan `urgenteDias` o menos; «aviso» cuando faltan `avisoDias` o menos; «vencido» desde el día que vence.
 */
export function estadoEstudio(elaboracion: string | null, hoy: string, r: ReglasEstudio, venceEl?: string | null): { estado: EstadoEstudio; vence: string | null; diasRestantes: number | null } {
  if (!elaboracion) return { estado: "falta", vence: null, diasRestantes: null };
  const vence = venceEl ?? sumarAnios(elaboracion, r.vigenciaAnios);
  const restantes = dias(hoy, vence);
  const estado: EstadoEstudio = restantes <= 0 ? "vencido" : restantes <= r.urgenteDias ? "urgente" : restantes <= r.avisoDias ? "aviso" : "vigente";
  return { estado, vence, diasRestantes: restantes };
}
