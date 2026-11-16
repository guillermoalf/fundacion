import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import FormularioCompra from "./FormularioCompra";

export const metadata: Metadata = { title: "Registrar compra" };

export default async function NuevaCompraPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="el registro de compras" />;
  const c = await consultar(async (tx) => ({
    proveedores: await tx.selectFrom("proveedores").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute(),
    fuentes: await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).where("activo", "=", true).orderBy("id").execute(),
    productos: await tx.selectFrom("productos").select(["id", "nombre", "unidad"]).where("activo", "=", true).orderBy("nombre").execute(),
    ubicaciones: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute(),
    categorias: await tx.selectFrom("categorias_activo").select(["id", "nombre", "tasa_anual"]).where("activa", "=", true).orderBy("nombre").execute(),
  }));
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Compras", href: "/portal/compras" }, { etiqueta: "Registrar" }]}
        titulo="Registrar una compra"
        descripcion={<>Cada línea se marca como consumible (entra al inventario), activo (se crea su ficha) o servicio. ¿Falta un proveedor o producto? Agréguelo en <Link className={estiloBoton.enlace} href="/portal/proveedores">Proveedores</Link> o <Link className={estiloBoton.enlace} href="/portal/inventario/productos">Productos</Link>.</>}
      />
      <div className={estiloTarjeta}>
        <FormularioCompra
          hoy={hoyCR()}
          proveedores={c.proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
          fuentes={c.fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))}
          productos={c.productos}
          ubicaciones={c.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
          categorias={c.categorias.map((x) => ({ valor: x.id, texto: `${x.nombre} (${Number(x.tasa_anual)} %)` }))}
        />
      </div>
    </>
  );
}
