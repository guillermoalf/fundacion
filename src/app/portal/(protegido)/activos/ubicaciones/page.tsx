import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { alfa } from "@/lib/db/orden";
import { colorUbicacion } from "@/lib/portal/ubicaciones";
import Encabezado from "../../../_ui/Encabezado";
import { Etiqueta } from "../../../_ui/Tabla";
import { estiloTarjeta } from "../../../_ui/estilos";
import { ColorUbicacion, NuevaUbicacion } from "./Formularios";

export const metadata: Metadata = { title: "Ubicaciones" };

export default async function UbicacionesPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const ubicaciones = await consultar((tx) => tx.selectFrom("ubicaciones").select(["id", "nombre", "color", "activo"]).where("activo", "=", true).orderBy(alfa("nombre")).execute());

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: "Ubicaciones" }]} titulo="Ubicaciones" />
      <ul className="space-y-3">
        {ubicaciones.map((u) => {
          const color = colorUbicacion(u.id, u.color);
          return (
            <li key={u.id} className={`${estiloTarjeta} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <Etiqueta color={color}>{u.nombre}</Etiqueta>
              {puedeEscribir && <ColorUbicacion id={u.id} actual={color} />}
            </li>
          );
        })}
      </ul>
      {puedeEscribir && <section className={`${estiloTarjeta} mt-6`}><NuevaUbicacion /></section>}
    </>
  );
}
