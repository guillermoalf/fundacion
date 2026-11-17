import type { Metadata } from "next";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { estadoUsuario, listarUsuarios } from "./datos";
import { fechaHora } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import Tabla from "../../_ui/Tabla";
import { estiloTarjeta } from "../../_ui/estilos";
import { FormularioNuevoUsuario } from "./Formularios";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const { esAdmin, esSuperadmin, consultar } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="la gestión de usuarios" />;
  const usuarios = await listarUsuarios(consultar);

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Usuarios" }]} titulo="Usuarios del portal" descripcion="Quién puede entrar al portal y qué puede hacer. El personal que solo marca asistencia no necesita usuario." />
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "nombre", titulo: "Nombre" },
            { clave: "correo", titulo: "Correo" },
            { clave: "rol", titulo: "Rol" },
            { clave: "estado", titulo: "Estado" },
            { clave: "sesion", titulo: "Última entrada", ocultarEnMovil: true },
          ]}
          filtros={[{ clave: "rol", titulo: "Rol" }, { clave: "estado", titulo: "Estado" }]}
          filas={usuarios.map((u) => {
            const e = estadoUsuario(u);
            return {
              id: u.id,
              href: `/portal/usuarios/${u.id}`,
              celdas: { nombre: u.nombre, correo: u.correo, rol: NOMBRE_ROL[u.rol], estado: { texto: e.texto, tono: e.tono }, sesion: fechaHora(u.ultima_sesion) ?? { vacio: true } },
              filtros: { rol: NOMBRE_ROL[u.rol], estado: e.texto.startsWith("Hasta") ? "Temporal" : e.texto },
            };
          })}
        />
        <section className={estiloTarjeta}>
          <h2 className="mb-1 text-xl font-semibold">Agregar un usuario</h2>
          <p className="mb-4 text-slate-600">
            El portal todavía no envía correos: al crear el usuario se muestra una contraseña temporal para entregarla en persona.
          </p>
          <FormularioNuevoUsuario conSuper={esSuperadmin} />
        </section>
      </div>
    </>
  );
}
