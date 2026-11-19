import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, fecha, fechaHora, hoyCR } from "@/lib/portal/formato";
import { saldosVacaciones } from "@/lib/portal/vacaciones";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import { Insignia } from "../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../_ui/estilos";
import { BotonAnular, BotonesResolver, FormularioSolicitud } from "./Formularios";

export const metadata: Metadata = { title: "Vacaciones" };

const ESTADO = { pendiente: ["Pendiente", "ambar"], aprobada: ["Aprobada", "verde"], rechazada: ["Rechazada", "rojo"], anulada: ["Anulada", "gris"] } as const;
type Estado = keyof typeof ESTADO;

export default async function VacacionesPage() {
  const { consultar, esAdmin, puedeEscribir, esPersonal } = await obtenerSesion();
  const hoy = hoyCR();
  const d = await consultar(async (tx) => {
    const mio = (await sql<{ id: string | null }>`select mi_empleado() as id`.execute(tx)).rows[0].id;
    const solicitudes = await tx.selectFrom("solicitudes_vacaciones as s").innerJoin("empleados as e", "e.id", "s.empleado_id").leftJoin("perfiles as r", "r.id", "s.resuelta_por")
      .select(["s.id", "s.empleado_id", "s.desde", "s.hasta", "s.dias_habiles", "s.nota", "s.estado", "s.creada_en", "s.respuesta", "s.resuelta_en", "e.nombre", "r.nombre as resolvio"])
      .orderBy("s.creada_en", "desc").execute();
    const ve = !esPersonal;
    const personas = ve && puedeEscribir ? await tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).orderBy("nombre").execute() : [];
    const { saldos, diasAnuales } = await saldosVacaciones(tx, hoy);
    return { mio, solicitudes, personas, saldos, diasAnuales };
  });
  const miSaldo = d.mio ? d.saldos.get(d.mio) ?? null : null;
  const mias = d.solicitudes.filter((s) => s.empleado_id === d.mio);
  const pendientes = d.solicitudes.filter((s) => s.estado === "pendiente");

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Vacaciones" }]}
        titulo="Vacaciones"
        descripcion={d.diasAnuales === null ? "Falta el parámetro de días de vacaciones por año." : `Se ganan ${d.diasAnuales} días hábiles por año trabajado (${cantidad(d.diasAnuales / 12)} por mes completo).`}
        acciones={!esPersonal && <Link href="/portal/ausencias/saldos" className={estiloBoton.secundario}>Saldo de todo el personal</Link>}
      />
      <div className="space-y-6">
        {d.mio ? (
          <section className={`${estiloTarjeta} grid gap-6 lg:grid-cols-[1fr_2fr]`}>
            <div>
              <h2 className="text-xl font-semibold">Mis vacaciones</h2>
              {miSaldo ? (
                <>
                  <p className="mt-2 text-4xl font-bold">{cantidad(miSaldo.saldo)} <span className="text-lg font-medium text-slate-600">días disponibles</span></p>
                  <p className="mt-1 text-sm text-slate-600">
                    {miSaldo.saldoInicial ? `${cantidad(miSaldo.saldoInicial)} que traía + ` : ""}{cantidad(miSaldo.diasGanados)} ganados − {cantidad(miSaldo.diasTomados)} tomados
                  </p>
                </>
              ) : <p className="mt-2 text-slate-600">No se pudo calcular su saldo.</p>}
              <ul className="mt-4 space-y-2">
                {mias.map((s) => (
                  <li key={s.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{fecha(s.desde)} al {fecha(s.hasta)} · {cantidad(s.dias_habiles)} días</span>
                      <Insignia tono={ESTADO[s.estado as Estado][1]}>{ESTADO[s.estado as Estado][0]}</Insignia>
                    </div>
                    {s.respuesta && <p className="mt-1 text-sm text-slate-600">Respuesta: {s.respuesta}</p>}
                    {s.estado === "pendiente" && <div className="mt-1"><BotonAnular id={s.id} /></div>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-semibold">Solicitar vacaciones</h3>
              <FormularioSolicitud hoy={hoy} disponibles={miSaldo?.saldo ?? null} />
            </div>
          </section>
        ) : esPersonal ? (
          <p className={estiloTarjeta}>Su usuario todavía no está ligado a su ficha de Personal. Pídale a la dirección que lo ligue para ver sus días y solicitar vacaciones.</p>
        ) : null}

        {!esPersonal && (
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Solicitudes pendientes ({pendientes.length})</h2>
            {!esAdmin && <p className="mb-3 text-sm text-slate-500">Las aprueba o rechaza la dirección.</p>}
            {pendientes.length === 0 ? <p className="text-slate-600">No hay solicitudes por revisar.</p> : (
              <ul className="divide-y divide-slate-100">
                {pendientes.map((s) => {
                  const saldo = d.saldos.get(s.empleado_id)?.saldo ?? null;
                  const dias = Number(s.dias_habiles);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-lg font-semibold"><Link className={estiloBoton.enlace} href={`/portal/personal/${s.empleado_id}`}>{s.nombre}</Link></p>
                        <p>{fecha(s.desde)} al {fecha(s.hasta)} · <strong>{cantidad(dias)} días</strong> · tiene {saldo === null ? "—" : cantidad(saldo)} disponibles
                          {saldo !== null && dias > saldo && <span className="ml-2"><Insignia tono="ambar">Pide más de lo disponible</Insignia></span>}</p>
                        {s.nota && <p className="text-sm text-slate-600">«{s.nota}»</p>}
                        <p className="text-sm text-slate-500">Solicitada {fechaHora(s.creada_en)}</p>
                      </div>
                      {esAdmin && <BotonesResolver id={s.id} nombre={s.nombre} dias={dias} disponibles={saldo} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {!esPersonal && puedeEscribir && (
          <details className={estiloTarjeta}>
            <summary className="cursor-pointer text-lg font-semibold text-sky-700">+ Registrar una solicitud a nombre de alguien</summary>
            <div className="mt-4">
              <FormularioSolicitud hoy={hoy} personas={d.personas.map((p) => ({ valor: p.id, texto: p.nombre }))} />
            </div>
          </details>
        )}

        {!esPersonal && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Todas las solicitudes</h2>
            <Tabla
              id="vacaciones-solicitudes"
              columnas={[
                { clave: "nombre", titulo: "Persona" }, { clave: "fechas", titulo: "Fechas" }, { clave: "dias", titulo: "Días", alinear: "derecha" },
                { clave: "estado", titulo: "Estado" }, { clave: "resolvio", titulo: "Resolvió", ocultarEnMovil: true },
                { clave: "respuesta", titulo: "Respuesta", oculta: true }, { clave: "nota", titulo: "Nota", oculta: true }, { clave: "creada", titulo: "Solicitada", oculta: true },
              ]}
              filtros={[{ clave: "estado", titulo: "Estado" }, { clave: "nombre", titulo: "Persona" }]}
              filas={d.solicitudes.map((s) => ({
                id: s.id,
                href: `/portal/personal/${s.empleado_id}`,
                celdas: {
                  nombre: s.nombre, fechas: `${fecha(s.desde)} al ${fecha(s.hasta)}`, dias: cantidad(s.dias_habiles),
                  estado: { texto: ESTADO[s.estado as Estado][0], tono: ESTADO[s.estado as Estado][1] },
                  resolvio: s.resolvio ? `${s.resolvio} · ${fechaHora(s.resuelta_en) ?? ""}` : { vacio: true },
                  respuesta: s.respuesta ?? { vacio: true }, nota: s.nota ?? { vacio: true }, creada: fechaHora(s.creada_en)!,
                },
                orden: { fechas: s.desde, dias: Number(s.dias_habiles) },
                filtros: { estado: ESTADO[s.estado as Estado][0], nombre: s.nombre },
              }))}
            />
          </section>
        )}
      </div>
    </>
  );
}
