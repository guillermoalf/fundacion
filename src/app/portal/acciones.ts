"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RUTA_LOGIN } from "@/lib/portal/rutas";

export async function cerrarSesion() {
  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  redirect(RUTA_LOGIN);
}
