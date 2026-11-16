import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import Importador from "./Importador";

export const metadata: Metadata = { title: "Importar activos" };

export default async function ImportarPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="la importación de activos" />;
  const fuentes = await consultar((tx) => tx.selectFrom("fuentes_financiamiento").select(["codigo", "nombre"]).where("activo", "=", true).orderBy("id").execute());
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: "Importar Excel" }]}
        titulo="Importar el Excel de activos"
        descripcion="Suba el Excel que ya usa la fundación. Primero verá cómo quedaría cada activo; no se guarda nada hasta que confirme."
      />
      <div className={estiloTarjeta}>
        <Importador fuentes={fuentes.map((f) => ({ valor: f.codigo, texto: `${f.codigo} · ${f.nombre}` }))} />
      </div>
    </>
  );
}
