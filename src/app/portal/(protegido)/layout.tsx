import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/logo-abc.png";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR } from "@/lib/portal/formato";
import { estudiosPani, resumenEstudios } from "@/lib/portal/estudios";
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
  const { usuario, perfil, veNotasNinos, consultar } = await obtenerSesion();

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

  // Estudios socioeconómicos PANI: aviso fijo (no se puede cerrar) en todo el portal para quien los gestiona.
  const estudios = veNotasNinos ? resumenEstudios((await consultar((tx) => estudiosPani(tx, hoyCR()))).estudios) : null;
  const urgentes = estudios ? estudios.falta + estudios.vencido + estudios.urgente : 0;

  const secciones = MENU.map((s) => ({ ...s, items: s.items.filter((i) =>
    perfil.rol === "personal" ? i.personal : !i.roles || i.roles.includes(perfil.rol) || perfil.rol === "superadmin") })).filter((s) => s.items.length);

  return (
    <ProveedorUsuario id={usuario.id}>
    <ProveedorAvisos>
      <Menu
        secciones={secciones}
        inicial={(perfil.nombre.match(/\p{L}/u)?.[0] ?? "?").toUpperCase()}
        cabecera={
          <Link href="/portal" className="block shrink-0">
            <img src={logo.src} alt="Fundación Creciendo Feliz" className="h-10 w-auto max-w-none" />
          </Link>
        }
        pie={
          <div className="space-y-3">
            <div className="text-base leading-tight">
              <div className="font-semibold">{perfil.nombre}</div>
              <div className="text-sm text-slate-300">
                {NOMBRE_ROL[perfil.rol]}
                {perfil.acceso_hasta && ` · acceso hasta ${fecha(perfil.acceso_hasta)}`}
              </div>
            </div>
            <BotonSalir />
          </div>
        }
      />
      <main className="px-4 py-6 sm:px-6 lg:ml-20 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {estudios && (urgentes > 0 || estudios.aviso > 0) && (
            <Link href="/portal/ninos/estudios" role="alert"
              className={`mb-5 block rounded-2xl border-2 px-4 py-3 text-base ${urgentes > 0 ? "border-red-400 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
              <strong>{urgentes > 0 ? "⚠ Urgente — estudios socioeconómicos PANI: " : "Estudios socioeconómicos PANI: "}</strong>
              {[
                estudios.vencido && `${estudios.vencido} vencido${estudios.vencido === 1 ? "" : "s"}`,
                estudios.urgente && `${estudios.urgente} vence${estudios.urgente === 1 ? "" : "n"} en menos de 3 meses`,
                estudios.falta && `${estudios.falta} niño${estudios.falta === 1 ? "" : "s"} sin estudio registrado`,
                estudios.aviso && `${estudios.aviso} vence${estudios.aviso === 1 ? "" : "n"} en menos de 6 meses`,
              ].filter(Boolean).join(" · ")}
              . <span className="font-semibold underline">Ver y actualizar →</span>
            </Link>
          )}
          {children}
        </div>
      </main>
    </ProveedorAvisos>
    </ProveedorUsuario>
  );
}
