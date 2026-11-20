import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioAportes, FormularioDatosVacaciones, FormularioEmpleado, FormularioHorario, FormularioPin, FormularioSalario } from "../Formularios";
import { saldosVacaciones } from "@/lib/portal/vacaciones";
import { Insignia } from "../../../_ui/Insignias";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Persona" };

export default async function EmpleadoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const { guardado } = await searchParams;
  const { consultar, puedeEscribir, veSalarios, editaSalarios, esAdmin } = await obtenerSesion();
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
      ubicaciones: await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy(alfa("nombre")).execute(),
      fuentes: await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).orderBy("id").execute(),
      aportes: veSalarios ? await tx.selectFrom("salario_aportes as a").innerJoin("fuentes_financiamiento as f", "f.id", "a.fuente_id")
        .select(["a.vigente_desde", "a.fuente_id", "a.monto", "f.codigo"]).where("a.empleado_id", "=", id).orderBy("a.vigente_desde", "desc").orderBy("a.monto").execute() : [],
      vacaciones: (await saldosVacaciones(tx, hoy, [id])).saldos.get(id) ?? null,
      solicitudes: await tx.selectFrom("solicitudes_vacaciones").select(["id", "desde", "hasta", "dias_habiles", "estado"]).where("empleado_id", "=", id).orderBy("desde", "desc").limit(10).execute(),
      usuarios: esAdmin ? await tx.selectFrom("perfiles").select(["id", "nombre"]).where("activo", "=", true).orderBy(alfa("nombre")).execute() : [],
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
          {veSalarios && (() => {
            const vigente = d.aportes.length ? d.aportes.filter((a) => a.vigente_desde === d.aportes[0].vigente_desde) : [];
            const anteriores = [...new Set(d.aportes.map((a) => a.vigente_desde))].slice(1);
            const salarioActual = d.salarios[0] ? Number(d.salarios[0].salario_mensual) : null;
            return (
              <section className={estiloTarjeta}>
                <h2 className="mb-1 text-xl font-semibold">Fondos que pagan el salario</h2>
                {vigente.length ? (
                  <ul className="mb-3 space-y-1">
                    {vigente.map((a) => <li key={a.fuente_id}><strong>{a.codigo}</strong>: {a.monto === null ? "el resto" : colones(a.monto)}</li>)}
                    <li className="text-sm text-slate-500">Desde {fecha(vigente[0].vigente_desde)}{anteriores.length ? ` · ${anteriores.length} reparto(s) anterior(es) en el historial` : ""}</li>
                  </ul>
                ) : <p className="mb-3 text-slate-600">Todo lo paga {d.fuentes.find((f) => f.id === e.fuente_id)?.codigo ?? "— (falta la fuente)"}. Si lo pagan varios fondos, indíquelo aquí.</p>}
                {editaSalarios && (
                  <details>
                    <summary className="cursor-pointer font-medium text-sky-700">{vigente.length ? "Cambiar el reparto" : "Repartir entre varios fondos"}</summary>
                    <div className="mt-3">
                      <FormularioAportes id={e.id} hoy={hoy} salario={salarioActual} fuentes={d.fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))}
                        actual={vigente.map((a) => ({ fuente_id: String(a.fuente_id), monto: a.monto ?? "", resto: a.monto === null }))} />
                    </div>
                  </details>
                )}
              </section>
            );
          })()}
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Vacaciones</h2>
            {d.vacaciones ? (
              <>
                <p className="text-3xl font-bold">{cantidad(d.vacaciones.saldo)} <span className="text-base font-medium text-slate-600">días disponibles</span></p>
                <p className="mb-3 text-sm text-slate-600">{d.vacaciones.saldoInicial ? `${cantidad(d.vacaciones.saldoInicial)} que traía + ` : ""}{cantidad(d.vacaciones.diasGanados)} ganados − {cantidad(d.vacaciones.diasTomados)} tomados</p>
              </>
            ) : <p className="mb-3 text-amber-800">Falta el parámetro de días de vacaciones por año.</p>}
            {d.solicitudes.length > 0 && (
              <ul className="mb-3 space-y-1 text-base">
                {d.solicitudes.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>{fecha(s.desde)} al {fecha(s.hasta)} · {cantidad(s.dias_habiles)} días</span>
                    <Insignia tono={s.estado === "aprobada" ? "verde" : s.estado === "pendiente" ? "ambar" : s.estado === "rechazada" ? "rojo" : "gris"}>{s.estado}</Insignia>
                  </li>
                ))}
              </ul>
            )}
            {puedeEscribir && (
              <details>
                <summary className="cursor-pointer font-medium text-sky-700">Saldo que traía{esAdmin ? " y usuario del portal" : ""}</summary>
                <div className="mt-3">
                  <FormularioDatosVacaciones id={e.id} v={e} usuarios={d.usuarios.map((u) => ({ valor: u.id, texto: u.nombre }))} conUsuario={esAdmin} />
                </div>
              </details>
            )}
          </section>
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
