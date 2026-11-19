"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, numero, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { rangoMes } from "@/lib/portal/formato";
import { filaLinea, lineasAguinaldo, lineasMensuales, type DetalleLinea } from "@/lib/portal/planilla";
import { calcularLineaPlanilla } from "@/lib/calculos/planilla";

type R = Resultado | null;

export async function generarMensual(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const mes = textoObligatorio(f, "mes", "el mes");
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErrorUsuario("Elija el mes.");
    const { desde, hasta } = rangoMes(mes);
    const id = await consultar(async (tx) => {
      const ya = await tx.selectFrom("planillas").select("id").where("periodo_inicio", "=", desde).where("tipo", "=", "mensual").where("estado", "<>", "anulada").executeTakeFirst();
      if (ya) throw new ErrorUsuario("Ya existe una planilla de ese mes. Ábrala desde la lista (o anúlela para generarla de nuevo).");
      const lineas = await lineasMensuales(tx, mes);
      if (lineas.length === 0) throw new ErrorUsuario("No hay personal con relación laboral en ese mes.");
      const { id } = await tx.insertInto("planillas").values({ periodo_inicio: desde, periodo_fin: hasta, tipo: "mensual" })
        .onConflict((oc) => oc.columns(["periodo_inicio", "periodo_fin", "tipo"]).doNothing()).returning("id").executeTakeFirst()
        ?? (() => { throw new ErrorUsuario("Ese mes tuvo una planilla anulada; para rehacerla pida ayuda a soporte."); })();
      await tx.insertInto("planilla_lineas").values(lineas.map((l) => filaLinea(id, l))).execute();
      return id;
    });
    return { id };
  });
  if (r.ok) {
    revalidatePath("/portal/planilla");
    redirect(`/portal/planilla/${r.id}`);
  }
  return r;
}

export async function generarAguinaldo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const anio = Number(textoObligatorio(f, "anio", "el año"));
    const id = await consultar(async (tx) => {
      const lineas = await lineasAguinaldo(tx, anio);
      if (lineas.length === 0) throw new ErrorUsuario("No hay planillas mensuales aprobadas entre diciembre y noviembre: el aguinaldo se calcula con ellas.");
      const p = await tx.insertInto("planillas").values({ periodo_inicio: `${anio - 1}-12-01`, periodo_fin: `${anio}-11-30`, tipo: "aguinaldo" })
        .onConflict((oc) => oc.columns(["periodo_inicio", "periodo_fin", "tipo"]).doNothing()).returning("id").executeTakeFirst();
      if (!p) throw new ErrorUsuario(`Ya existe la planilla de aguinaldo ${anio}.`);
      await tx.insertInto("planilla_lineas").values(lineas.map((l) => ({
        planilla_id: p.id, empleado_id: l.empleado_id, fuente_id: l.fuente_id, salario_base: l.aguinaldo, dias_laborados: 0,
        salario_bruto: l.aguinaldo, ccss_obrero: 0, salario_neto: l.aguinaldo, cargas_patronales: 0, provision_aguinaldo: 0, provision_vacaciones: 0,
        detalle: JSON.stringify({ notas: [`Calculado con ${l.meses} meses de planilla aprobada. El aguinaldo no lleva cargas sociales (Ley 2412).`] }),
        reparto_fuentes: l.reparto ? JSON.stringify(l.reparto) : null,
      }))).execute();
      return p.id;
    });
    return { id };
  });
  if (r.ok) {
    revalidatePath("/portal/planilla");
    redirect(`/portal/planilla/${r.id}`);
  }
  return r;
}

/** Ajustes manuales de una línea en borrador; los montos se recalculan con la misma fórmula. */
export async function ajustarLinea(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const planilla = String(f.get("planilla_id"));
  const r = await ejecutar(async () => {
    const empleado = textoObligatorio(f, "empleado_id", "la persona");
    const valor = (k: string) => {
      const n = numero(f, k) ?? 0;
      if (n < 0) throw new ErrorUsuario("Los montos no pueden ser negativos.");
      return n;
    };
    await consultar(async (tx) => {
      const l = await tx.selectFrom("planilla_lineas").select(["detalle"]).where("planilla_id", "=", planilla).where("empleado_id", "=", empleado).executeTakeFirstOrThrow();
      const d = l.detalle as unknown as DetalleLinea;
      if (!d?.entrada) throw new ErrorUsuario("Esta línea no se ajusta aquí (por ejemplo, el aguinaldo).");
      const base = { ...d.entrada, montoHorasExtra: valor("monto_horas_extra"), rebajoTardias: valor("rebajo_tardias"), otrasDeducciones: valor("otras_deducciones"), impuestoRenta: undefined };
      const renta = valor("impuesto_renta");
      // Si la renta digitada es la misma que la calculada, se deja automática (sigue los tramos si cambian los montos).
      const entrada = renta === calcularLineaPlanilla(base).impuestoRentaAutomatico ? base : { ...base, impuestoRenta: renta };
      const c = calcularLineaPlanilla(entrada);
      const fila = filaLinea(planilla, { empleado_id: empleado, fuente_id: null, entrada, calculo: c, detalle: { ...d, entrada } });
      const montos: Partial<typeof fila> = { ...fila };
      delete montos.planilla_id;
      delete montos.empleado_id;
      delete montos.fuente_id;
      await tx.updateTable("planilla_lineas").set(montos).where("planilla_id", "=", planilla).where("empleado_id", "=", empleado).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/planilla/${planilla}`);
  return r;
}

export async function cambiarEstadoPlanilla(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const estado = textoObligatorio(f, "estado", "el estado") as "aprobada" | "pagada" | "anulada";
    if (!["aprobada", "pagada", "anulada"].includes(estado)) throw new ErrorUsuario("Estado no válido.");
    const n = await consultar((tx) => tx.updateTable("planillas").set({ estado }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("Solo la dirección o contabilidad pueden aprobar, pagar o anular planillas.");
    return {};
  });
  if (r.ok) revalidatePath(`/portal/planilla/${id}`);
  return r;
}
