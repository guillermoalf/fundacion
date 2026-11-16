"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

// `correo` se devuelve para volver a llenarlo: React limpia el formulario después de enviarlo.
export type EstadoLogin = { error: string | null; correo: string };

// Solo se vuelve a una ruta del portal: evita que ?siguiente= mande a otro sitio.
const destinoSeguro = (siguiente: string) => (/^\/portal(\/|\?|$)/.test(siguiente) ? siguiente : "/portal");

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");
  if (!correo || !contrasena) return { error: "Ingrese su correo y su contraseña.", correo };

  try {
    await auth.api.signInEmail({ body: { email: correo, password: contrasena }, headers: await headers() });
  } catch (e) {
    const credencialesMalas = e instanceof APIError && (e.status === "UNAUTHORIZED" || e.body?.code === "INVALID_EMAIL_OR_PASSWORD");
    return {
      error: credencialesMalas ? "Correo o contraseña incorrectos." : "No se pudo iniciar sesión. Intente de nuevo en unos minutos.",
      correo,
    };
  }
  redirect(destinoSeguro(String(formData.get("siguiente") ?? "")));
}
