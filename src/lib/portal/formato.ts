/**
 * Formato para mostrar en pantalla (es-CR) y fechas en hora de Costa Rica.
 * Un valor faltante (null) se devuelve como null: la pantalla muestra "Falta", nunca ₡0.
 */
const ZONA = "America/Costa_Rica";

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numero = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 3 });

const aNumero = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** ₡1 234 567,89 — null si falta el dato. */
export function colones(v: number | string | null | undefined): string | null {
  const n = aNumero(v);
  return n === null ? null : crc.format(n);
}

/** 1 234,5 — null si falta el dato. */
export function cantidad(v: number | string | null | undefined): string | null {
  const n = aNumero(v);
  return n === null ? null : numero.format(n);
}

/** "2026-11-16" → "16/11/2026". */
export function fecha(v: string | null | undefined): string | null {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Instante (timestamptz) → "16/11/2026 14:05" en hora de Costa Rica. */
export function fechaHora(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

/** Partes de la fecha y hora de Costa Rica para un instante. */
export function partesCR(d: Date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  const hora = p.hour === "24" ? "00" : p.hour;
  return { anio: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(hora), minuto: Number(p.minute), ymd: `${p.year}-${p.month}-${p.day}`, hhmm: `${hora}:${p.minute}` };
}

/** Fecha de hoy en Costa Rica, "YYYY-MM-DD". */
export const hoyCR = () => partesCR().ymd;

/**
 * Convierte un instante a un Date "de pared" con la hora de Costa Rica en la zona del servidor.
 * Sirve para los cálculos de src/lib/calculos que leen getHours()/getDate() (el servidor de Vercel corre en UTC).
 */
export function relojCR(d: Date): Date {
  const p = partesCR(d);
  return new Date(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
}

/** "YYYY-MM-DDTHH:mm" escrito en hora de Costa Rica → instante ISO (Costa Rica es siempre UTC−6). */
export function instanteDesdeCR(local: string): string {
  return new Date(`${local.length === 16 ? local + ":00" : local}-06:00`).toISOString();
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (mes: number) => MESES[mes - 1];
/** "2026-11" → "noviembre 2026" */
export const mesLargo = (ym: string) => `${nombreMes(Number(ym.slice(5, 7)))} ${ym.slice(0, 4)}`;

/** Primer y último día de un mes "YYYY-MM". */
export function rangoMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${ym}-01`, hasta: `${ym}-${String(ultimo).padStart(2, "0")}` };
}
