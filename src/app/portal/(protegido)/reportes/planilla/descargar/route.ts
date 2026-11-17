import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { generarPlanillaPorFuente } from "@/lib/export/planillaPorFuente";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { fecha } from "@/lib/portal/formato";

/** Planilla en Excel agrupada por fuente. Ruta sin punto (la protege el middleware) y con revisión de sesión. */
export async function GET(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar la planilla.", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Planilla no encontrada.", { status: 404 });
  const d = await conUsuario(usuario.id, async (tx) => {
    const p = await tx.selectFrom("planillas").selectAll().where("id", "=", id).executeTakeFirst();
    if (!p) return null;
    const lineas = await tx.selectFrom("planilla_lineas as l").innerJoin("empleados as e", "e.id", "l.empleado_id").leftJoin("fuentes_financiamiento as f", "f.id", "l.fuente_id")
      .selectAll("l").select(["e.nombre", "e.cedula", "e.puesto", "f.codigo as fuente"]).where("l.planilla_id", "=", id).orderBy("e.nombre").execute();
    return { p, lineas };
  });
  if (!d) return new Response("Planilla no encontrada o sin permiso.", { status: 404 });
  const n = (v: string | number | null) => Number(v ?? 0);
  const buf = await generarPlanillaPorFuente({
    titulo: d.p.tipo === "aguinaldo" ? "Planilla de aguinaldo" : "Planilla mensual",
    periodo: `${fecha(d.p.periodo_inicio)} al ${fecha(d.p.periodo_fin)}`,
    estado: d.p.estado,
    lineas: d.lineas.map((l) => ({
      fuente: l.fuente ?? "Sin fuente", nombre: l.nombre, cedula: l.cedula, puesto: l.puesto, dias: n(l.dias_laborados), base: n(l.salario_base),
      rebajos: n(l.rebajo_ausencias) + n(l.rebajo_tardias), extras: n(l.monto_horas_extra), incapacidad: n(l.pago_incapacidad_patrono), bruto: n(l.salario_bruto),
      ccss: n(l.ccss_obrero), renta: n(l.impuesto_renta), otras: n(l.otras_deducciones), neto: n(l.salario_neto), cargas: n(l.cargas_patronales),
      provAguinaldo: n(l.provision_aguinaldo), provVacaciones: n(l.provision_vacaciones),
    })),
  });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="Planilla_${d.p.tipo}_${d.p.periodo_inicio.slice(0, 7)}.xlsx"`, "Cache-Control": "no-store" },
  });
}
