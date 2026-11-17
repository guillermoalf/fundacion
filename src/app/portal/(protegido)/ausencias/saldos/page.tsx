import type { Metadata } from "next";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { calcularVacaciones } from "@/lib/calculos/planilla";
import { cantidad, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";

export const metadata: Metadata = { title: "Saldo de vacaciones" };

export default async function SaldosPage() {
  const { consultar } = await obtenerSesion();
  const hoy = hoyCR();
  const { personas, diasAnuales } = await consultar(async (tx) => ({
    personas: await tx.selectFrom("empleados as e").select(["e.id", "e.nombre", "e.fecha_ingreso",
      sql<string>`(select coalesce(sum(dias_habiles), 0) from ausencias a where a.empleado_id = e.id and a.tipo = 'vacaciones')`.as("tomados"),
      sql<number>`(select count(*)::int from ausencias a where a.empleado_id = e.id and a.tipo = 'permiso_sin_goce' and a.hasta - a.desde >= 29)`.as("meses_sin_goce")])
      .where("e.activo", "=", true).orderBy("e.nombre").execute(),
    diasAnuales: (await sql<{ v: string | null }>`select parametro('vacaciones_dias_habiles_anuales', ${hoy}::date) as v`.execute(tx)).rows[0].v,
  }));
  const anuales = diasAnuales === null ? null : Number(diasAnuales);
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Ausencias", href: "/portal/ausencias" }, { etiqueta: "Saldo de vacaciones" }]}
        titulo="Saldo de vacaciones"
        descripcion={anuales === null
          ? "Falta el parámetro de días de vacaciones por año: no se puede calcular el saldo."
          : `Al ${fecha(hoy)}. Se acumulan ${anuales} días hábiles por año trabajado (${cantidad(anuales / 12)} por mes completo), según el Código de Trabajo, art. 153.`}
      />
      <Tabla
        columnas={[{ clave: "nombre", titulo: "Persona" }, { clave: "ingreso", titulo: "Ingreso" }, { clave: "ganados", titulo: "Ganados", alinear: "derecha" }, { clave: "tomados", titulo: "Tomados", alinear: "derecha" }, { clave: "saldo", titulo: "Saldo", alinear: "derecha" }]}
        filas={personas.map((p) => {
          const v = anuales === null ? null : calcularVacaciones({ fechaIngreso: p.fecha_ingreso, corte: hoy, diasHabilesAnuales: anuales, diasTomados: Number(p.tomados), mesesSinGoce: p.meses_sin_goce });
          return {
            id: p.id,
            href: `/portal/personal/${p.id}`,
            celdas: {
              nombre: p.nombre, ingreso: fecha(p.fecha_ingreso)!, ganados: v ? cantidad(v.diasGanados) : null, tomados: cantidad(p.tomados)!,
              saldo: v ? { texto: `${cantidad(v.saldo)} días`, tono: v.saldo < 0 ? "rojo" : v.saldo > 15 ? "ambar" : "verde" } : null,
            },
            orden: { saldo: v?.saldo ?? null },
          };
        })}
      />
      <p className="mt-4 text-sm text-slate-500">Un saldo alto (más de 15 días) conviene programarlo: la ley pide disfrutar las vacaciones. Un saldo negativo indica vacaciones adelantadas.</p>
    </>
  );
}
