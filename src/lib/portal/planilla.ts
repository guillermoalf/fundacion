/**
 * Arma las líneas de una planilla mensual o de aguinaldo con los cálculos de src/lib/calculos/planilla.ts.
 * Los parámetros legales salen de la tabla `parametros` vigente al cierre del periodo.
 */
import { sql } from "kysely";
import type { Tx } from "@/lib/db";
import { calcularAguinaldo, calcularLineaPlanilla, diasHabiles, type EntradaLineaPlanilla } from "@/lib/calculos/planilla";
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

const maxF = (a: string, b: string) => (a > b ? a : b);
const minF = (a: string, b: string) => (a < b ? a : b);
const diasNaturales = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1);

export type DetalleLinea = { entrada: EntradaLineaPlanilla; notas: string[]; tardias: number };

export async function lineasMensuales(tx: Tx, mes: string) {
  const { desde, hasta } = rangoMes(mes);
  const parametros = await parametrosPlanilla(tx, hasta);
  const [empleados, ausencias, asistencia] = await Promise.all([
    tx.selectFrom("empleados").select(["id", "nombre", "salario_mensual", "fuente_id", "fecha_ingreso", "fecha_salida"])
      .where("fecha_ingreso", "<=", hasta).where((eb) => eb.or([eb("fecha_salida", "is", null), eb("fecha_salida", ">=", desde)])).orderBy("nombre").execute(),
    tx.selectFrom("ausencias").select(["empleado_id", "tipo", "desde", "hasta", "dias_habiles"]).where("desde", "<=", hasta).where("hasta", ">=", desde).execute(),
    resumenAsistenciaMes(tx, mes),
  ]);
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
    const entrada: EntradaLineaPlanilla = {
      salarioMensual: Number(e.salario_mensual), diasSinGoce, diasIncapacidadCCSS: suma(["incapacidad_ccss"]), diasIncapacidadCCSSPatrono: diasCCSSPatrono,
      diasIncapacidadINS: suma(["incapacidad_ins"]), diasLicenciaMaternidad: suma(["licencia_maternidad"]), parametros,
    };
    return { empleado_id: e.id, nombre: e.nombre, fuente_id: e.fuente_id, entrada, calculo: calcularLineaPlanilla(entrada), detalle: { entrada, notas, tardias } satisfies DetalleLinea };
  });
}

export const filaLinea = (planillaId: string, l: { empleado_id: string; fuente_id: number | null; entrada: EntradaLineaPlanilla; calculo: ReturnType<typeof calcularLineaPlanilla>; detalle: DetalleLinea }) => ({
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
});

/** Aguinaldo del año: suma de salarios brutos de las planillas mensuales aprobadas o pagadas de dic (año-1) a nov ÷ divisor. */
export async function lineasAguinaldo(tx: Tx, anio: number) {
  const divisor = (await parametrosPlanilla(tx, `${anio}-11-30`)).aguinaldoDivisor;
  const filas = await tx.selectFrom("planilla_lineas as l").innerJoin("planillas as p", "p.id", "l.planilla_id").innerJoin("empleados as e", "e.id", "l.empleado_id")
    .select(["l.empleado_id", "e.nombre", "e.fuente_id", "p.periodo_inicio", "l.salario_bruto"])
    .where("p.tipo", "=", "mensual").where("p.estado", "in", ["aprobada", "pagada"])
    .where("p.periodo_inicio", ">=", `${anio - 1}-12-01`).where("p.periodo_inicio", "<=", `${anio}-11-30`).execute();
  const porEmpleado = new Map<string, { nombre: string; fuente_id: number | null; salarios: { mes: string; monto: number }[] }>();
  for (const f of filas) {
    const x = porEmpleado.get(f.empleado_id) ?? { nombre: f.nombre, fuente_id: f.fuente_id, salarios: [] };
    x.salarios.push({ mes: f.periodo_inicio, monto: Number(f.salario_bruto) });
    porEmpleado.set(f.empleado_id, x);
  }
  return [...porEmpleado].map(([id, x]) => ({ empleado_id: id, nombre: x.nombre, fuente_id: x.fuente_id, meses: x.salarios.length, aguinaldo: calcularAguinaldo(x.salarios, anio, divisor) }));
}
