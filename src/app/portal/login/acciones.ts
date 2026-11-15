"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

// `correo` se devuelve para volver a llenarlo: React limpia el formulario después de enviarlo.
export type EstadoLogin = { error: string | null; correo: string };

// Solo se vuelve a una ruta del portal: evita que ?siguiente= mande a otro sitio.
const destinoSeguro = (siguiente: string) => (/^\/portal(\/|\?|$)/.test(siguiente) ? siguiente : "/portal");

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim();
  const contrasena = String(formData.get("contrasena") ?? "");
  if (!correo || !contrasena) return { error: "Ingrese su correo y su contraseña.", correo };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : "No se pudo iniciar sesión. Intente de nuevo en unos minutos.",
      correo,
    };
  }
  redirect(destinoSeguro(String(formData.get("siguiente") ?? "")));
}
