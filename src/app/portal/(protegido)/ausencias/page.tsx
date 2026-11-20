import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton, estiloTarjeta } from "../../_ui/estilos";
import FormularioAusencia from "./FormularioAusencia";
import { CON_BOLETA, TIPOS_AUSENCIA } from "./tipos";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Ausencias" };

export default async function AusenciasPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const { ausencias, personal } = await consultar(async (tx) => ({
    ausencias: await tx.selectFrom("ausencias as a").innerJoin("empleados as e", "e.id", "a.empleado_id")
      .select(["a.id", "a.tipo", "a.desde", "a.hasta", "a.dias_habiles", "a.numero_boleta", "a.documento_url", "e.nombre"]).orderBy("a.desde", "desc").execute(),
    personal: await tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute(),
  }));
  const hoyAusentes = ausencias.filter((a) => a.desde <= hoy && a.hasta >= hoy);
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Ausencias" }]}
        titulo="Ausencias"
        descripcion="Vacaciones, incapacidades, licencias y permisos, cada uno con su respaldo."
        acciones={<Link href="/portal/ausencias/saldos" className={estiloBoton.secundario}>Saldo de vacaciones</Link>}
      />
      {hoyAusentes.length > 0 && (
        <p className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sky-900">Hoy no están: {hoyAusentes.map((a) => `${a.nombre} (${TIPOS_AUSENCIA[a.tipo].toLowerCase()})`).join(", ")}.</p>
      )}
      <div className="space-y-8">
        <Tabla
          columnas={[
            { clave: "persona", titulo: "Persona" }, { clave: "tipo", titulo: "Tipo" }, { clave: "fechas", titulo: "Fechas" },
            { clave: "dias", titulo: "Días hábiles", alinear: "derecha" }, { clave: "respaldo", titulo: "Respaldo" },
          ]}
          filtros={[{ clave: "persona", titulo: "Persona" }, { clave: "tipo", titulo: "Tipo" }, { clave: "anio", titulo: "Año" }]}
          filas={ausencias.map((a) => ({
            id: a.id,
            celdas: {
              persona: a.nombre, tipo: TIPOS_AUSENCIA[a.tipo],
              fechas: a.desde === a.hasta ? fecha(a.desde)! : `${fecha(a.desde)} al ${fecha(a.hasta)}`,
              dias: cantidad(a.dias_habiles)!,
              respaldo: a.documento_url ? { texto: a.numero_boleta ? `Boleta ${a.numero_boleta}` : "Ver documento", href: a.documento_url } : CON_BOLETA.includes(a.tipo) ? null : { vacio: true },
            },
            orden: { fechas: a.desde, dias: Number(a.dias_habiles) },
            filtros: { persona: a.nombre, tipo: TIPOS_AUSENCIA[a.tipo], anio: a.desde.slice(0, 4) },
          }))}
          vacio={<Vacio titulo="No hay ausencias registradas." />}
        />
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Registrar una ausencia</h2>
            <FormularioAusencia hoy={hoy} personal={personal.map((p) => ({ valor: p.id, texto: p.nombre }))} />
          </section>
        )}
      </div>
    </>
  );
}
