import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { catalogosActivos, opciones } from "@/lib/portal/catalogos";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import FormularioActivo from "../FormularioActivo";

export const metadata: Metadata = { title: "Nuevo activo" };

export default async function NuevoActivoPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="el registro de activos" />;
  const c = await consultar(catalogosActivos);
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: "Nuevo" }]} titulo="Registrar un activo" descripcion="Lo que no sepa todavía lo puede dejar vacío: queda en Pendientes y lo completa después." />
      <div className={estiloTarjeta}>
        <FormularioActivo
          ubicaciones={opciones(c.ubicaciones, (u) => u.activo)}
          fuentes={c.fuentes.filter((x) => x.activo).map((x) => ({ valor: x.id, texto: `${x.codigo} · ${x.nombre}` }))}
          categorias={c.categorias.filter((x) => x.activa).map((x) => ({ valor: x.id, texto: `${x.nombre} (${Number(x.tasa_anual)} %)` }))}
        />
      </div>
    </>
  );
}
