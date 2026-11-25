import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { obtenerSesion, type Rol } from "@/lib/portal/sesion";
import { hoyCR } from "@/lib/portal/formato";
import { notificaciones, type Notificacion } from "@/lib/portal/notificaciones";
import { estiloBoton, estiloTarjeta } from "../_ui/estilos";
import { TIPOS_AUSENCIA } from "./ausencias/tipos";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Accesos rápidos según el rol: solo lo que esa persona usa a diario. */
const ACCESOS: Record<Exclude<Rol, "personal">, { href: string; texto: string }[]> = {
  superadmin: [{ href: "/portal/ninos/lista", texto: "Pasar lista" }, { href: "/portal/compras/nueva", texto: "Registrar compra" }, { href: "/portal/ausencias", texto: "Registrar ausencia" }, { href: "/portal/reportes", texto: "Reportes" }],
  admin: [{ href: "/portal/ninos/lista", texto: "Pasar lista" }, { href: "/portal/compras/nueva", texto: "Registrar compra" }, { href: "/portal/ausencias", texto: "Registrar ausencia" }, { href: "/portal/reportes", texto: "Reportes" }],
  coordinacion: [{ href: "/portal/ninos/lista", texto: "Pasar lista" }, { href: "/portal/compras/nueva", texto: "Registrar compra" }, { href: "/portal/inventario/movimiento", texto: "Entrega de inventario" }, { href: "/portal/ausencias", texto: "Registrar ausencia" }],
  contabilidad: [{ href: "/portal/compras/nueva", texto: "Registrar compra" }, { href: "/portal/planilla", texto: "Planilla" }, { href: "/portal/reportes", texto: "Reportes" }],
  auditor: [{ href: "/portal/reportes", texto: "Reportes" }, { href: "/portal/activos", texto: "Activos" }, { href: "/portal/bitacora", texto: "Bitácora" }],
};

function Bloque({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: { href: string; texto: string } }) {
  return (
    <section className={`${estiloTarjeta} flex flex-col`}>
      <h2 className="text-lg font-semibold text-slate-700">{titulo}</h2>
      <div className="mt-3 flex-1">{children}</div>
      {accion && <Link href={accion.href} className={`${estiloBoton.primario} mt-5 self-start`}>{accion.texto}</Link>}
    </section>
  );
}

function Barra({ valor, total }: { valor: number; total: number }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function PortalInicio() {
  const { perfil, consultar, puedeEscribir, esPersonal, veNinos, veNotasNinos, esAdmin } = await obtenerSesion();
  // El personal (maestras, cuidadoras) solo pasa lista: entra directo a esa pantalla.
  if (esPersonal || !perfil) redirect("/portal/ninos/lista");
  const hoy = hoyCR();

  const d = await consultar(async (tx) => {
    const [avisos, empleados, marcas, ausentes, pendientesActivos, sinUbicacion, borradores] = await Promise.all([
      notificaciones(tx, { veNotasNinos, esAdmin, esPersonal }),
      tx.selectFrom("empleados").select(["id", "nombre"]).where("activo", "=", true).execute(),
      tx.selectFrom("marcas").select("empleado_id").distinct()
        .where(sql<boolean>`(marcado_en at time zone 'America/Costa_Rica')::date = ${hoy}::date`).execute(),
      tx.selectFrom("ausencias as a").innerJoin("empleados as e", "e.id", "a.empleado_id").select(["e.id", "e.nombre", "a.tipo"])
        .where("a.desde", "<=", hoy).where("a.hasta", ">=", hoy).execute(),
      puedeEscribir ? tx.selectFrom("v_activos_alertas").select(({ fn }) => fn.count<number>("activo_id").distinct().as("n")).executeTakeFirstOrThrow() : null,
      puedeEscribir ? tx.selectFrom("activos").select(({ fn }) => fn.countAll<number>().as("n")).where("ubicacion_id", "is", null).where("estado", "<>", "dado_de_baja").executeTakeFirstOrThrow() : null,
      tx.selectFrom("planillas").select(({ fn }) => fn.countAll<number>().as("n")).where("estado", "=", "borrador").executeTakeFirstOrThrow(),
    ]);
    const ninos = veNinos
      ? await tx.selectFrom("ninos as n").leftJoin("asistencia_ninos as a", (j) => j.onRef("a.nino_id", "=", "n.id").on("a.fecha", "=", hoy))
        .select(["a.estado"]).where("n.estado", "=", "activo").where("n.fecha_ingreso", "<=", hoy).execute()
      : null;
    return { avisos, empleados, marcas, ausentes, ninos, pendientesActivos: Number(pendientesActivos?.n ?? 0), sinUbicacion: Number(sinUbicacion?.n ?? 0), borradores: Number(borradores.n) };
  });

  // «Por hacer»: lo urgente primero (rojo), luego lo demás.
  const porHacer: Notificacion[] = [...d.avisos];
  if (d.borradores) porHacer.push({ clave: "planilla", tono: "ambar", href: "/portal/planilla", cantidad: d.borradores, titulo: "Planilla en borrador", detalle: "Revisarla y aprobarla" });
  if (d.sinUbicacion) porHacer.push({ clave: "ubicacion", tono: "ambar", href: "/portal/pendientes?tipo=Sin%20ubicaci%C3%B3n", cantidad: d.sinUbicacion, titulo: "Activos sin ubicación", detalle: "Asignar dónde están para el conteo y los reportes" });
  if (d.pendientesActivos) porHacer.push({ clave: "activos", tono: "ambar", href: "/portal/pendientes", cantidad: d.pendientesActivos, titulo: "Activos con datos por completar", detalle: "Placa, fecha, costo, categoría o factura" });
  porHacer.sort((a, b) => (a.tono === b.tono ? 0 : a.tono === "rojo" ? -1 : 1));

  const marcaron = new Set(d.marcas.map((m) => m.empleado_id));
  const ausentes = new Set(d.ausentes.map((a) => a.id));
  const faltan = d.empleados.filter((e) => !marcaron.has(e.id) && !ausentes.has(e.id));
  const corto = (n: string) => n.split(" ").slice(0, 2).join(" ");
  const fechaHoy = new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Costa_Rica" }).format(new Date()).replace(/^./, (c) => c.toUpperCase());

  return (
    <>
      <header className="mb-6">
        <p className="text-base text-slate-500">{fechaHoy}</p>
        <h1 className="text-3xl font-bold">Hola, {perfil.nombre.split(" ")[0]}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {d.ninos && d.ninos.length > 0 && (() => {
            const marcados = d.ninos.filter((n) => n.estado).length;
            const llegaron = d.ninos.filter((n) => n.estado === "presente").length;
            return (
              <Bloque titulo="Niños hoy" accion={{ href: "/portal/ninos/lista", texto: marcados === d.ninos.length ? "Ver la lista" : "Pasar lista" }}>
                <p className="text-3xl font-bold">{marcados} <span className="text-xl font-medium text-slate-500">de {d.ninos.length} marcados</span></p>
                <Barra valor={marcados} total={d.ninos.length} />
                <p className="mt-2 text-base text-slate-600">
                  {marcados === 0 ? "Todavía no se ha pasado lista hoy." : `${plural(llegaron, "llegó", "llegaron")} · ${d.ninos.length - marcados} sin marcar`}
                </p>
              </Bloque>
            );
          })()}

          {d.empleados.length > 0 && (
            <Bloque titulo="Personal hoy" accion={{ href: "/portal/asistencia", texto: "Ver asistencia" }}>
              <p className="text-3xl font-bold">{marcaron.size} <span className="text-xl font-medium text-slate-500">de {d.empleados.length} marcaron</span></p>
              <dl className="mt-3 space-y-2 text-base">
                {d.ausentes.length > 0 && (
                  <div>
                    <dt className="font-medium text-slate-700">Ausentes</dt>
                    <dd className="text-slate-600">{d.ausentes.map((a) => `${corto(a.nombre)} (${TIPOS_AUSENCIA[a.tipo].toLowerCase()})`).join(", ")}</dd>
                  </div>
                )}
                {faltan.length > 0 && (
                  <div>
                    <dt className="font-medium text-slate-700">Aún no marcan</dt>
                    <dd className="text-slate-600">{faltan.slice(0, 8).map((e) => corto(e.nombre)).join(", ")}{faltan.length > 8 && ` y ${faltan.length - 8} más`}</dd>
                  </div>
                )}
              </dl>
            </Bloque>
          )}
        </div>

        <section className={`${estiloTarjeta} lg:self-start`}>
          <h2 className="text-lg font-semibold text-slate-700">Por hacer</h2>
          {porHacer.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-base text-emerald-700"><CheckCircle2 aria-hidden className="h-6 w-6" /> Todo al día.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {porHacer.map((p) => (
                <li key={p.clave}>
                  <Link href={p.href} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50">
                    <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-base font-bold ${p.tono === "rojo" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{p.cantidad}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-800">{p.titulo}</span>
                      <span className="block text-sm text-slate-500">{p.detalle}</span>
                    </span>
                    <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {ACCESOS[perfil.rol as Exclude<Rol, "personal">].map((a) => <Link key={a.href} href={a.href} className={`${estiloBoton.secundario} justify-center text-center`}>{a.texto}</Link>)}
        </div>
      </section>
    </>
  );
}
