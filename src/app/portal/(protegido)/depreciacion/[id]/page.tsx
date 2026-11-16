import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import { BotonActiva, FormularioCategoria } from "../Formularios";

export const metadata: Metadata = { title: "Fila de depreciación" };

export default async function CategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { consultar, esAdmin } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="la edición de la tabla de depreciación" />;
  const datos = await consultar(async (tx) => {
    const c = await tx.selectFrom("categorias_activo").selectAll().where("id", "=", id).executeTakeFirst();
    const { n } = await tx.selectFrom("activos").select((eb) => eb.fn.countAll<number>().as("n")).where("categoria_id", "=", id).executeTakeFirstOrThrow();
    return c ? { c, enUso: Number(n) } : null;
  });
  if (!datos) notFound();
  const { c, enUso } = datos;
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Tabla de depreciación", href: "/portal/depreciacion" }, { etiqueta: c.nombre }]} titulo={c.nombre} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className={estiloTarjeta}>
          <FormularioCategoria v={c} enUso={enUso} />
        </section>
        <section className={`${estiloTarjeta} space-y-3`}>
          <h2 className="text-xl font-semibold">{c.activa ? "Retirar la fila" : "Fila retirada"}</h2>
          <p className="text-slate-600">
            {c.activa
              ? "Una fila retirada deja de ofrecerse para activos nuevos. Los activos que ya la tienen la conservan."
              : "No se ofrece para activos nuevos. Los activos que ya la tenían la conservan."}
          </p>
          <BotonActiva id={c.id} activa={c.activa} />
        </section>
      </div>
    </>
  );
}
