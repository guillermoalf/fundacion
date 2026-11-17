import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { fechaHora } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { Insignia } from "../../../_ui/Insignias";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import { BotonActivo, BotonRestablecer, FormularioAcceso } from "../Formularios";
import { estadoUsuario, listarUsuarios } from "../datos";

export const metadata: Metadata = { title: "Usuario" };

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { esAdmin, esSuperadmin, consultar, usuario: yo } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="la gestión de usuarios" />;
  const u = (await listarUsuarios(consultar)).find((x) => x.id === id);
  if (!u) notFound();
  const propio = u.id === yo.id;
  const e = estadoUsuario(u);

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Usuarios", href: "/portal/usuarios" }, { etiqueta: u.nombre }]}
        titulo={u.nombre}
        descripcion={<>{u.correo} · {NOMBRE_ROL[u.rol]} · <Insignia tono={e.tono}>{e.texto}</Insignia></>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={estiloTarjeta}>
          <h2 className="mb-4 text-xl font-semibold">Rol y acceso</h2>
          <FormularioAcceso id={u.id} nombre={u.nombre} rol={u.rol} accesoHasta={u.acceso_hasta} propio={propio} conSuper={esSuperadmin} />
        </section>
        <div className="space-y-6">
          <section className={estiloTarjeta}>
            <h2 className="mb-2 text-xl font-semibold">Contraseña</h2>
            <p className="mb-4 text-slate-600">Si olvidó su contraseña, genere una nueva y entréguesela en persona.</p>
            <BotonRestablecer id={u.id} nombre={u.nombre} />
          </section>
          {!propio && (
            <section className={estiloTarjeta}>
              <h2 className="mb-2 text-xl font-semibold">{u.activo ? "Quitar el acceso" : "Devolver el acceso"}</h2>
              <p className="mb-4 text-slate-600">
                {u.activo ? "Desactivar no borra nada: lo que esta persona registró queda en la bitácora con su nombre." : "La persona podrá entrar otra vez con su contraseña."}
              </p>
              <BotonActivo id={u.id} activo={u.activo} />
            </section>
          )}
          <p className="text-sm text-slate-500">Creado el {fechaHora(u.creado_en)}. Última entrada: {fechaHora(u.ultima_sesion) ?? "nunca"}.</p>
        </div>
      </div>
    </>
  );
}
