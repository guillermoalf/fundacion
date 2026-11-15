"use server";

import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoContrasena = { error: string | null; listo: boolean };

export async function cambiarContrasena(_: EstadoContrasena, formData: FormData): Promise<EstadoContrasena> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  if (nueva.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres.", listo: false };
  if (nueva !== confirmacion) return { error: "Las contraseñas no coinciden.", listo: false };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    return {
      error: error.code === "same_password" ? "La contraseña nueva debe ser distinta a la actual." : "No se pudo cambiar la contraseña.",
      listo: false,
    };
  }
  return { error: null, listo: true };
}
