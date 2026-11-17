import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { conDepreciacion, consultaActivos } from "@/lib/portal/activos";
import { cantidad, colones, hoyCR } from "@/lib/portal/formato";

/** Almacenamiento del plan gratis de Neon (1 GB por proyecto). Si se cambia de plan, actualizar aquí. */
const LIMITE_MB = 1024;
import Encabezado from "../_ui/Encabezado";
import { estiloBoton } from "../_ui/estilos";
import { TIPOS_AUSENCIA } from "./ausencias/tipos";

function Tarjeta({ titulo, valor, detalle, href, tono = "normal" }: { titulo: string; valor: string; detalle?: string; href: string; tono?: "normal" | "aviso" }) {
  return (
    <Link href={href} className={`block rounded-2xl border bg-white p-5 shadow-sm transition hover:border-sky-300 ${tono === "aviso" ? "border-amber-300" : "border-slate-200"}`}>
      <p className="text-base text-slate-600">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${tono === "aviso" ? "text-amber-800" : ""}`}>{valor}</p>
      {detalle && <p className="mt-1 text-sm text-slate-500">{detalle}</p>}
    </Link>
  );
}

export default async function PortalInicio() {
  const { perfil, consultar, puedeEscribir, esAdmin } = await obtenerSesion();
  const hoy = hoyCR();
  const d = await consultar(async (tx) => {
    const activos = (await consultaActivos(tx).where("a.estado", "<>", "dado_de_baja").execute()).map((a) => conDepreciacion(a, hoy));
    const [pendientes, saldos, ausentes, marcasHoy, borradores] = await Promise.all([
      tx.selectFrom("v_activos_alertas").select(({ fn }) => [fn.count<number>("activo_id").distinct().as("n")]).executeTakeFirstOrThrow(),
      tx.selectFrom("v_saldo_inventario as v").innerJoin("productos as p", "p.id", "v.producto_id").select(["v.nombre", "v.saldo", "v.stock_minimo"]).where("p.activo", "=", true).execute(),
      tx.selectFrom("ausencias as a").innerJoin("empleados as e", "e.id", "a.empleado_id").select(["e.nombre", "a.tipo"]).where("a.desde", "<=", hoy).where("a.hasta", ">=", hoy).execute(),
      tx.selectFrom("marcas").select(({ fn }) => [fn.count<number>("empleado_id").distinct().as("n")])
        .where(sql<boolean>`(marcado_en at time zone 'America/Costa_Rica')::date = ${hoy}::date`).executeTakeFirstOrThrow(),
      tx.selectFrom("planillas").select("id").where("estado", "=", "borrador").execute(),
    ]);
    const espacio = esAdmin ? (await sql<{ base_bytes: string; archivos_bytes: string; archivos: number }>`select * from espacio_usado()`.execute(tx)).rows[0] : null;
    return { activos, pendientes: Number(pendientes.n), saldos, ausentes, marcasHoy: Number(marcasHoy.n), borradores: borradores.length, espacio };
  });
  const libros = d.activos.reduce((s, a) => s + (a.valorLibros ?? 0), 0);
  const sinValor = d.activos.filter((a) => a.valorLibros === null).length;
  const bajos = d.saldos.filter((s) => Number(s.stock_minimo) > 0 && Number(s.saldo) < Number(s.stock_minimo));

  return (
    <>
      <Encabezado titulo={`Hola, ${perfil?.nombre.split(" ")[0] ?? ""}`} descripcion="Resumen de hoy en la Fundación Creciendo Feliz." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta titulo="Activos en uso" valor={String(d.activos.length)} href="/portal/activos" />
        <Tarjeta titulo="Valor en libros hoy" valor={colones(libros)!} detalle={sinValor ? `Sin contar ${sinValor} activos a los que les faltan datos` : undefined} href="/portal/reportes" />
        <Tarjeta titulo="Activos con pendientes" valor={String(d.pendientes)} detalle="Placa, fecha, costo, categoría o factura" href="/portal/pendientes" tono={d.pendientes ? "aviso" : "normal"} />
        <Tarjeta titulo="Productos bajo el mínimo" valor={String(bajos.length)} detalle={bajos.slice(0, 3).map((b) => b.nombre).join(", ") || undefined} href="/portal/inventario" tono={bajos.length ? "aviso" : "normal"} />
        <Tarjeta titulo="Personas que marcaron hoy" valor={String(d.marcasHoy)} href="/portal/asistencia" />
        <Tarjeta titulo="Ausentes hoy" valor={String(d.ausentes.length)} detalle={d.ausentes.map((a) => `${a.nombre.split(" ")[0]} (${TIPOS_AUSENCIA[a.tipo].toLowerCase()})`).join(", ") || undefined} href="/portal/ausencias" />
        {d.espacio && (() => {
          const mb = (b: string | number) => Number(b) / 1024 / 1024;
          const usado = mb(d.espacio.base_bytes);
          const pct = Math.round((usado / LIMITE_MB) * 100);
          return (
            <Tarjeta
              titulo="Espacio usado"
              valor={`${cantidad(Math.round(usado))} MB de ${cantidad(LIMITE_MB)} MB`}
              detalle={`${pct} % del plan gratis de Neon · ${d.espacio.archivos} fotos y PDF ocupan ${cantidad(Math.round(mb(d.espacio.archivos_bytes) * 10) / 10)} MB`}
              href="/portal"
              tono={pct >= 80 ? "aviso" : "normal"}
            />
          );
        })()}
        {d.borradores > 0 && <Tarjeta titulo="Planillas en borrador" valor={String(d.borradores)} detalle="Revisar y aprobar" href="/portal/planilla" tono="aviso" />}
      </div>
      {puedeEscribir && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Accesos rápidos</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/portal/compras/nueva" className={estiloBoton.primario}>Registrar una compra</Link>
            <Link href="/portal/inventario/movimiento" className={estiloBoton.secundario}>Entrega o merma de inventario</Link>
            <Link href="/portal/activos/nuevo" className={estiloBoton.secundario}>Nuevo activo</Link>
            <Link href="/portal/ausencias" className={estiloBoton.secundario}>Registrar ausencia</Link>
            <Link href="/portal/asistencia" className={estiloBoton.secundario}>Asistencia de hoy</Link>
            <Link href="/portal/conteos" className={estiloBoton.secundario}>Conteo físico</Link>
            <Link href="/portal/reportes" className={estiloBoton.secundario}>Reportes</Link>
          </div>
        </section>
      )}
    </>
  );
}
