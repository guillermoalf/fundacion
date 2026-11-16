"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, entero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import { hoyCR } from "@/lib/portal/formato";

type R = Resultado | null;

export async function iniciarConteo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const ubicacion = entero(f, "ubicacion_id");
    if (!ubicacion) throw new ErrorUsuario("Elija el aula o ubicación.");
    const responsable = textoObligatorio(f, "responsable_id", "la persona responsable del aula");
    const { id } = await consultar((tx) =>
      tx.insertInto("conteos_fisicos").values({ ubicacion_id: ubicacion, responsable_id: responsable, fecha: texto(f, "fecha") ?? hoyCR() }).returning("id").executeTakeFirstOrThrow(),
    );
    return { id };
  });
  if (r.ok) redirect(`/portal/conteos/${r.id}`);
  return r;
}

/** Marca un activo como encontrado o no (desde la lista o escaneando su QR). */
export async function marcarActivo(conteoId: string, activoId: string, encontrado: boolean): Promise<Resultado<{ nota?: string }>> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    let nota: string | undefined;
    await consultar(async (tx) => {
      const c = await tx.selectFrom("conteos_fisicos").select(["ubicacion_id", "cerrado"]).where("id", "=", conteoId).executeTakeFirstOrThrow();
      if (c.cerrado) throw new ErrorUsuario("El conteo ya está cerrado.");
      const a = await tx.selectFrom("activos as a").innerJoin("ubicaciones as u", "u.id", "a.ubicacion_id").select(["a.ubicacion_id", "a.estado", "u.nombre"]).where("a.id", "=", activoId).executeTakeFirst();
      if (!a) throw new ErrorUsuario("Ese código no corresponde a ningún activo.");
      if (a.estado === "dado_de_baja") throw new ErrorUsuario("Ese activo está dado de baja.");
      if (a.ubicacion_id !== c.ubicacion_id) nota = `Está registrado en ${a.nombre}: si se quedará aquí, haga un traslado.`;
      await tx.insertInto("conteo_detalle").values({ conteo_id: conteoId, activo_id: activoId, encontrado, nota: nota ?? null })
        .onConflict((oc) => oc.columns(["conteo_id", "activo_id"]).doUpdateSet({ encontrado, nota: nota ?? null })).execute();
    });
    revalidatePath(`/portal/conteos/${conteoId}`);
    return nota ? { nota } : {};
  });
}

/** Busca un activo por placa para marcarlo (cuando no se puede escanear). */
export async function buscarPorPlaca(placa: string): Promise<{ id: string; tipo_bien: string } | null> {
  const { consultar } = await obtenerSesion();
  return consultar(async (tx) =>
    (await tx.selectFrom("activos").select(["id", "tipo_bien"]).where(sql`lower(placa)`, "=", placa.trim().toLowerCase()).where("estado", "<>", "dado_de_baja").executeTakeFirst()) ?? null,
  );
}

/** Cierra el conteo: lo que no se marcó queda como no encontrado. */
export async function cerrarConteo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    await consultar(async (tx) => {
      const c = await tx.selectFrom("conteos_fisicos").select(["ubicacion_id", "cerrado"]).where("id", "=", id).executeTakeFirstOrThrow();
      if (c.cerrado) throw new ErrorUsuario("El conteo ya estaba cerrado.");
      await sql`insert into conteo_detalle (conteo_id, activo_id, encontrado, nota)
        select ${id}, a.id, false, 'No se marcó durante el conteo'
        from activos a where a.ubicacion_id = ${c.ubicacion_id} and a.estado <> 'dado_de_baja'
          and not exists (select 1 from conteo_detalle d where d.conteo_id = ${id} and d.activo_id = a.id)`.execute(tx);
      await tx.updateTable("conteos_fisicos").set({ cerrado: true, observaciones: texto(f, "observaciones") }).where("id", "=", id).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/conteos/${id}`);
  return r;
}

export async function subirActa(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    await consultar(async (tx) => {
      const url = await guardarArchivo(tx, f.get("acta"));
      if (!url) throw new ErrorUsuario("Elija la foto o el PDF del acta firmada.");
      await tx.updateTable("conteos_fisicos").set({ acta_firmada_url: url }).where("id", "=", id).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/conteos/${id}`);
  return r;
}
