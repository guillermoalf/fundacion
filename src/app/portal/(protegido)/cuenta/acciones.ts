"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ejecutar, ErrorUsuario, type Resultado } from "@/lib/portal/acciones";
import { obtenerSesion } from "@/lib/portal/sesion";

export type EstadoContrasena = { error: string | null };

export async function cambiarContrasena(_: EstadoContrasena, formData: FormData): Promise<EstadoContrasena> {
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  if (!actual) return { error: "Escriba su contraseña actual." };
  if (nueva.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (nueva !== confirmacion) return { error: "Las contraseñas no coinciden." };
  if (nueva === actual) return { error: "La contraseña nueva debe ser distinta a la actual." };

  try {
    // Cierra la sesión en los demás dispositivos: si alguien más conocía la contraseña, queda fuera.
    await auth.api.changePassword({
      body: { currentPassword: actual, newPassword: nueva, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (e) {
    const actualMala = e instanceof APIError && e.body?.code === "INVALID_PASSWORD";
    return { error: actualMala ? "La contraseña actual no es correcta." : "No se pudo cambiar la contraseña. Intente de nuevo." };
  }
  // La sesión se renovó (cookie nueva): se recarga la página para que la use, y ahí se muestra el aviso.
  redirect("/portal/cuenta?contrasena=cambiada");
}

/**
 * Cambia (o quita, con null) la foto de perfil propia. Llega del navegador ya recortada a 256 px en JPEG,
 * como texto base64.
 */
export async function cambiarFoto(base64: string | null): Promise<Resultado> {
  return ejecutar(async () => {
    const { consultar } = await obtenerSesion();
    const contenido = base64 ? Buffer.from(base64, "base64") : null;
    if (contenido && (contenido.length === 0 || contenido.length > 300 * 1024)) throw new ErrorUsuario("La foto es muy pesada. Pruebe con otra.");
    const tipo = contenido ? "image/jpeg" : null;
    await consultar((tx) => tx.insertInto("fotos_perfil").values({ tipo, contenido })
      .onConflict((oc) => oc.column("id").doUpdateSet({ tipo, contenido, actualizada_en: new Date() })).execute());
    revalidatePath("/portal", "layout");
    return {};
  });
}
