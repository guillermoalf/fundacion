import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones, fecha, hoyCR, mesLargo } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloTarjeta } from "../../_ui/estilos";
import { GenerarAguinaldo, GenerarMensual } from "./Formularios";
import { ESTADOS } from "./estados";

export const metadata: Metadata = { title: "Planilla" };

export default async function PlanillaPage() {
  const { consultar, perfil } = await obtenerSesion();
  const puedeArmar = perfil?.rol === "admin" || perfil?.rol === "contabilidad";
  const hoy = hoyCR();
  const planillas = await consultar((tx) =>
    tx.selectFrom("planillas as p").select(["p.id", "p.periodo_inicio", "p.periodo_fin", "p.tipo", "p.estado",
      sql<string | null>`(select sum(salario_neto) from planilla_lineas l where l.planilla_id = p.id)`.as("neto"),
      sql<number>`(select count(*)::int from planilla_lineas l where l.planilla_id = p.id)`.as("personas")])
      .orderBy("p.periodo_inicio", "desc").execute(),
  );
  const mesAnterior = (() => { const d = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Planilla" }]} titulo="Planilla" descripcion="Se calcula con el salario, las ausencias, las incapacidades y los parámetros vigentes (CCSS, aguinaldo, vacaciones). Se revisa en borrador y luego se aprueba." />
      <div className="space-y-8">
        {puedeArmar && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={estiloTarjeta}><h2 className="mb-3 text-xl font-semibold">Planilla mensual</h2><GenerarMensual mes={mesAnterior} /></section>
            <section className={estiloTarjeta}>
              <h2 className="mb-1 text-xl font-semibold">Aguinaldo</h2>
              <p className="mb-3 text-slate-600">Se paga antes del 20 de diciembre: salarios de diciembre a noviembre ÷ 12, con las planillas aprobadas.</p>
              <GenerarAguinaldo anio={Number(hoy.slice(0, 4))} />
            </section>
          </div>
        )}
        <Tabla
          columnas={[{ clave: "periodo", titulo: "Periodo" }, { clave: "tipo", titulo: "Tipo" }, { clave: "personas", titulo: "Personas", alinear: "derecha" }, { clave: "neto", titulo: "Total neto", alinear: "derecha" }, { clave: "estado", titulo: "Estado" }]}
          filtros={[{ clave: "estado", titulo: "Estado" }, { clave: "tipo", titulo: "Tipo" }]}
          filas={planillas.map((p) => ({
            id: p.id,
            href: `/portal/planilla/${p.id}`,
            celdas: {
              periodo: p.tipo === "aguinaldo" ? `Aguinaldo ${p.periodo_fin.slice(0, 4)}` : p.tipo === "mensual" ? mesLargo(p.periodo_inicio.slice(0, 7)) : `${fecha(p.periodo_inicio)} al ${fecha(p.periodo_fin)}`,
              tipo: p.tipo === "aguinaldo" ? "Aguinaldo" : "Mensual", personas: String(p.personas), neto: colones(p.neto) ?? { vacio: true },
              estado: { texto: ESTADOS[p.estado][0], tono: ESTADOS[p.estado][1] },
            },
            orden: { periodo: p.periodo_inicio, neto: p.neto === null ? null : Number(p.neto) },
            filtros: { estado: ESTADOS[p.estado][0], tipo: p.tipo === "aguinaldo" ? "Aguinaldo" : "Mensual" },
          }))}
          vacio={<Vacio titulo="Todavía no hay planillas.">{puedeArmar ? "Genere la del mes arriba." : "La arma la dirección o contabilidad."}</Vacio>}
        />
      </div>
    </>
  );
}
