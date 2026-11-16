import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioMovimiento } from "../Formularios";

export const metadata: Metadata = { title: "Movimiento de inventario" };

export default async function MovimientoPage({ searchParams }: { searchParams: Promise<{ producto?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const { consultar, puedeEscribir } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="el registro de movimientos de inventario" />;
  const productos = await consultar((tx) =>
    tx.selectFrom("v_saldo_inventario as v").innerJoin("productos as p", "p.id", "v.producto_id").select(["v.producto_id", "v.nombre", "v.unidad", "v.saldo"]).where("p.activo", "=", true).orderBy("v.nombre").execute(),
  );
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Registrar movimiento" }]} titulo="Registrar salida, merma o donación" />
      <div className={`${estiloTarjeta} max-w-3xl`}>
        <FormularioMovimiento
          hoy={hoyCR()}
          tipoInicial={sp.tipo ?? "salida"}
          productoInicial={sp.producto}
          productos={productos.map((p) => ({ valor: p.producto_id!, texto: `${p.nombre} — hay ${cantidad(p.saldo)} ${p.unidad}` }))}
        />
      </div>
    </>
  );
}
