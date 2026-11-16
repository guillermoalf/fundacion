import { NextResponse, type NextRequest } from "next/server";
import { RUTA_LOGIN } from "@/lib/portal/rutas";

// Rutas públicas del sitio. Antes se servían con mayúscula (/Nosotros); ahora
// son en minúscula y cualquier otra variante redirige con 301 para conservar el SEO.
const PUBLIC_ROUTES = ["/nosotros", "/servicios", "/donaciones", "/admisiones", "/contactenos"];

/**
 * Protege /portal: sin cookie de sesión manda al login. Aquí solo se ve si la cookie existe (el middleware
 * no consulta la base); que la sesión sea válida lo revisa obtenerSesion() en cada página, y qué puede ver
 * o hacer cada rol lo decide el RLS de la base.
 */
// Nombre de la cookie de Better Auth (con prefijo __Secure- en https). Se lee directo para no cargar
// better-auth en el middleware (arrastra librerías que el Edge Runtime no soporta).
const tieneCookieDeSesion = (r: NextRequest) =>
  r.cookies.has("better-auth.session_token") || r.cookies.has("__Secure-better-auth.session_token");

function protegerPortal(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === RUTA_LOGIN || tieneCookieDeSesion(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = RUTA_LOGIN;
  url.search = "";
  url.searchParams.set("siguiente", pathname + search);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lowercase = pathname.toLowerCase();

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return protegerPortal(request);
  }

  // El panel /admin anterior no se migró; el portal interno vivirá en /portal.
  if (lowercase === "/admin" || lowercase.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  if (pathname !== lowercase && PUBLIC_ROUTES.includes(lowercase)) {
    const url = request.nextUrl.clone();
    url.pathname = lowercase;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Solo rutas de página: excluye los assets de Next y archivos con extensión.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
