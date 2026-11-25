import type { Tx } from "@/lib/db";

/** Enlace a la foto de perfil de alguien, o null si no tiene. Lleva la fecha de cambio para que el navegador no muestre la vieja. */
export async function enlaceFoto(tx: Tx, perfilId: string): Promise<string | null> {
  const f = await tx.selectFrom("fotos_perfil").select("actualizada_en").where("id", "=", perfilId).where("contenido", "is not", null).executeTakeFirst();
  return f ? `/portal/fotos/${perfilId}?v=${new Date(f.actualizada_en).getTime()}` : null;
}

/** Primera letra del nombre (cuando no hay foto). */
export const inicialDe = (nombre: string) => (nombre.match(/\p{L}/u)?.[0] ?? "?").toUpperCase();
