"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

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
