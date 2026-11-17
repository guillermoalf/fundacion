import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/logo-abc.png";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { fecha } from "@/lib/portal/formato";
import { cerrarSesion } from "../acciones";
import { ProveedorAvisos } from "../_ui/Avisos";
import Menu from "../_ui/Menu";
import { MENU } from "../_ui/navegacion";

function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button type="submit" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100">
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
          <h1 className="text-xl font-semibold">Sin acceso al portal</h1>
          <p className="mt-2 text-base text-slate-600">
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

  const secciones = MENU.map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(perfil.rol) || perfil.rol === "superadmin") })).filter((s) => s.items.length);

  return (
    <ProveedorAvisos>
      <Menu
        secciones={secciones}
        cabecera={
          <Link href="/portal" className="block shrink-0">
            <img src={logo.src} alt="Fundación Creciendo Feliz" className="h-10 w-auto lg:h-12" />
          </Link>
        }
        pie={
          <div className="space-y-3">
            <div className="text-base leading-tight">
              <div className="font-semibold">{perfil.nombre}</div>
              <div className="text-sm text-slate-500">
                {NOMBRE_ROL[perfil.rol]}
                {perfil.acceso_hasta && ` · acceso hasta ${fecha(perfil.acceso_hasta)}`}
              </div>
            </div>
            <BotonSalir />
          </div>
        }
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </ProveedorAvisos>
  );
}
