import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha, fechaHora, mesLargo } from "@/lib/portal/formato";
import { lineaPorFondo } from "@/lib/portal/planilla";
import { saldosVacaciones } from "@/lib/portal/vacaciones";
import SinPermiso from "../../../_ui/SinPermiso";
import Encabezado from "../../../_ui/Encabezado";
import { Insignia } from "../../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { AjusteLinea, BotonEstado } from "../Formularios";
import { ESTADOS } from "../estados";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Planilla" };

const n = (v: string | number | null) => Number(v ?? 0);

export default async function PlanillaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { consultar, perfil, veSalarios } = await obtenerSesion();
  if (!veSalarios) return <SinPermiso que="la planilla" quien="dirección, contabilidad o auditoría" />;
  const puedeArmar = perfil?.rol === "admin" || perfil?.rol === "contabilidad" || perfil?.rol === "superadmin";
  const d = await consultar(async (tx) => {
    const p = await tx.selectFrom("planillas as p").leftJoin("perfiles as u", "u.id", "p.aprobada_por").select(["p.id", "p.periodo_inicio", "p.periodo_fin", "p.tipo", "p.estado", "p.aprobada_en", "u.nombre as aprobo"]).where("p.id", "=", id).executeTakeFirst();
    if (!p) return null;
    const lineas = await tx.selectFrom("planilla_lineas as l").innerJoin("empleados as e", "e.id", "l.empleado_id").leftJoin("fuentes_financiamiento as f", "f.id", "l.fuente_id")
      .selectAll("l").select(["e.nombre", "e.puesto", "f.codigo as fuente"]).where("l.planilla_id", "=", id).orderBy("f.codigo").orderBy(alfa("e.nombre")).execute();
    const fuentes = await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo"]).execute();
    const vacaciones = (await saldosVacaciones(tx, p.periodo_fin, lineas.map((l) => l.empleado_id))).saldos;
    return { p, lineas, fuentes, vacaciones };
  });
  if (!d) notFound();
  const { p, lineas } = d;
  const titulo = p.tipo === "aguinaldo" ? `Aguinaldo ${p.periodo_fin.slice(0, 4)}` : `Planilla de ${mesLargo(p.periodo_inicio.slice(0, 7))}`;
  const codigo = new Map(d.fuentes.map((f) => [f.id, f.codigo]));
  const porFuente = new Map<string, { neto: number; bruto: number; cargas: number; prov: number }>();
  // Una persona pagada por varios fondos suma a cada fondo su parte.
  for (const l of lineas.flatMap((x) => lineaPorFondo(x))) {
    const k = (l.fuente_reparto ? codigo.get(l.fuente_reparto) : undefined) ?? "Sin fuente";
    const x = porFuente.get(k) ?? { neto: 0, bruto: 0, cargas: 0, prov: 0 };
    x.neto += n(l.salario_neto); x.bruto += n(l.salario_bruto); x.cargas += n(l.cargas_patronales); x.prov += n(l.provision_aguinaldo) + n(l.provision_vacaciones);
    porFuente.set(k, x);
  }
  const borrador = p.estado === "borrador";

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Planilla", href: "/portal/planilla" }, { etiqueta: titulo }]}
        titulo={titulo}
        descripcion={<><Insignia tono={ESTADOS[p.estado][1]}>{ESTADOS[p.estado][0]}</Insignia> {fecha(p.periodo_inicio)} al {fecha(p.periodo_fin)}{p.aprobo && ` · aprobada por ${p.aprobo} el ${fechaHora(p.aprobada_en)}`}</>}
        acciones={
          <>
            <a href={`/portal/reportes/planilla/descargar?id=${p.id}`} className={estiloBoton.secundario}>Descargar Excel por fuente</a>
            {puedeArmar && borrador && <BotonEstado id={p.id} estado="aprobada" />}
            {puedeArmar && p.estado === "aprobada" && <BotonEstado id={p.id} estado="pagada" />}
            {puedeArmar && (borrador || p.estado === "aprobada") && <BotonEstado id={p.id} estado="anulada" />}
          </>
        }
      />
      <section className={`${estiloTarjeta} mb-6`}>
        <h2 className="mb-3 text-xl font-semibold">Totales por fuente de financiamiento</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-base tabular-nums">
            <thead className="text-sm text-slate-500"><tr><th className="text-left">Fuente</th><th>Bruto</th><th>Neto a pagar</th><th>Cargas patronales</th><th>Provisiones</th><th>Costo total</th></tr></thead>
            <tbody>
              {[...porFuente].map(([f, x]) => (
                <tr key={f} className="border-t border-slate-100"><td className="py-2 text-left font-semibold">{f}</td><td>{colones(x.bruto)}</td><td>{colones(x.neto)}</td><td>{colones(x.cargas)}</td><td>{colones(x.prov)}</td><td className="font-semibold">{colones(x.bruto + x.cargas + x.prov)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="space-y-4">
        {lineas.map((l) => {
          const det = l.detalle as { notas?: string[] } | null;
          return (
            <section key={l.empleado_id} className={estiloTarjeta}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{l.nombre}</h3>
                  <p className="text-slate-600">
                    {l.puesto} · {(() => {
                      const partes = lineaPorFondo(l);
                      if (partes.length > 1) return partes.map((x) => `${codigo.get(x.fuente_reparto!) ?? "?"} ${colones(x.salario_neto)}`).join(" + ");
                      return l.fuente ?? <Insignia tono="ambar">Falta fuente</Insignia>;
                    })()}
                    {p.tipo === "mensual" && ` · ${n(l.dias_laborados)} días`}
                    {d.vacaciones.get(l.empleado_id) && ` · ${cantidad(d.vacaciones.get(l.empleado_id)!.saldo)} días de vacaciones disponibles al ${fecha(p.periodo_fin)}`}
                  </p>
                </div>
                <p className="text-right"><span className="text-sm text-slate-500">Neto</span><br /><strong className="text-2xl tabular-nums">{colones(l.salario_neto)}</strong></p>
              </div>
              {p.tipo === "mensual" && (
                <dl className="mt-3 grid gap-x-8 gap-y-1 text-base sm:grid-cols-2 xl:grid-cols-3">
                  {([["Salario base", l.salario_base], ["Rebajo ausencias", l.rebajo_ausencias], ["Rebajo tardías", l.rebajo_tardias], ["Horas extra", l.monto_horas_extra], ["Pago incapacidad/licencia", l.pago_incapacidad_patrono], ["Bruto", l.salario_bruto], ["CCSS obrero", l.ccss_obrero], ["Renta", l.impuesto_renta], ["Otras deducciones", l.otras_deducciones], ["Cargas patronales", l.cargas_patronales], ["Prov. aguinaldo", l.provision_aguinaldo], ["Prov. vacaciones", l.provision_vacaciones]] as const).map(([t, v]) => (
                    <div key={t} className="flex justify-between gap-2 border-b border-slate-100 py-1"><dt className="text-slate-500">{t}</dt><dd className="tabular-nums">{colones(v)}</dd></div>
                  ))}
                </dl>
              )}
              {det?.notas?.length ? <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 px-4 py-2 text-amber-900">{det.notas.map((x) => <li key={x}>{x}</li>)}</ul> : null}
              {puedeArmar && borrador && p.tipo === "mensual" && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium text-sky-700">Ajustar horas extra, tardías o deducciones</summary>
                  <div className="mt-3">
                    <AjusteLinea planillaId={p.id} empleadoId={l.empleado_id} v={{ monto_horas_extra: String(n(l.monto_horas_extra)), rebajo_tardias: String(n(l.rebajo_tardias)), impuesto_renta: String(n(l.impuesto_renta)), otras_deducciones: String(n(l.otras_deducciones)) }} />
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
