import type { obtenerSesion } from "@/lib/portal/sesion";

export async function cargarConteo(consultar: Awaited<ReturnType<typeof obtenerSesion>>["consultar"], id: string) {
  return consultar(async (tx) => {
    const c = await tx.selectFrom("conteos_fisicos as c").innerJoin("ubicaciones as u", "u.id", "c.ubicacion_id").innerJoin("empleados as e", "e.id", "c.responsable_id")
      .leftJoin("perfiles as p", "p.id", "c.realizado_por")
      .select(["c.id", "c.fecha", "c.cerrado", "c.acta_firmada_url", "c.observaciones", "c.ubicacion_id", "u.nombre as ubicacion", "e.nombre as responsable", "p.nombre as realizo"])
      .where("c.id", "=", id).executeTakeFirst();
    if (!c) return null;
    const activos = await tx.selectFrom("activos as a")
      .leftJoin("conteo_detalle as d", (j) => j.onRef("d.activo_id", "=", "a.id").on("d.conteo_id", "=", id))
      .select(["a.id", "a.placa", "a.tipo_bien", "d.encontrado", "d.nota"])
      .where((eb) => eb.or([eb.and([eb("a.ubicacion_id", "=", c.ubicacion_id), eb("a.estado", "<>", "dado_de_baja")]), eb("d.conteo_id", "=", id)]))
      .orderBy("a.placa").execute();
    return { c, activos };
  });
}
