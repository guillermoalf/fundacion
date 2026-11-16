import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/logo-abc.png";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { cerrarSesion } from "../acciones";

// Cada pantalla de la fase 1 agrega aquí su enlace.
const NAVEGACION = [
  { href: "/portal", etiqueta: "Inicio" },
  { href: "/portal/cuenta", etiqueta: "Mi cuenta" },
];

function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Cerrar sesión
      </button>
    </form>
  );
}

export default async function PortalProtegidoLayout({ children }: { children: ReactNode }) {
  const { usuario, perfil } = await obtenerSesion();

  if (!perfil) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Sin acceso al portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            El usuario <span className="font-medium">{usuario.correo}</span> no tiene acceso: está inactivo, su acceso
            temporal venció o todavía no tiene un perfil asignado. Comuníquese con la dirección.
          </p>
          <div className="mt-5 flex justify-center">
            <BotonSalir />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/portal" className="shrink-0">
              <img src={logo.src} alt="Fundación Creciendo Feliz" className="h-10 w-auto" />
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAVEGACION.map(({ href, etiqueta }) => (
                <Link key={href} href={href} className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
                  {etiqueta}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{perfil.nombre}</div>
              <div className="text-slate-500">
                {NOMBRE_ROL[perfil.rol]}
                {perfil.acceso_hasta && ` · acceso hasta ${perfil.acceso_hasta.split("-").reverse().join("/")}`}
              </div>
            </div>
            <BotonSalir />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
