/**
 * Cálculos laborales — Costa Rica.
 * Las tasas NO están quemadas: vienen de la tabla `parametros` (con vigencia) y se pasan como argumento.
 * Base legal de referencia:
 *   - Aguinaldo: Ley 2412 — suma de salarios ordinarios y extraordinarios del 1 dic al 30 nov ÷ 12. Pagar antes del 20 de diciembre.
 *   - Vacaciones: Código de Trabajo art. 153 — 2 semanas por cada 50 semanas; proporcional si la relación termina antes.
 *   - Cargas sociales: CCSS (2026: patronal 26,83 %, obrera 10,83 %). El aguinaldo no lleva cargas.
 *   - Incapacidad CCSS: los primeros 3 días el patrono paga un % (parámetro); desde el 4.º día paga la CCSS.
 */
import { aFecha } from "./depreciacion";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------- Aguinaldo
export interface SalarioMensual {
  /** primer día del mes, "YYYY-MM-01" */
  mes: string;
  /** salario ordinario + extraordinario devengado ese mes (sin aguinaldo) */
  monto: number;
}

/** Periodo de aguinaldo del año `anio`: 1 dic (anio-1) → 30 nov (anio). */
export function periodoAguinaldo(anio: number) {
  return { desde: new Date(anio - 1, 11, 1), hasta: new Date(anio, 10, 30) };
}

export function calcularAguinaldo(salarios: SalarioMensual[], anio: number, divisor = 12): number {
  const { desde, hasta } = periodoAguinaldo(anio);
  const total = salarios
    .filter((s) => {
      const f = aFecha(s.mes);
      return f >= desde && f <= hasta;
    })
    .reduce((acc, s) => acc + s.monto, 0);
  return r2(total / divisor);
}

// ---------------------------------------------------------------- Vacaciones
export interface SaldoVacaciones {
  diasGanados: number;
  diasTomados: number;
  saldo: number;
}

/**
 * Días de vacaciones acumulados a una fecha.
 * Acumulación proporcional: díasAnuales / 12 por cada mes completo laborado
 * (equivale a 1 día por mes cuando son 12 días/año; 0,83 cuando son 10).
 * Los meses en licencia sin goce no generan vacaciones: pasarlos en `mesesSinGoce`.
 */
export function calcularVacaciones(params: {
  fechaIngreso: Date | string;
  corte: Date | string;
  diasHabilesAnuales: number;
  diasTomados: number;
  mesesSinGoce?: number;
}): SaldoVacaciones {
  const i = aFecha(params.fechaIngreso);
  const c = aFecha(params.corte);
  let meses = (c.getFullYear() - i.getFullYear()) * 12 + (c.getMonth() - i.getMonth());
  if (c.getDate() < i.getDate()) meses -= 1; // mes en curso aún no completo
  meses = Math.max(0, meses - (params.mesesSinGoce ?? 0));
  const ganados = r2((params.diasHabilesAnuales / 12) * meses);
  return { diasGanados: ganados, diasTomados: params.diasTomados, saldo: r2(ganados - params.diasTomados) };
}

// ---------------------------------------------------------------- Cargas sociales
export function calcularCargas(salarioBruto: number, tasas: { obreroPct: number; patronalPct: number }) {
  const obrero = r2((salarioBruto * tasas.obreroPct) / 100);
  const patronal = r2((salarioBruto * tasas.patronalPct) / 100);
  return { ccssObrero: obrero, cargasPatronales: patronal, costoTotalPatrono: r2(salarioBruto + patronal) };
}

// ---------------------------------------------------------------- Salario diario y rebajos
/** Salario diario para rebajos y pagos parciales (mensual ÷ 30, práctica usual en CR). */
export const salarioDiario = (salarioMensual: number) => salarioMensual / 30;

/** Monto que paga el patrono por una incapacidad CCSS (solo días 1–3). */
export function pagoPatronoIncapacidadCCSS(salarioMensual: number, diasIncapacidad: number, pctPatronoDias1a3: number) {
  const dias = Math.min(3, Math.max(0, diasIncapacidad));
  return r2(salarioDiario(salarioMensual) * dias * (pctPatronoDias1a3 / 100));
}

// ---------------------------------------------------------------- Tardías
export interface Marca {
  tipo: "entrada" | "salida";
  marcadoEn: Date;
}
export interface HorarioDia {
  diaSemana: number; // 1 = lunes … 7 = domingo
  horaEntrada: string; // "07:00"
}

export interface Tardia {
  fecha: string;
  horaEsperada: string;
  horaMarcada: string;
  minutosTarde: number;
}

const diaSemanaISO = (d: Date) => ((d.getDay() + 6) % 7) + 1;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Detecta llegadas tardías comparando la PRIMERA entrada de cada día contra el horario. */
export function detectarTardias(marcas: Marca[], horario: HorarioDia[], toleranciaMin: number): Tardia[] {
  const primeras = new Map<string, Date>();
  for (const m of marcas) {
    if (m.tipo !== "entrada") continue;
    const k = ymd(m.marcadoEn);
    const prev = primeras.get(k);
    if (!prev || m.marcadoEn < prev) primeras.set(k, m.marcadoEn);
  }
  const out: Tardia[] = [];
  for (const [fecha, entrada] of [...primeras.entries()].sort()) {
    const h = horario.find((x) => x.diaSemana === diaSemanaISO(entrada));
    if (!h) continue;
    const [hh, mm] = h.horaEntrada.split(":").map(Number);
    const esperada = new Date(entrada.getFullYear(), entrada.getMonth(), entrada.getDate(), hh, mm);
    const minutos = Math.floor((entrada.getTime() - esperada.getTime()) / 60000);
    if (minutos > toleranciaMin) out.push({ fecha, horaEsperada: h.horaEntrada, horaMarcada: hhmm(entrada), minutosTarde: minutos });
  }
  return out;
}

/** Horas trabajadas en un día a partir de pares entrada/salida. Devuelve también si quedó una marca sin pareja. */
export function horasTrabajadas(marcasDelDia: Marca[]) {
  const ord = [...marcasDelDia].sort((a, b) => a.marcadoEn.getTime() - b.marcadoEn.getTime());
  let ms = 0;
  let abierta: Date | null = null;
  let inconsistente = false;
  for (const m of ord) {
    if (m.tipo === "entrada") {
      if (abierta) inconsistente = true;
      abierta = m.marcadoEn;
    } else if (abierta) {
      ms += m.marcadoEn.getTime() - abierta.getTime();
      abierta = null;
    } else inconsistente = true;
  }
  if (abierta) inconsistente = true;
  return { horas: r2(ms / 3_600_000), inconsistente };
}

// ---------------------------------------------------------------- Días hábiles
/**
 * Días hábiles entre dos fechas (ambas incluidas): lunes a viernes, o lunes a sábado si la jornada incluye
 * sábado. Los feriados se restan aparte (se pasan en `feriados`, "YYYY-MM-DD").
 */
export function diasHabiles(desde: Date | string, hasta: Date | string, opts: { incluyeSabado?: boolean; feriados?: string[] } = {}): number {
  const ini = aFecha(desde);
  const fin = aFecha(hasta);
  if (fin < ini) return 0;
  const feriados = new Set(opts.feriados ?? []);
  let n = 0;
  for (const d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    const dia = diaSemanaISO(d);
    if (dia === 7 || (dia === 6 && !opts.incluyeSabado)) continue;
    if (feriados.has(ymd(d))) continue;
    n++;
  }
  return n;
}
