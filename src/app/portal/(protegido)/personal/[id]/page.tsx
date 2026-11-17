import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioEmpleado, FormularioHorario, FormularioPin, FormularioSalario } from "../Formularios";

export const metadata: Metadata = { title: "Persona" };

export default async function EmpleadoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const { guardado } = await searchParams;
  const { consultar, puedeEscribir, veSalarios, editaSalarios } = await obtenerSesion();
  const hoy = hoyCR();
  const d = await consultar(async (tx) => {
    const e = await tx.selectFrom("empleados").selectAll().where("id", "=", id).executeTakeFirst();
    if (!e) return null;
    return {
      e,
      horario: await tx.selectFrom("horarios").select(["dia_semana", "hora_entrada", "hora_salida"]).where("empleado_id", "=", id)
        .where("vigente_desde", "<=", hoy).where((eb) => eb.or([eb("vigente_hasta", "is", null), eb("vigente_hasta", ">=", hoy)])).execute(),
      tienePin: (await sql<{ si: boolean }>`select ${id}::uuid in (select empleados_con_pin()) as si`.execute(tx)).rows[0].si,
      salarios: await tx.selectFrom("salarios").select(["salario_mensual", "vigente_desde", "motivo"]).where("empleado_id", "=", id).orderBy("vigente_desde", "desc").execute(),
      ubicaciones: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy("nombre").execute(),
      fuentes: await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).orderBy("id").execute(),
    };
  });
  if (!d) notFound();
  const { e } = d;
  const actual = Object.fromEntries(d.horario.map((h) => [h.dia_semana, { entrada: h.hora_entrada.slice(0, 5), salida: h.hora_salida.slice(0, 5) }]));

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Personal", href: "/portal/personal" }, { etiqueta: e.nombre }]} titulo={e.nombre} descripcion={e.puesto} />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Cambios guardados.</p>}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className={estiloTarjeta}>
          <h2 className="mb-4 text-xl font-semibold">Datos</h2>
          {e.foto_url && <img src={e.foto_url} alt={`Foto de ${e.nombre}`} className="mb-4 h-28 w-28 rounded-full object-cover" />}
          {puedeEscribir ? (
            <FormularioEmpleado
              v={e}
              ubicaciones={d.ubicaciones.map((u) => ({ valor: u.id, texto: u.nombre }))}
              fuentes={d.fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))}
            />
          ) : (
            <p className="text-slate-600">Solo lectura.</p>
          )}
        </section>
        <div className="space-y-6">
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Horario</h2>
            <p className="mb-4 text-slate-600">Se usa para calcular las llegadas tardías. Deje vacíos los días que no trabaja.</p>
            {puedeEscribir ? <FormularioHorario id={e.id} actual={actual} hoy={hoy} /> : <p>{d.horario.length ? `${d.horario.length} días con horario.` : "Sin horario."}</p>}
          </section>
          {veSalarios && (
            <section className={estiloTarjeta}>
              <h2 className="mb-2 text-xl font-semibold">Salario</h2>
              {d.salarios.length === 0 ? <p className="mb-3 text-amber-800">Falta el salario: sin él no entra en la planilla.</p> : (
                <ul className="mb-4 space-y-1 text-base">
                  {d.salarios.map((s, i) => (
                    <li key={s.vigente_desde} className={i === 0 ? "font-semibold" : "text-slate-500"}>
                      {colones(s.salario_mensual)} desde {fecha(s.vigente_desde)}{s.motivo ? ` · ${s.motivo}` : ""}{i === 0 ? " (actual)" : ""}
                    </li>
                  ))}
                </ul>
              )}
              {editaSalarios && <FormularioSalario id={e.id} hoy={hoy} />}
            </section>
          )}
          {puedeEscribir && e.activo && (
            <section className={estiloTarjeta}>
              <h2 className="mb-2 text-xl font-semibold">PIN para marcar</h2>
              <FormularioPin id={e.id} tiene={d.tienePin} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
