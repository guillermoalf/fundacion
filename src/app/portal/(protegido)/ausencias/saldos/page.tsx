import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { saldosVacaciones } from "@/lib/portal/vacaciones";
import { cantidad, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";

export const metadata: Metadata = { title: "Saldo de vacaciones" };

export default async function SaldosPage() {
  const { consultar } = await obtenerSesion();
  const hoy = hoyCR();
  const { personas, saldos, anuales } = await consultar(async (tx) => {
    const { saldos, diasAnuales } = await saldosVacaciones(tx, hoy);
    return {
      personas: await tx.selectFrom("empleados").select(["id", "nombre", "fecha_ingreso"]).where("activo", "=", true).orderBy("nombre").execute(),
      saldos, anuales: diasAnuales,
    };
  });
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
          const v = saldos.get(p.id) ?? null;
          return {
            id: p.id,
            href: `/portal/personal/${p.id}`,
            celdas: {
              nombre: p.nombre, ingreso: fecha(p.fecha_ingreso)!, ganados: v ? cantidad(v.saldoInicial + v.diasGanados) : null, tomados: v ? cantidad(v.diasTomados) : null,
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
