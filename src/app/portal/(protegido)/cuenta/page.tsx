import type { Metadata } from "next";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import FormularioContrasena from "./FormularioContrasena";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ contrasena?: string }> }) {
  const { usuario, perfil } = await obtenerSesion();
  const cambiada = (await searchParams).contrasena === "cambiada";

  return (
    <section className="max-w-lg">
      <Encabezado migas={[{ etiqueta: "Mi cuenta" }]} titulo="Mi cuenta" />
      <dl className="space-y-1 text-base">
        <div>
          <dt className="inline text-slate-500">Correo: </dt>
          <dd className="inline">{usuario.correo}</dd>
        </div>
        {perfil && (
          <div>
            <dt className="inline text-slate-500">Rol: </dt>
            <dd className="inline">{NOMBRE_ROL[perfil.rol]}</dd>
          </div>
        )}
      </dl>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Cambiar contraseña</h2>
        {cambiada && (
          <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Contraseña actualizada. Si tenía el portal abierto en otro dispositivo, ahí tendrá que ingresar de nuevo.
          </p>
        )}
        <FormularioContrasena />
      </div>
    </section>
  );
}
