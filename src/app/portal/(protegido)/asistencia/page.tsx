import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, fechaHora, hoyCR, partesCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../_ui/estilos";
import FormularioMarca from "./FormularioMarca";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Asistencia" };
const ORIGEN = { kiosko: ["Kiosko", "verde"], hoja_firmada: ["Hoja firmada", "azul"], manual: ["Manual", "ambar"] } as const;

export default async function AsistenciaPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const sp = await searchParams;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : hoyCR();
  const { consultar, puedeEscribir, esAdmin } = await obtenerSesion();
  const { marcas, personal } = await consultar(async (tx) => ({
    marcas: await tx.selectFrom("marcas as m").innerJoin("empleados as e", "e.id", "m.empleado_id").leftJoin("perfiles as p", "p.id", "m.registrado_por")
      .select(["m.id", "m.tipo", "m.marcado_en", "m.origen", "m.motivo_manual", "m.documento_url", "e.nombre", "p.nombre as quien"])
      .where(sql<boolean>`(m.marcado_en at time zone 'America/Costa_Rica')::date = ${dia}::date`).orderBy("m.marcado_en").execute(),
    personal: await tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute(),
  }));
  const p = partesCR();
  const ahora = `${p.ymd}T${p.hhmm}`;

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Asistencia" }]}
        titulo="Asistencia"
        descripcion={`Marcas del ${fecha(dia)}. Las del kiosko llegan solas; las de la hoja en papel se digitan abajo.`}
        acciones={
          <>
            <Link href="/portal/asistencia/resumen" className={estiloBoton.secundario}>Tardías y horas del mes</Link>
            {esAdmin && <Link href="/portal/kiosko" className={estiloBoton.secundario}>Tablets del kiosko</Link>}
          </>
        }
      />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Día</span><input type="date" name="dia" defaultValue={dia} className={estiloInput} /></label>
        <button type="submit" className={estiloBoton.secundario}>Ver</button>
      </form>
      <div className="space-y-8">
        <Tabla
          columnas={[{ clave: "hora", titulo: "Hora" }, { clave: "persona", titulo: "Persona" }, { clave: "tipo", titulo: "Tipo" }, { clave: "origen", titulo: "Cómo" }, { clave: "detalle", titulo: "Detalle", ocultarEnMovil: true }]}
          filtros={[{ clave: "persona", titulo: "Persona" }, { clave: "origen", titulo: "Cómo" }]}
          filas={marcas.map((m) => ({
            id: m.id,
            celdas: {
              hora: fechaHora(m.marcado_en)!.slice(-5), persona: m.nombre, tipo: { texto: m.tipo === "entrada" ? "Entrada" : "Salida", tono: m.tipo === "entrada" ? "verde" : "azul" },
              origen: { texto: ORIGEN[m.origen][0], tono: ORIGEN[m.origen][1] },
              detalle: m.origen === "kiosko" ? { vacio: true } : m.documento_url ? { texto: `${m.motivo_manual} (ver hoja)`, href: m.documento_url } : `${m.motivo_manual ?? ""} · digitó ${m.quien ?? "—"}`,
            },
            filtros: { persona: m.nombre, origen: ORIGEN[m.origen][0] },
          }))}
          vacio={<Vacio titulo="No hay marcas este día." />}
        />
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Digitar una marca de la hoja en papel</h2>
            <p className="mb-4 text-slate-600">Una marca no se edita ni se borra: si hubo un error, registre otra con el motivo.</p>
            <FormularioMarca ahora={ahora} personal={personal.map((e) => ({ valor: e.id, texto: e.nombre }))} />
          </section>
        )}
      </div>
    </>
  );
}
