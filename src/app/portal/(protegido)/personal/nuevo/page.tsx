import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioEmpleado } from "../Formularios";

export const metadata: Metadata = { title: "Agregar persona" };

export default async function NuevoEmpleadoPage() {
  const { consultar, puedeEscribir, editaSalarios } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="el registro de personal" />;
  const c = await consultar(async (tx) => ({
    ubicaciones: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute(),
    fuentes: await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).where("activo", "=", true).orderBy("id").execute(),
  }));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Personal", href: "/portal/personal" }, { etiqueta: "Agregar" }]} titulo="Agregar una persona" descripcion="Después de guardar podrá ponerle su horario y su PIN para marcar." />
      <div className={estiloTarjeta}>
        <FormularioEmpleado conSalario={editaSalarios} ubicaciones={c.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))} fuentes={c.fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))} />
      </div>
    </>
  );
}
