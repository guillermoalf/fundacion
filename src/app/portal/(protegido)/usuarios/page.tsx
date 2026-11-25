import type { Metadata } from "next";
import { NOMBRE_ROL, obtenerSesion } from "@/lib/portal/sesion";
import { estadoUsuario, listarUsuarios } from "./datos";
import { cantidad, fechaHora } from "@/lib/portal/formato";
import { sql } from "kysely";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import Tabla from "../../_ui/Tabla";
import { estiloTarjeta } from "../../_ui/estilos";
import { FormularioNuevoUsuario } from "./Formularios";

/** Almacenamiento del plan gratis de Neon (1 GB por proyecto). Si se cambia de plan, actualizar aquí. */
const LIMITE_MB = 1024;

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const { esAdmin, esSuperadmin, consultar } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="la gestión de usuarios" />;
  const usuarios = await listarUsuarios(consultar);
  const espacio = esSuperadmin ? (await consultar((tx) => sql<{ base_bytes: string; archivos_bytes: string; archivos: number }>`select * from espacio_usado()`.execute(tx))).rows[0] : null;
  const mb = (b: string | number) => Number(b) / 1024 / 1024;

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
        {espacio && (
          <p className="text-sm text-slate-500">
            Espacio usado en la base de datos: {cantidad(Math.round(mb(espacio.base_bytes)))} MB de {cantidad(LIMITE_MB)} MB
            ({Math.round((mb(espacio.base_bytes) / LIMITE_MB) * 100)} % del plan gratis de Neon) · {espacio.archivos} fotos y PDF ocupan {cantidad(Math.round(mb(espacio.archivos_bytes) * 10) / 10)} MB.
          </p>
        )}
      </div>
    </>
  );
}
