import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import { Insignia } from "../../../_ui/Insignias";
import { estiloTarjeta } from "../../../_ui/estilos";
import { REPORTES_CATEGORIA } from "../datos";
import { FormularioCategoria } from "./Formularios";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Categorías de productos" };

export default async function CategoriasPage() {
  const { consultar, esAdmin } = await obtenerSesion();
  const cats = await consultar(async (tx) => {
    const lista = await tx.selectFrom("categorias_producto as c")
      .select((eb) => ["c.codigo", "c.nombre", "c.reporte", "c.orden", "c.activo",
        eb.selectFrom("productos as p").select((e) => e.fn.countAll<number>().as("n")).whereRef("p.categoria", "=", "c.codigo").as("productos")])
      .orderBy("c.activo", "desc").orderBy(alfa("c.nombre")).execute();
    return lista;
  });
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Categorías" }]}
        titulo="Categorías de productos"
        descripcion="Las que se ofrecen al registrar compras y productos. Para quitar una, desmarque «En uso»: deja de ofrecerse, pero los productos que ya la tienen la conservan y nada se borra."
      />
      <div className="space-y-6">
        {esAdmin && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Agregar categoría</h2>
            <FormularioCategoria />
          </section>
        )}
        <section className={`${estiloTarjeta} space-y-5`}>
          <h2 className="text-xl font-semibold">Categorías</h2>
          {cats.map((c) => (
            <div key={c.codigo} className={`space-y-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0 ${c.activo ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {!c.activo && <Insignia>Ya no se usa</Insignia>}
                <Insignia tono={c.reporte === "ninguno" ? "gris" : "azul"}>{REPORTES_CATEGORIA[c.reporte as keyof typeof REPORTES_CATEGORIA]}</Insignia>
                <span className="text-slate-500">{Number(c.productos ?? 0)} {Number(c.productos ?? 0) === 1 ? "producto" : "productos"}</span>
              </div>
              {esAdmin ? <FormularioCategoria v={{ ...c, orden: Number(c.orden) }} /> : <p className="text-lg font-medium">{c.nombre}</p>}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
