import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloTarjeta } from "../../_ui/estilos";
import { IniciarConteo } from "./Formularios";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Conteo físico" };

export default async function ConteosPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const d = await consultar(async (tx) => ({
    conteos: await tx.selectFrom("conteos_fisicos as c").innerJoin("ubicaciones as u", "u.id", "c.ubicacion_id").innerJoin("empleados as e", "e.id", "c.responsable_id")
      .select(["c.id", "c.fecha", "c.cerrado", "c.acta_firmada_url", "u.nombre as ubicacion", "e.nombre as responsable",
        sql<number>`(select count(*)::int from conteo_detalle d where d.conteo_id = c.id and not d.encontrado)`.as("faltantes")])
      .orderBy("c.fecha", "desc").execute(),
    ubicaciones: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute(),
    personal: await tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute(),
  }));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Conteo físico" }]} titulo="Conteo físico" descripcion="Se recorre cada aula con el celular, se marca qué está y qué falta, y la responsable firma el acta." />
      <div className="space-y-8">
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Empezar un conteo</h2>
            <IniciarConteo hoy={hoyCR()} ubicaciones={d.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))} personal={d.personal.map((p) => ({ valor: p.id, texto: p.nombre }))} />
          </section>
        )}
        <Tabla
          columnas={[{ clave: "ubicacion", titulo: "Ubicación" }, { clave: "fecha", titulo: "Fecha" }, { clave: "responsable", titulo: "Responsable" }, { clave: "faltantes", titulo: "Faltantes", alinear: "derecha" }, { clave: "estado", titulo: "Estado" }]}
          filtros={[{ clave: "ubicacion", titulo: "Ubicación" }, { clave: "estado", titulo: "Estado" }]}
          filas={d.conteos.map((c) => {
            const est = !c.cerrado ? { texto: "En curso", tono: "ambar" as const } : c.acta_firmada_url ? { texto: "Cerrado y firmado", tono: "verde" as const } : { texto: "Falta el acta firmada", tono: "ambar" as const };
            return {
              id: c.id, href: `/portal/conteos/${c.id}`,
              celdas: { ubicacion: c.ubicacion, fecha: fecha(c.fecha)!, responsable: c.responsable, faltantes: c.cerrado ? String(c.faltantes) : { vacio: true }, estado: est },
              orden: { fecha: c.fecha, faltantes: c.faltantes },
              filtros: { ubicacion: c.ubicacion, estado: est.texto },
            };
          })}
          vacio={<Vacio titulo="Todavía no hay conteos." />}
        />
      </div>
    </>
  );
}
