import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fechaHora } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import Vacio from "../../_ui/Vacio";
import { Insignia } from "../../_ui/Insignias";
import { estiloBoton, estiloEtiqueta, estiloInput } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Bitácora" };

const TABLAS: Record<string, string> = {
  activos: "Activos", activo_movimientos: "Movimientos de activos", categorias_activo: "Tabla de depreciación", ubicaciones: "Ubicaciones",
  compras: "Compras", compra_lineas: "Líneas de compra", proveedores: "Proveedores", productos: "Productos", inventario_movimientos: "Inventario",
  empleados: "Personal", empleados_pin: "PIN del personal", horarios: "Horarios", marcas: "Marcas de asistencia", ausencias: "Ausencias",
  planillas: "Planillas", planilla_lineas: "Líneas de planilla", parametros: "Parámetros", perfiles: "Usuarios", cuentas: "Contraseñas",
  conteos_fisicos: "Conteos físicos", conteo_detalle: "Detalle de conteos", archivos: "Archivos", dispositivos_kiosko: "Tablets del kiosko",
  fuentes_financiamiento: "Fuentes de financiamiento",
};
const ACCION = { INSERT: ["Creó", "verde"], UPDATE: ["Cambió", "azul"], DELETE: ["Intentó borrar", "rojo"] } as const;
const POR_PAGINA = 50;

type Json = Record<string, unknown> | null;
const mostrar = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Solo lo que cambió (antes → después); en una creación, los datos con valor. */
function Cambios({ antes, despues }: { antes: Json; despues: Json }) {
  const claves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])].filter((k) => !["creado_en", "actualizado_en"].includes(k));
  const filas = antes
    ? claves.filter((k) => JSON.stringify(antes?.[k]) !== JSON.stringify(despues?.[k]))
    : claves.filter((k) => despues?.[k] !== null && despues?.[k] !== "" && k !== "id");
  if (filas.length === 0) return <span className="text-slate-500">Sin cambios en los datos.</span>;
  return (
    <dl className="space-y-0.5 text-sm">
      {filas.map((k) => (
        <div key={k} className="break-words">
          <dt className="inline font-medium text-slate-600">{k.replace(/_/g, " ")}: </dt>
          <dd className="inline">
            {antes && <><span className="text-red-700 line-through">{mostrar(antes[k])}</span> → </>}
            <span className="text-emerald-800">{mostrar(despues?.[k])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function BitacoraPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { consultar, perfil } = await obtenerSesion();
  if (!perfil || !["admin", "auditor", "contabilidad"].includes(perfil.rol)) return <SinPermiso que="la bitácora" quien="dirección, contabilidad o auditoría" />;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const { filas, usuarios } = await consultar(async (tx) => {
    let q = tx.selectFrom("bitacora as b").leftJoin("perfiles as p", "p.id", "b.usuario")
      .select(["b.id", "b.tabla", "b.registro_id", "b.accion", "b.antes", "b.despues", "b.en", "p.nombre as quien"]);
    if (sp.tabla) q = q.where("b.tabla", "=", sp.tabla);
    if (sp.usuario === "sistema") q = q.where("b.usuario", "is", null);
    else if (sp.usuario) q = q.where("b.usuario", "=", sp.usuario);
    if (sp.desde) q = q.where("b.en", ">=", new Date(`${sp.desde}T00:00:00-06:00`));
    if (sp.hasta) q = q.where("b.en", "<", new Date(new Date(`${sp.hasta}T00:00:00-06:00`).getTime() + 86_400_000));
    if (sp.registro) q = q.where("b.registro_id", "=", sp.registro);
    return {
      filas: await q.orderBy("b.id", "desc").limit(POR_PAGINA + 1).offset((pagina - 1) * POR_PAGINA).execute(),
      usuarios: await tx.selectFrom("perfiles").select(["id", "nombre"]).orderBy("nombre").execute(),
    };
  });
  const hayMas = filas.length > POR_PAGINA;
  const visibles = filas.slice(0, POR_PAGINA);
  const enlace = (p: number) => `/portal/bitacora?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>, pagina: String(p) })}`;

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Bitácora" }]} titulo="Bitácora" descripcion="Cada cambio que se hace en el portal: quién, cuándo y qué cambió. No se puede editar ni borrar." />
      <form className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Qué</span>
          <select name="tabla" defaultValue={sp.tabla ?? ""} className={estiloInput}><option value="">Todo</option>{Object.entries(TABLAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Quién</span>
          <select name="usuario" defaultValue={sp.usuario ?? ""} className={estiloInput}><option value="">Todos</option><option value="sistema">Sistema / kiosko</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
        </label>
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Desde</span><input type="date" name="desde" defaultValue={sp.desde} className={estiloInput} /></label>
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Hasta</span><input type="date" name="hasta" defaultValue={sp.hasta} className={estiloInput} /></label>
        <button type="submit" className={estiloBoton.primario}>Filtrar</button>
        <Link href="/portal/bitacora" className={`${estiloBoton.secundario}`}>Quitar filtros</Link>
      </form>
      {sp.registro && <p className="mb-4">Mostrando solo el registro {sp.registro}.</p>}
      {visibles.length === 0 ? <Vacio titulo="No hay cambios con esos filtros." /> : (
        <ol className="space-y-3">
          {visibles.map((b) => {
            const a = ACCION[b.accion as keyof typeof ACCION] ?? [b.accion, "gris"];
            return (
              <li key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{b.quien ?? "Sistema / kiosko"}</span>
                  <Insignia tono={a[1]}>{a[0]}</Insignia>
                  <span>{TABLAS[b.tabla] ?? b.tabla}</span>
                  <Link href={`/portal/bitacora?registro=${encodeURIComponent(b.registro_id)}`} className="text-sm text-slate-500 hover:underline">historial de este registro</Link>
                  <span className="ml-auto text-sm text-slate-500">{fechaHora(b.en)}</span>
                </div>
                <Cambios antes={b.antes as Json} despues={b.despues as Json} />
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-6 flex justify-between">
        {pagina > 1 ? <Link href={enlace(pagina - 1)} className={estiloBoton.secundario}>← Más recientes</Link> : <span />}
        {hayMas && <Link href={enlace(pagina + 1)} className={estiloBoton.secundario}>Más antiguos →</Link>}
      </div>
    </>
  );
}
