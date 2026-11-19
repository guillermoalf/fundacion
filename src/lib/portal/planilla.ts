/**
 * Arma las líneas de una planilla mensual o de aguinaldo con los cálculos de src/lib/calculos/planilla.ts.
 * Los parámetros legales salen de la tabla `parametros` vigente al cierre del periodo.
 */
import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { calcularAguinaldo, calcularLineaPlanilla, diasHabiles, repartirLinea, repartoSalario, type EntradaLineaPlanilla } from "@/lib/calculos/planilla";
import { ErrorUsuario } from "./acciones";
import { rangoMes } from "./formato";
import { resumenAsistenciaMes } from "./asistencia";

const CLAVES = {
  ccssObreroPct: "ccss_obrero_pct",
  ccssPatronalPct: "ccss_patronal_pct",
  incapacidadPatronoPctDias1a3: "incapacidad_ccss_patrono_pct_dias_1_3",
  licenciaMaternidadPatronoPct: "licencia_maternidad_patrono_pct",
  aguinaldoDivisor: "aguinaldo_divisor",
  vacacionesDiasAnuales: "vacaciones_dias_habiles_anuales",
} as const;

export async function parametrosPlanilla(tx: Tx, fecha: string): Promise<EntradaLineaPlanilla["parametros"]> {
  const valores = await Promise.all(
    Object.entries(CLAVES).map(async ([k, clave]) => {
      const v = (await sql<{ v: string | null }>`select parametro(${clave}, ${fecha}::date) as v`.execute(tx)).rows[0].v;
      if (v === null) throw new ErrorUsuario(`Falta el parámetro «${clave}» vigente al ${fecha}. Agréguelo antes de generar la planilla.`);
      return [k, Number(v)] as const;
    }),
  );
  return Object.fromEntries(valores) as EntradaLineaPlanilla["parametros"];
}

/** Tramos de renta vigentes en una fecha, o null si no hay ninguno cargado. */
export async function tramosVigentes(tx: Tx, fecha: string) {
  const { rows } = await sql<{ desde: string; hasta: string | null; tasa: string }>`select * from tramos_renta_vigentes(${fecha}::date)`.execute(tx);
  return rows.length ? rows.map((t) => ({ desde: Number(t.desde), hasta: t.hasta === null ? null : Number(t.hasta), tasa: Number(t.tasa) })) : null;
}

const maxF = (a: string, b: string) => (a > b ? a : b);
const minF = (a: string, b: string) => (a < b ? a : b);
const diasNaturales = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1);

export type DetalleLinea = { entrada: EntradaLineaPlanilla; notas: string[]; tardias: number };
/** Cómo se reparte una línea entre fondos (se guarda en planilla_lineas.reparto_fuentes). */
export type RepartoLinea = { fuente_id: number; proporcion: number; monto_base: number }[];

/** Fondos vigentes de cada persona a una fecha (el reparto más reciente que ya rige). */
async function aportesVigentes(tx: Tx, fecha: string) {
  const filas = await tx.selectFrom("salario_aportes").select(["empleado_id", "vigente_desde", "fuente_id", "monto"]).where("vigente_desde", "<=", fecha)
    .orderBy("vigente_desde", "desc").execute();
  const por = new Map<string, { fuenteId: number; monto: number | null }[]>();
  const fechaDe = new Map<string, string>();
  for (const f of filas) {
    if (!fechaDe.has(f.empleado_id)) fechaDe.set(f.empleado_id, f.vigente_desde);
    if (fechaDe.get(f.empleado_id) !== f.vigente_desde) continue;
    por.set(f.empleado_id, [...(por.get(f.empleado_id) ?? []), { fuenteId: f.fuente_id, monto: f.monto === null ? null : Number(f.monto) }]);
  }
  return por;
}

/** Reparto de una persona: el de sus fondos, o todo a su fuente principal. */
function repartoDe(salario: number, aportes: { fuenteId: number; monto: number | null }[] | undefined, fuentePrincipal: number | null, notas: string[]): RepartoLinea | null {
  if (aportes?.length) {
    const r = repartoSalario(salario, aportes);
    if (r.ok) return r.reparto.map((x) => ({ fuente_id: x.fuenteId, proporcion: x.proporcion, monto_base: x.monto }));
    notas.push(`El reparto entre fondos no cuadra con el salario (${r.error}) — se cargó todo a la fuente principal. Revíselo en Personal.`);
  }
  return fuentePrincipal ? [{ fuente_id: fuentePrincipal, proporcion: 1, monto_base: salario }] : null;
}

export async function lineasMensuales(tx: Tx, mes: string) {
  const { desde, hasta } = rangoMes(mes);
  const parametros = await parametrosPlanilla(tx, hasta);
  const tramos = await tramosVigentes(tx, hasta);
  const aportes = await aportesVigentes(tx, hasta);
  const [empleados, ausencias, asistencia] = await Promise.all([
    tx.selectFrom("empleados").select(["id", "nombre", "fuente_id", "fecha_ingreso", "fecha_salida", sql<string | null>`salario_vigente(id, ${hasta}::date)`.as("salario_mensual")])
      .where("fecha_ingreso", "<=", hasta).where((eb) => eb.or([eb("fecha_salida", "is", null), eb("fecha_salida", ">=", desde)])).orderBy("nombre").execute(),
    tx.selectFrom("ausencias").select(["empleado_id", "tipo", "desde", "hasta", "dias_habiles"]).where("desde", "<=", hasta).where("hasta", ">=", desde).execute(),
    resumenAsistenciaMes(tx, mes),
  ]);
  const sinSalario = empleados.filter((e) => e.salario_mensual === null).map((e) => e.nombre);
  if (sinSalario.length) throw new ErrorUsuario(`Falta el salario de: ${sinSalario.join(", ")}. Regístrelo en Personal antes de generar la planilla.`);
  return empleados.map((e) => {
    const notas: string[] = [];
    // Días de la ausencia dentro del mes: si cae entera en el mes se usa lo registrado (puede tener correcciones).
    const enMes = (a: (typeof ausencias)[number]) =>
      a.desde >= desde && a.hasta <= hasta ? Number(a.dias_habiles) : diasHabiles(maxF(a.desde, desde), minF(a.hasta, hasta));
    const suyas = ausencias.filter((a) => a.empleado_id === e.id);
    const suma = (tipos: string[]) => suyas.filter((a) => tipos.includes(a.tipo)).reduce((s, a) => s + enMes(a), 0);
    let diasSinGoce = suma(["permiso_sin_goce", "ausencia_injustificada"]);
    // Ingresó o salió a mitad de mes: los días fuera de la relación laboral no se pagan.
    const fuera = diasNaturales(desde, hasta) - diasNaturales(maxF(e.fecha_ingreso, desde), minF(e.fecha_salida ?? hasta, hasta));
    if (fuera > 0) {
      diasSinGoce += fuera;
      notas.push(`${fuera} días del mes fuera de la relación laboral (ingreso o salida).`);
    }
    // Días 1–3 de cada incapacidad CCSS que empieza en el mes (los paga en parte el patrono).
    const diasCCSSPatrono = suyas.filter((a) => a.tipo === "incapacidad_ccss" && a.desde >= desde).reduce((s, a) => s + Math.min(3, enMes(a)), 0);
    const tardias = asistencia.filas.find((f) => f.empleadoId === e.id)?.tardias.length ?? 0;
    if (tardias) notas.push(`${tardias} ${tardias === 1 ? "llegada tardía" : "llegadas tardías"} en el mes: el rebajo depende del reglamento interno, anótelo si corresponde.`);
    if (!e.fuente_id) notas.push("Falta la fuente que paga su salario.");
    if (!tramos) notas.push("Falta cargar los tramos del impuesto de renta: la renta quedó en ₡0. Cárguelos en Parámetros o digítela abajo.");
    const entrada: EntradaLineaPlanilla = {
      salarioMensual: Number(e.salario_mensual), diasSinGoce, diasIncapacidadCCSS: suma(["incapacidad_ccss"]), diasIncapacidadCCSSPatrono: diasCCSSPatrono,
      diasIncapacidadINS: suma(["incapacidad_ins"]), diasLicenciaMaternidad: suma(["licencia_maternidad"]), parametros, tramosRenta: tramos,
    };
    const reparto = repartoDe(Number(e.salario_mensual), aportes.get(e.id), e.fuente_id, notas);
    if (reparto && reparto.length > 1) notas.push(`Se paga entre ${reparto.length} fondos.`);
    return { empleado_id: e.id, nombre: e.nombre, fuente_id: e.fuente_id, reparto, entrada, calculo: calcularLineaPlanilla(entrada), detalle: { entrada, notas, tardias } satisfies DetalleLinea };
  });
}

export const filaLinea = (planillaId: string, l: { empleado_id: string; fuente_id: number | null; reparto?: RepartoLinea | null; entrada: EntradaLineaPlanilla; calculo: ReturnType<typeof calcularLineaPlanilla>; detalle: DetalleLinea }) => ({
  planilla_id: planillaId,
  empleado_id: l.empleado_id,
  fuente_id: l.fuente_id,
  salario_base: l.entrada.salarioMensual,
  dias_laborados: l.calculo.diasLaborados,
  horas_extra: 0,
  monto_horas_extra: l.calculo.montoHorasExtra,
  rebajo_ausencias: l.calculo.rebajoAusencias,
  rebajo_tardias: l.calculo.rebajoTardias,
  pago_incapacidad_patrono: l.calculo.pagoIncapacidadPatrono,
  salario_bruto: l.calculo.salarioBruto,
  ccss_obrero: l.calculo.ccssObrero,
  impuesto_renta: l.calculo.impuestoRenta,
  otras_deducciones: l.calculo.otrasDeducciones,
  salario_neto: l.calculo.salarioNeto,
  cargas_patronales: l.calculo.cargasPatronales,
  provision_aguinaldo: l.calculo.provisionAguinaldo,
  provision_vacaciones: l.calculo.provisionVacaciones,
  detalle: JSON.stringify(l.detalle),
  ...(l.reparto !== undefined ? { reparto_fuentes: l.reparto ? JSON.stringify(l.reparto) : null } : {}),
});

const CAMPOS_DINERO = ["salario_base", "monto_horas_extra", "rebajo_ausencias", "rebajo_tardias", "pago_incapacidad_patrono", "salario_bruto",
  "ccss_obrero", "impuesto_renta", "otras_deducciones", "salario_neto", "cargas_patronales", "provision_aguinaldo", "provision_vacaciones"] as const;
type LineaGuardada = Record<(typeof CAMPOS_DINERO)[number], string | number> & { fuente_id: number | null; reparto_fuentes: unknown; dias_laborados: string | number };

/**
 * Una línea de planilla partida por fondo (para los totales y el Excel por fuente). Si la línea no tiene reparto,
 * va entera a su fuente.
 */
type Dinero = Record<(typeof CAMPOS_DINERO)[number], number>;
export function lineaPorFondo<L extends LineaGuardada>(l: L): (Omit<L, (typeof CAMPOS_DINERO)[number]> & Dinero & { fuente_reparto: number | null; proporcion: number })[] {
  const reparto = (Array.isArray(l.reparto_fuentes) ? l.reparto_fuentes : null) as RepartoLinea | null;
  const montos = Object.fromEntries(CAMPOS_DINERO.map((k) => [k, Number(l[k] ?? 0)])) as Dinero;
  if (!reparto || reparto.length <= 1) return [{ ...l, ...montos, fuente_reparto: reparto?.[0]?.fuente_id ?? l.fuente_id, proporcion: 1 }];
  return repartirLinea(montos, reparto.map((r) => r.proporcion)).map((m, i) => ({ ...l, ...m, fuente_reparto: reparto[i].fuente_id, proporcion: reparto[i].proporcion }));
}

/** Aguinaldo del año: suma de salarios brutos de las planillas mensuales aprobadas o pagadas de dic (año-1) a nov ÷ divisor. */
export async function lineasAguinaldo(tx: Tx, anio: number) {
  const divisor = (await parametrosPlanilla(tx, `${anio}-11-30`)).aguinaldoDivisor;
  const filas = await tx.selectFrom("planilla_lineas as l").innerJoin("planillas as p", "p.id", "l.planilla_id").innerJoin("empleados as e", "e.id", "l.empleado_id")
    .select(["l.empleado_id", "e.nombre", "e.fuente_id", "p.periodo_inicio", "l.salario_bruto", "l.reparto_fuentes", "l.fuente_id as fuente_linea"])
    .where("p.tipo", "=", "mensual").where("p.estado", "in", ["aprobada", "pagada"])
    .where("p.periodo_inicio", ">=", `${anio - 1}-12-01`).where("p.periodo_inicio", "<=", `${anio}-11-30`).execute();
  const porEmpleado = new Map<string, { nombre: string; fuente_id: number | null; salarios: { mes: string; monto: number }[]; porFondo: Map<number, number> }>();
  for (const f of filas) {
    const x = porEmpleado.get(f.empleado_id) ?? { nombre: f.nombre, fuente_id: f.fuente_id, salarios: [], porFondo: new Map<number, number>() };
    x.salarios.push({ mes: f.periodo_inicio, monto: Number(f.salario_bruto) });
    // El aguinaldo se reparte entre fondos en la misma proporción en que pagaron los salarios del año.
    const rep = (Array.isArray(f.reparto_fuentes) ? f.reparto_fuentes : null) as RepartoLinea | null;
    for (const r of rep ?? (f.fuente_linea ? [{ fuente_id: f.fuente_linea, proporcion: 1, monto_base: 0 }] : [])) {
      x.porFondo.set(r.fuente_id, (x.porFondo.get(r.fuente_id) ?? 0) + Number(f.salario_bruto) * r.proporcion);
    }
    porEmpleado.set(f.empleado_id, x);
  }
  return [...porEmpleado].map(([id, x]) => {
    const total = [...x.porFondo.values()].reduce((s, v) => s + v, 0);
    const aguinaldo = calcularAguinaldo(x.salarios, anio, divisor);
    const reparto: RepartoLinea | null = total > 0 ? [...x.porFondo].map(([fuente_id, v]) => ({ fuente_id, proporcion: v / total, monto_base: Math.round((v / total) * aguinaldo * 100) / 100 })) : null;
    return { empleado_id: id, nombre: x.nombre, fuente_id: x.fuente_id, meses: x.salarios.length, aguinaldo, reparto };
  });
}
