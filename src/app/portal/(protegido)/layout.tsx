import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/logo-abc.png";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { fecha } from "@/lib/portal/formato";
import { notificaciones } from "@/lib/portal/notificaciones";
import { enlaceFoto, inicialDe } from "@/lib/portal/fotos";
import { cerrarSesion } from "../acciones";
import { ProveedorAvisos } from "../_ui/Avisos";
import { ProveedorUsuario } from "../_ui/Borrador";
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
  const { usuario, perfil, veNotasNinos, esAdmin, esPersonal, consultar } = await obtenerSesion();

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

  // Avisos (estudios socioeconómicos, vacaciones por aprobar…): el número sale en «Notificaciones» del menú.
  const [avisos, foto] = await consultar((tx) => Promise.all([notificaciones(tx, { veNotasNinos, esAdmin, esPersonal }), enlaceFoto(tx, usuario.id)]));
  const insignias = { "/portal/notificaciones": avisos.length };

  const secciones = MENU.map((s) => ({ ...s, items: s.items.filter((i) =>
    perfil.rol === "personal" ? i.personal : !i.roles || i.roles.includes(perfil.rol) || perfil.rol === "superadmin") })).filter((s) => s.items.length);

  return (
    <ProveedorUsuario id={usuario.id}>
    <ProveedorAvisos>
      <Menu
        secciones={secciones}
        insignias={insignias}
        inicial={inicialDe(perfil.nombre)}
        foto={foto}
        cabecera={
          <Link href="/portal" className="block shrink-0">
            <img src={logo.src} alt="Fundación Creciendo Feliz" className="h-10 w-auto max-w-none" />
          </Link>
        }
        pie={
          <div className="space-y-3">
            <Link href="/portal/cuenta" className="flex items-center gap-3 text-base leading-tight hover:opacity-90">
              {foto
                ? <img src={foto} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff6d6] text-lg font-bold text-[#14284b]">{inicialDe(perfil.nombre)}</span>}
              <span className="min-w-0">
              <div className="truncate font-semibold">{perfil.nombre}</div>
              <div className="text-sm text-slate-300">
                {NOMBRE_ROL[perfil.rol]}
                {perfil.acceso_hasta && ` · acceso hasta ${fecha(perfil.acceso_hasta)}`}
              </div>
              </span>
            </Link>
            <BotonSalir />
          </div>
        }
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-20 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </ProveedorAvisos>
    </ProveedorUsuario>
  );
}
