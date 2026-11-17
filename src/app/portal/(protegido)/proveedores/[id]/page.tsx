import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import { estiloTarjeta } from "../../../_ui/estilos";
import FormularioProveedor from "../Formulario";

export const metadata: Metadata = { title: "Proveedor" };

export default async function ProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { consultar } = await obtenerSesion();
  const p = await consultar((tx) => tx.selectFrom("proveedores").selectAll().where("id", "=", id).executeTakeFirst());
  if (!p) notFound();
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Proveedores", href: "/portal/proveedores" }, { etiqueta: p.nombre }]} titulo={p.nombre} />
      <section className={estiloTarjeta}><FormularioProveedor v={p} /></section>
    </>
  );
}
