import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import FormularioReporte from "../FormularioReporte";
import { opcionesReporte } from "../opciones";

export const metadata: Metadata = { title: "Nuevo reporte" };

export default async function NuevoReportePage() {
  const { consultar, esAdmin } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="crear reportes" />;
  const op = await consultar((tx) => opcionesReporte(tx));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes", href: "/portal/reportes" }, { etiqueta: "Nuevo reporte" }]} titulo="Nuevo reporte" />
      <section className={estiloTarjeta}><FormularioReporte {...op} /></section>
    </>
  );
}
