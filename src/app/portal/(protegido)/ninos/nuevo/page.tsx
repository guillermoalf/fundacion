import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioNino } from "../Formularios";

export const metadata: Metadata = { title: "Registrar niño o niña" };

export default async function NuevoNinoPage() {
  const { consultar, editaNinos } = await obtenerSesion();
  if (!editaNinos) return <SinPermiso que="registrar niños" />;
  const { aulas, fuentes } = await consultar(async (tx) => ({
    aulas: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy("nombre").execute(),
    fuentes: await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).orderBy("id").execute(),
  }));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Niños y niñas", href: "/portal/ninos" }, { etiqueta: "Registrar" }]} titulo="Registrar niño o niña" descripcion="Solo nombre y apellidos son obligatorios. Lo que falte queda como aviso en la lista." />
      <section className={estiloTarjeta}>
        <FormularioNino aulas={aulas.map((u) => ({ valor: u.id, texto: u.nombre }))} fuentes={fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))} hoy={hoyCR()} />
      </section>
    </>
  );
}
