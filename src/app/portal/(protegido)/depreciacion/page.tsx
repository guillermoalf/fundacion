import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import { estiloTarjeta } from "../../_ui/estilos";
import { FormularioCategoria } from "./Formularios";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Tabla de depreciación" };

export default async function DepreciacionPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams;
  const { consultar, esAdmin } = await obtenerSesion();
  const filas = await consultar((tx) =>
    tx.selectFrom("categorias_activo as c")
      .select(["c.id", "c.nombre", "c.tasa_anual", "c.anios_vida", "c.referencia", "c.activa", "c.palabras_clave",
        sql<number>`(select count(*)::int from activos a where a.categoria_id = c.id and a.estado <> 'dado_de_baja')`.as("en_uso")])
      .orderBy(alfa("c.nombre")).execute(),
  );

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Tabla de depreciación" }]}
        titulo="Tabla de depreciación"
        descripcion="Filas del Anexo 2 del Reglamento del Impuesto sobre la Renta que usa el sistema. Cada cambio queda en la bitácora."
      />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Cambios guardados.</p>}
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "nombre", titulo: "Fila" },
            { clave: "tasa", titulo: "Tasa anual", alinear: "derecha" },
            { clave: "anios", titulo: "Vida útil", alinear: "derecha" },
            { clave: "uso", titulo: "Activos que la usan", alinear: "derecha" },
            { clave: "estado", titulo: "Estado" },
          ]}
          filtros={[{ clave: "estado", titulo: "Estado" }]}
          filas={filas.map((c) => ({
            id: c.id,
            href: esAdmin ? `/portal/depreciacion/${c.id}` : undefined,
            celdas: {
              nombre: c.nombre,
              tasa: `${Number(c.tasa_anual)} %`,
              anios: `${c.anios_vida} años`,
              uso: c.en_uso > 0 ? { texto: String(c.en_uso), href: `/portal/activos` } : "0",
              estado: c.activa ? { texto: "En uso", tono: "verde" } : { texto: "Retirada", tono: "gris" },
            },
            orden: { tasa: Number(c.tasa_anual), anios: c.anios_vida, uso: c.en_uso },
            filtros: { estado: c.activa ? "En uso" : "Retirada" },
          }))}
        />
        {esAdmin && (
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Agregar una fila</h2>
            <p className="mb-4 text-slate-600">Por ejemplo, una fila del Anexo 2 que todavía no está (las de la G a la Z).</p>
            <FormularioCategoria />
          </section>
        )}
      </div>
    </>
  );
}
