"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { corregirRegistro } from "@/lib/portal/correcciones";

export async function guardarCorreccion(_: Resultado | null, f: FormData): Promise<Resultado | null> {
  const { consultar, esSuperadmin } = await obtenerSesion();
  return ejecutar(async () => {
    if (!esSuperadmin) throw new ErrorUsuario("Solo el superadministrador puede hacer correcciones.");
    const tabla = textoObligatorio(f, "_tabla", "la tabla");
    const clave = JSON.parse(textoObligatorio(f, "_clave", "el registro")) as Record<string, unknown>;
    const original = JSON.parse(String(f.get("_original") ?? "{}")) as Record<string, string>;
    const motivo = textoObligatorio(f, "_motivo", "el motivo de la corrección");
    // Solo se mandan los campos que cambiaron.
    const cambios: Record<string, string> = {};
    for (const [k, v] of f.entries()) {
      if (k.startsWith("_") || typeof v !== "string") continue;
      if (v !== (original[k] ?? "")) cambios[k] = v;
    }
    await consultar((tx) => corregirRegistro(tx, tabla, clave, cambios, motivo));
    revalidatePath("/portal", "layout");
    return {};
  });
}
