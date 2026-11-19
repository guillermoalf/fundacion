"use server";

import { obtenerSesion } from "@/lib/portal/sesion";

/** Preferencias de una lista (columnas y orden) del usuario con sesión. Solo él las ve (RLS). */
export type PreferenciaTabla = { columnas?: string[]; orden?: { clave: string; asc: boolean } | null };

export async function leerPreferenciaTabla(tabla: string): Promise<PreferenciaTabla | null> {
  try {
    const { consultar } = await obtenerSesion();
    const fila = await consultar((tx) => tx.selectFrom("preferencias_tabla").select("config").where("tabla", "=", tabla).executeTakeFirst());
    return (fila?.config as PreferenciaTabla | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function guardarPreferenciaTabla(tabla: string, config: PreferenciaTabla): Promise<void> {
  try {
    const { consultar, usuario } = await obtenerSesion();
    const limpio: PreferenciaTabla = {
      columnas: Array.isArray(config.columnas) ? config.columnas.filter((c) => typeof c === "string").slice(0, 60) : undefined,
      orden: config.orden && typeof config.orden.clave === "string" ? { clave: config.orden.clave, asc: !!config.orden.asc } : null,
    };
    await consultar((tx) => tx.insertInto("preferencias_tabla").values({ usuario_id: usuario.id, tabla: tabla.slice(0, 200), config: JSON.stringify(limpio) })
      .onConflict((oc) => oc.columns(["usuario_id", "tabla"]).doUpdateSet({ config: JSON.stringify(limpio), actualizado_en: new Date() }))
      .execute());
  } catch {
    // Una preferencia que no se guarda no debe molestar a nadie.
  }
}
