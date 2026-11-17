import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { calendario, conDepreciacion, consultaActivos } from "@/lib/portal/activos";
import { ESTADOS_ACTIVO, opciones } from "@/lib/portal/catalogos";
import { colones, fecha, fechaHora, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { Falta, Insignia, Valor } from "../../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { Baja, Traslado } from "./Acciones";

export const metadata: Metadata = { title: "Activo" };

const TIPO_MOV = { alta: "Alta", traslado: "Traslado", reparacion: "Reparación", retorno: "Retorno", baja: "Baja", ajuste: "Ajuste" } as const;

function Dato({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-base last:border-0">
      <dt className="text-slate-500">{t}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default async function ActivoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const guardado = (await searchParams).guardado;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const datos = await consultar(async (tx) => {
    const a = await consultaActivos(tx).where("a.id", "=", id).executeTakeFirst();
    if (!a) return null;
    const [movs, ubicaciones, compra] = await Promise.all([
      tx.selectFrom("activo_movimientos as m")
        .leftJoin("ubicaciones as o", "o.id", "m.ubicacion_origen_id")
        .leftJoin("ubicaciones as d", "d.id", "m.ubicacion_destino_id")
        .leftJoin("perfiles as p", "p.id", "m.registrado_por")
        .select(["m.id", "m.tipo", "m.fecha", "m.motivo", "m.documento_url", "m.creado_en", "o.nombre as origen", "d.nombre as destino", "p.nombre as quien"])
        .where("m.activo_id", "=", id).orderBy("m.creado_en", "desc").execute(),
      tx.selectFrom("ubicaciones").select(["id", "nombre", "activo"]).orderBy("nombre").execute(),
      a.compra_linea_id
        ? tx.selectFrom("compra_lineas as l").innerJoin("compras as c", "c.id", "l.compra_id").select(["c.id", "c.numero_factura", "c.fecha"]).where("l.id", "=", a.compra_linea_id).executeTakeFirst()
        : null,
    ]);
    return { a: conDepreciacion(a, hoy), cal: calendario(a), movs, ubicaciones, compra };
  });
  if (!datos) notFound();
  const { a, cal, movs, ubicaciones, compra } = datos;
  const titulo = `${a.tipo_bien}${a.placa ? ` · placa ${a.placa}` : ""}`;
  const deBaja = a.estado === "dado_de_baja";

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: titulo }]}
        titulo={titulo}
        descripcion={<>{a.ubicacion} · <Insignia tono={deBaja ? "gris" : "verde"}>{ESTADOS_ACTIVO[a.estado]}</Insignia></>}
        acciones={
          <>
            {puedeEscribir && !deBaja && <Link href={`/portal/activos/${a.id}/editar`} className={estiloBoton.primario}>Editar</Link>}
            <Link href={`/portal/activos/etiquetas?ids=${a.id}`} className={estiloBoton.secundario}>Imprimir etiqueta</Link>
          </>
        }
      />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">{guardado === "baja" ? "El activo quedó dado de baja." : "Cambios guardados."}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={estiloTarjeta}>
          <h2 className="mb-2 text-xl font-semibold">Datos</h2>
          <dl>
            <Dato t="Placa"><Valor v={a.placa} que="la placa" /></Dato>
            <Dato t="Marca">{a.marca ?? "—"}</Dato>
            <Dato t="Modelo">{a.modelo ?? "—"}</Dato>
            <Dato t="Serie">{a.serie ?? "—"}</Dato>
            <Dato t="Ubicación">{a.ubicacion}</Dato>
            <Dato t="Fuente">{a.fuente}</Dato>
            <Dato t="Factura">{compra ? <Link className={estiloBoton.enlace} href={`/portal/compras/${compra.id}`}>N.º {compra.numero_factura} ({fecha(compra.fecha)})</Link> : <Falta que="la factura" />}</Dato>
            {a.fila_origen && <Dato t="Importado de">{a.fila_origen}</Dato>}
            {deBaja && <Dato t="Dado de baja">{fecha(a.fecha_baja)} · {a.motivo_baja}</Dato>}
            {a.notas && <Dato t="Notas"><span className="whitespace-pre-line">{a.notas}</span></Dato>}
          </dl>
          {a.foto_url && <img src={a.foto_url} alt={`Foto de ${a.tipo_bien}`} className="mt-4 max-h-72 rounded-xl border border-slate-200 object-contain" />}
        </section>

        <section className={estiloTarjeta}>
          <h2 className="mb-2 text-xl font-semibold">Depreciación</h2>
          <dl>
            <Dato t="Fecha de compra"><Valor v={fecha(a.fecha_adquisicion)} que="la fecha de compra" /></Dato>
            <Dato t="Costo"><Valor v={colones(a.costo)} que="el costo" /></Dato>
            <Dato t="Fila del Anexo 2"><Valor v={a.categoria} que="la categoría" /></Dato>
            <Dato t="Tasa anual">{a.tasa_anual_override ?? a.tasa_anual ? `${Number(a.tasa_anual_override ?? a.tasa_anual)} %${a.tasa_anual_override ? " (propia de este activo)" : ""}` : <Falta />}</Dato>
            <Dato t="Método">{a.metodo === "linea_recta" ? "Línea recta" : "Suma de dígitos"}</Dato>
            <Dato t={`Depreciación acumulada al ${fecha(hoy)}`}><Valor v={colones(a.depreciacion)} /></Dato>
            <Dato t="Valor en libros"><Valor v={colones(a.valorLibros)} /></Dato>
          </dl>
          {cal ? (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-sky-700">Ver el calendario año por año</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-right text-base tabular-nums">
                  <thead className="text-sm text-slate-500">
                    <tr><th className="text-left">Año</th><th>Del año</th><th>Acumulada</th><th>En libros</th></tr>
                  </thead>
                  <tbody>
                    {cal.map((f) => (
                      <tr key={f.anio} className="border-t border-slate-100">
                        <td className="py-1 text-left">{f.anio}</td><td>{colones(f.depreciacionAnio)}</td><td>{colones(f.acumulada)}</td><td>{colones(f.valorLibros)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
              Para calcular la depreciación hacen falta el costo, la fecha de compra y la fila del Anexo 2.{" "}
              {puedeEscribir && !deBaja && <Link href={`/portal/activos/${a.id}/editar`} className={estiloBoton.enlace}>Completar ahora</Link>}
            </p>
          )}
        </section>

        {puedeEscribir && !deBaja && (
          <section className={`${estiloTarjeta} space-y-4 lg:col-span-2`}>
            <h2 className="text-xl font-semibold">Movimientos</h2>
            <div className="flex flex-wrap items-start gap-4">
              <Traslado id={a.id} hoy={hoy} ubicaciones={opciones(ubicaciones, (u) => u.activo && u.id !== a.ubicacion_id)} />
              <Baja id={a.id} hoy={hoy} />
            </div>
          </section>
        )}

        <section className={`${estiloTarjeta} lg:col-span-2`}>
          <h2 className="mb-3 text-xl font-semibold">Historial</h2>
          {movs.length === 0 ? (
            <p className="text-slate-600">Sin movimientos registrados.</p>
          ) : (
            <ol className="space-y-3">
              {movs.map((m) => (
                <li key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Insignia tono={m.tipo === "baja" ? "rojo" : m.tipo === "alta" ? "verde" : "azul"}>{TIPO_MOV[m.tipo]}</Insignia>
                    <span className="font-medium">{fecha(m.fecha)}</span>
                    {m.tipo === "traslado" && <span>{m.origen} → {m.destino}</span>}
                    {m.tipo === "alta" && m.destino && <span>en {m.destino}</span>}
                  </div>
                  <p className="mt-1 text-slate-700">{m.motivo}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Registrado por {m.quien ?? "el sistema"} el {fechaHora(m.creado_en)}
                    {m.documento_url && <> · <a href={m.documento_url} target="_blank" className={estiloBoton.enlace}>ver documento</a></>}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
