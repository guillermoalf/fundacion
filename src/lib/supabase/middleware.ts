import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./tipos";

export const RUTA_LOGIN = "/portal/login";

/**
 * Protege /portal: refresca la sesión de Supabase (cookies) y manda al login a quien no la tenga.
 * Qué puede ver o hacer cada rol no se decide aquí: lo decide el RLS de la base.
 */
export async function protegerPortal(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser valida el token con Supabase Auth (getSession solo lee la cookie, que se puede falsificar).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const enLogin = pathname === RUTA_LOGIN;

  if (!user && !enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = RUTA_LOGIN;
    url.search = "";
    url.searchParams.set("siguiente", pathname + search);
    return redirigirConCookies(url, response);
  }
  if (user && enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return redirigirConCookies(url, response);
  }
  return response;
}

// Una redirección debe llevar las cookies que Supabase acaba de refrescar, o la sesión se pierde.
function redirigirConCookies(url: URL, desde: NextResponse) {
  const redireccion = NextResponse.redirect(url);
  desde.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}
