import { NextResponse, type NextRequest } from "next/server";
import { protegerPortal } from "@/lib/supabase/middleware";

// Rutas públicas del sitio. Antes se servían con mayúscula (/Nosotros); ahora
// son en minúscula y cualquier otra variante redirige con 301 para conservar el SEO.
const PUBLIC_ROUTES = ["/nosotros", "/servicios", "/donaciones", "/admisiones", "/contactenos"];

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
