"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { diasHabiles } from "@/lib/calculos/planilla";
import { hoyCR } from "@/lib/portal/formato";

type R = Resultado | null;

function revalidar() {
  revalidatePath("/portal/vacaciones");
  revalidatePath("/portal/personal", "layout");
  revalidatePath("/portal/ausencias", "layout");
}

/** Solicitar vacaciones: para uno mismo, o (dirección/coordinación) a nombre de otra persona. */
export async function solicitarVacaciones(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const desde = textoObligatorio(f, "desde", "el primer día");
    const hasta = textoObligatorio(f, "hasta", "el último día");
    if (hasta < desde) throw new ErrorUsuario("El último día no puede ser antes del primero.");
    if (desde < hoyCR() && !texto(f, "empleado_id")) throw new ErrorUsuario("Las vacaciones se solicitan para fechas que todavía no han pasado.");
    const dias = diasHabiles(desde, hasta);
    if (dias <= 0) throw new ErrorUsuario("En esas fechas no hay días hábiles (solo fines de semana).");
    await consultar(async (tx) => {
      const propio = (await sql<{ id: string | null }>`select mi_empleado() as id`.execute(tx)).rows[0].id;
      const empleado = texto(f, "empleado_id") ?? propio;
      if (!empleado) throw new ErrorUsuario("Su usuario todavía no está ligado a su ficha de Personal. Pídale a la dirección que lo ligue.");
      const choque = await tx.selectFrom("solicitudes_vacaciones").select("id").where("empleado_id", "=", empleado).where("estado", "in", ["pendiente", "aprobada"])
        .where("desde", "<=", hasta).where("hasta", ">=", desde).executeTakeFirst();
      if (choque) throw new ErrorUsuario("Ya hay una solicitud pendiente o aprobada que incluye esas fechas.");
      await tx.insertInto("solicitudes_vacaciones").values({ empleado_id: empleado, desde, hasta, dias_habiles: dias, nota: texto(f, "nota") }).execute();
    });
    return {};
  });
  if (r.ok) revalidar();
  return r;
}

export async function resolverSolicitud(id: string, aprobar: boolean, respuesta: string | null): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    await consultar((tx) => sql`select resolver_vacaciones(${id}::uuid, ${aprobar}, ${respuesta})`.execute(tx));
    return {};
  });
  if (r.ok) revalidar();
  return r;
}

export async function anularSolicitud(id: string): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    await consultar((tx) => sql`select anular_solicitud_vacaciones(${id}::uuid)`.execute(tx));
    return {};
  });
  if (r.ok) revalidar();
  return r;
}
