import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { leerRegistro } from "@/lib/portal/correcciones";
import { mensajeError } from "@/lib/portal/acciones";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import Vacio from "../../_ui/Vacio";
import { estiloBoton, estiloTarjeta } from "../../_ui/estilos";
import FormularioCorreccion from "./Formulario";

export const metadata: Metadata = { title: "Corregir registro" };

const comoTexto = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default async function CorregirPage({ searchParams }: { searchParams: Promise<{ tabla?: string; clave?: string }> }) {
  const sp = await searchParams;
  const { consultar, esSuperadmin } = await obtenerSesion();
  if (!esSuperadmin) return <SinPermiso que="las correcciones" quien="el superadministrador" />;
  let clave: Record<string, unknown> = {};
  try { clave = JSON.parse(sp.clave ?? "{}"); } catch { /* clave inválida: se informa abajo */ }
  let datos: Awaited<ReturnType<typeof leerRegistro>> | null = null;
  let error: string | null = null;
  try {
    datos = await consultar((tx) => leerRegistro(tx, sp.tabla ?? "", clave));
  } catch (e) {
    error = mensajeError(e);
  }
  const volver = <Link href="/portal/bitacora" className={estiloBoton.secundario}>Volver a la bitácora</Link>;
  if (error || !datos?.fila) return <Vacio titulo="No se encontró el registro." accion={volver}>{error}</Vacio>;

  const fila = datos.fila;
  const campos = datos.columnas
    .filter((c) => c.tipo !== "bytea")
    .map((c) => {
      const valor = comoTexto(fila[c.nombre]);
      return { nombre: c.nombre, tipo: c.tipo, valor, soloLectura: c.esLlave || c.generada, largo: valor.length > 60 || c.tipo.includes("json") };
    });

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Bitácora", href: "/portal/bitacora" }, { etiqueta: "Corregir" }]}
        titulo={`Corregir: ${datos.tabla.replace(/_/g, " ")}`}
        descripcion="Puede cambiar cualquier dato, aunque el registro esté cerrado o aprobado. No se borra nada: el antes, el después, su nombre y el motivo quedan en la bitácora."
        acciones={<Link href={`/portal/bitacora?registro=${encodeURIComponent(String(fila.id ?? ""))}`} className={estiloBoton.secundario}>Historial de este registro</Link>}
      />
      <section className={estiloTarjeta}>
        <FormularioCorreccion tabla={datos.tabla} clave={JSON.stringify(Object.fromEntries(datos.llave.map((k) => [k, fila[k]])))} campos={campos} />
      </section>
    </>
  );
}
