import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { consultaActivos } from "@/lib/portal/activos";
import { colones, fecha } from "@/lib/portal/formato";
import { colorUbicacion } from "@/lib/portal/ubicaciones";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";
import Vacio from "../../../_ui/Vacio";

export const metadata: Metadata = { title: "Desecho de activos" };

/** Activos dados de baja, con su acta o revisión de técnico. No salen en la lista de Activos. */
export default async function DesechoPage() {
  const { consultar } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const activos = await consultaActivos(tx).where("a.estado", "=", "dado_de_baja").orderBy("a.fecha_baja", "desc").orderBy("a.placa").execute();
    const actas = activos.length
      ? await tx.selectFrom("activo_movimientos").select(["activo_id", "documento_url"]).where("tipo", "=", "baja")
        .where("activo_id", "in", activos.map((a) => a.id)).orderBy("creado_en").execute()
      : [];
    return { activos, acta: new Map(actas.map((m) => [m.activo_id, m.documento_url])) };
  });

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: "Desecho de activos" }]} titulo="Desecho de activos" />
      <Tabla
        id="desecho-activos"
        columnas={[
          { clave: "bien", titulo: "Activo" },
          { clave: "placa", titulo: "Placa" },
          { clave: "ubicacion", titulo: "Estaba en" },
          { clave: "fecha", titulo: "Fecha de baja" },
          { clave: "motivo", titulo: "Motivo" },
          { clave: "acta", titulo: "Acta y/o revisión de técnico" },
          { clave: "fuente", titulo: "Fuente", oculta: true },
          { clave: "costo", titulo: "Costo", alinear: "derecha", oculta: true },
        ]}
        filtros={[{ clave: "ubicacion", titulo: "Estaba en" }, { clave: "fuente", titulo: "Fuente" }]}
        filas={d.activos.map((a) => {
          const acta = d.acta.get(a.id);
          return {
            id: a.id,
            href: `/portal/activos/${a.id}`,
            celdas: {
              bien: [a.tipo_bien, a.marca].filter(Boolean).join(" · "),
              placa: a.placa ?? { vacio: true },
              ubicacion: a.ubicacion && a.ubicacion_id ? { texto: a.ubicacion, color: colorUbicacion(a.ubicacion_id, a.color_ubicacion) } : { vacio: true },
              fecha: fecha(a.fecha_baja),
              motivo: a.motivo_baja ?? { vacio: true },
              acta: acta ? { texto: "Ver acta", href: acta } : { texto: "Sin acta", tono: "ambar" },
              fuente: a.fuente,
              costo: colones(a.costo),
            },
            orden: { fecha: a.fecha_baja, costo: a.costo === null ? null : Number(a.costo) },
            filtros: { ubicacion: a.ubicacion ?? "Sin ubicación", fuente: a.fuente },
          };
        })}
        vacio={<Vacio titulo="No hay activos dados de baja." />}
      />
    </>
  );
}
