import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR, mesLargo, rangoMes } from "@/lib/portal/formato";
import { edad, resumenAsistencia, textoEdad, type EstadoAsistencia } from "@/lib/calculos/ninos";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import { Insignia } from "../../../_ui/Insignias";
import { estiloTarjeta } from "../../../_ui/estilos";
import { FormularioEstudio, FormularioNino, FormularioNota, FormularioReingreso, FormularioResponsable, FormularioRetiro } from "../Formularios";
import { estudiosPani } from "@/lib/portal/estudios";
import { ESTADOS_ASISTENCIA, ESTADOS_ESTUDIO } from "../datos";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Niño o niña" };

const tel = (t: string) => `tel:${t.replace(/[^\d+]/g, "")}`;
const whatsapp = (t: string) => {
  const d = t.replace(/\D/g, "");
  return `https://wa.me/${d.length === 8 ? `506${d}` : d}`;
};

export default async function NinoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const { guardado } = await searchParams;
  const { consultar, veNinos, editaNinos, veNotasNinos } = await obtenerSesion();
  if (!veNinos) return <SinPermiso que="los datos de los niños" />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const hoy = hoyCR();
  const mes = hoy.slice(0, 7);
  const d = await consultar(async (tx) => {
    const n = await tx.selectFrom("ninos as n").leftJoin("ubicaciones as u", "u.id", "n.aula_id").leftJoin("fuentes_financiamiento as f", "f.id", "n.fuente_id")
      .selectAll("n").select(["u.nombre as aula", "f.codigo as fuente"]).where("n.id", "=", id).executeTakeFirst();
    if (!n) return null;
    const { desde, hasta } = rangoMes(mes);
    return {
      n,
      responsables: await tx.selectFrom("responsables_nino").selectAll().where("nino_id", "=", id).orderBy("activo", "desc").orderBy("orden").orderBy("id").execute(),
      notas: veNotasNinos
        ? await tx.selectFrom("notas_nino as t").leftJoin("perfiles as p", "p.id", "t.autor").select(["t.id", "t.fecha", "t.texto", "p.nombre as autor"]).where("t.nino_id", "=", id).orderBy("t.fecha", "desc").orderBy("t.id", "desc").execute()
        : [],
      asistencia: await tx.selectFrom("asistencia_ninos").select(["fecha", "estado", "hora_llegada", "motivo"]).where("nino_id", "=", id).where("fecha", ">=", desde).where("fecha", "<=", hasta).orderBy("fecha", "desc").execute(),
      aulas: editaNinos ? await tx.selectFrom("ubicaciones").select(["id", "nombre"]).orderBy(alfa("nombre")).execute() : [],
      fuentes: editaNinos ? await tx.selectFrom("fuentes_financiamiento").select(["id", "codigo", "nombre"]).orderBy("id").execute() : [],
      estudio: veNotasNinos ? await estudiosPani(tx, hoy, id) : null,
      historialEstudios: veNotasNinos ? await tx.selectFrom("estudios_socioeconomicos as e").leftJoin("perfiles as p", "p.id", "e.registrado_por")
        .select(["e.id", "e.fecha_elaboracion", "e.fecha_vencimiento", "e.trabajador_social", "e.documento_url", "e.observaciones", "p.nombre as registro"])
        .where("e.nino_id", "=", id).orderBy("e.fecha_elaboracion", "desc").execute() : [],
    };
  });
  if (!d) notFound();
  const { n } = d;
  const nombre = `${n.nombre} ${n.apellidos}`;
  const e = textoEdad(edad(n.fecha_nacimiento, hoy));
  const res = resumenAsistencia(d.asistencia.map((a) => a.estado as EstadoAsistencia));
  const activosResp = d.responsables.filter((r) => r.activo);
  const salud = [["Alergias", n.alergias], ["Condición médica", n.condicion_medica], ["Medicamentos", n.medicamentos]].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Niños y niñas", href: "/portal/ninos" }, { etiqueta: nombre }]}
        titulo={nombre}
        descripcion={[e, n.aula, n.estado === "retirado" ? `Retirado el ${fecha(n.fecha_retiro)} (${n.motivo_retiro})` : null].filter(Boolean).join(" · ")}
      />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Quedó registrado.</p>}
      {salud.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          {salud.map(([k, v]) => <p key={k}><span className="font-semibold">{k}:</span> {v}</p>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Responsables y contactos</h2>
            {activosResp.length === 0 && <p className="mb-4 text-amber-800">Falta el responsable legal: sin él no hay a quién llamar en una emergencia.</p>}
            <ul className="space-y-4">
              {activosResp.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{r.nombre}</span>
                    <span className="text-slate-600">{r.parentesco}</span>
                    {r.es_legal && <Insignia tono="azul">Responsable legal</Insignia>}
                    {r.orden === 1 ? <Insignia tono="verde">Principal</Insignia> : <Insignia>Respaldo {r.orden}</Insignia>}
                    {!r.puede_recoger && <Insignia tono="rojo">No puede recogerlo</Insignia>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[r.telefono, r.otro_telefono].filter(Boolean).map((t) => (
                      <span key={t} className="flex gap-2">
                        <a href={tel(t!)} className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-sky-800 hover:bg-slate-50">Llamar {t}</a>
                        <a href={whatsapp(t!)} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-emerald-800 hover:bg-slate-50">WhatsApp</a>
                      </span>
                    ))}
                    {r.correo && <a href={`mailto:${r.correo}`} className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-sky-800 hover:bg-slate-50">{r.correo}</a>}
                  </div>
                  {(r.otro_contacto || r.identificacion || r.notas) && (
                    <p className="mt-2 text-sm text-slate-600">{[r.identificacion && `Cédula ${r.identificacion}`, r.otro_contacto, r.notas].filter(Boolean).join(" · ")}</p>
                  )}
                  {editaNinos && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-sky-700">Editar</summary>
                      <div className="mt-3"><FormularioResponsable ninoId={id} v={{ ...r }} /></div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {d.responsables.some((r) => !r.activo) && (
              <p className="mt-3 text-sm text-slate-500">Antes: {d.responsables.filter((r) => !r.activo).map((r) => `${r.nombre} (${r.parentesco})`).join(", ")}</p>
            )}
            {editaNinos && (
              <details className="mt-4" open={activosResp.length === 0}>
                <summary className="cursor-pointer font-semibold text-sky-700">+ Agregar responsable o contacto de respaldo</summary>
                <div className="mt-4"><FormularioResponsable ninoId={id} siguiente={activosResp.length ? Math.min(4, activosResp.length + 1) : 1} /></div>
              </details>
            )}
          </section>

          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Datos</h2>
            {editaNinos ? (
              <FormularioNino v={{ ...n }} aulas={d.aulas.map((u) => ({ valor: u.id, texto: u.nombre }))} fuentes={d.fuentes.map((f) => ({ valor: f.id, texto: `${f.codigo} · ${f.nombre}` }))} hoy={hoy} />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Fecha de nacimiento", fecha(n.fecha_nacimiento)], ["Identificación", n.identificacion], ["Aula", n.aula], ["Subsidio", n.fuente],
                  ["Dirección", [n.distrito, n.canton, n.provincia].filter(Boolean).join(", ") + (n.direccion ? `. ${n.direccion}` : "")], ["Ingreso", fecha(n.fecha_ingreso)],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-sm text-slate-500">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>
                ))}
              </dl>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className={estiloTarjeta}>
            <h2 className="mb-1 text-xl font-semibold">Asistencia de {mesLargo(mes)}</h2>
            {res.dias === 0 ? <p className="text-slate-600">Todavía no se le ha pasado lista este mes.</p> : (
              <>
                <p className="mb-3 text-slate-600">{res.presentes} de {res.dias} días ({res.porcentaje} %) · {res.ausentes} ausencias · {res.justificadas} justificadas</p>
                <ul className="space-y-1">
                  {d.asistencia.map((a) => (
                    <li key={a.fecha} className="flex justify-between gap-2">
                      <span>{fecha(a.fecha)}</span>
                      <span className={a.estado === "presente" ? "text-emerald-800" : a.estado === "ausente" ? "text-red-700" : "text-slate-600"}>
                        {ESTADOS_ASISTENCIA[a.estado as EstadoAsistencia]}{a.hora_llegada ? ` · ${a.hora_llegada.slice(0, 5)}` : ""}{a.motivo ? ` · ${a.motivo}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href={`/portal/ninos/asistencia?mes=${mes}`} className="mt-3 inline-block font-medium text-sky-700 hover:underline">Ver todos los meses →</Link>
          </section>

          {veNotasNinos && (d.estudio?.estudios.length || d.historialEstudios.length > 0) ? (
            <section className={estiloTarjeta}>
              <h2 className="mb-1 text-xl font-semibold">Estudio socioeconómico</h2>
              {(() => {
                const est = d.estudio?.estudios[0];
                return est ? (
                  <p className="mb-3">
                    <Insignia tono={ESTADOS_ESTUDIO[est.estado].tono}>{ESTADOS_ESTUDIO[est.estado].texto}</Insignia>
                    {est.vence && <span className="ml-2 text-slate-700">vence el <strong>{fecha(est.vence)}</strong></span>}
                  </p>
                ) : <p className="mb-3 text-sm text-slate-500">Ya no es niño PANI activo: solo queda el historial.</p>;
              })()}
              {d.historialEstudios.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {d.historialEstudios.map((e, i) => (
                    <li key={e.id} className={`rounded-xl border p-3 ${i === 0 ? "border-slate-300" : "border-slate-100 text-slate-500"}`}>
                      <p className="font-medium">Elaborado el {fecha(e.fecha_elaboracion)} · vence el {fecha(e.fecha_vencimiento)}{e.trabajador_social ? ` · ${e.trabajador_social}` : ""}{i === 0 ? " (el actual)" : ""}</p>
                      <p className="text-sm">
                        {e.documento_url ? <a href={e.documento_url} target="_blank" rel="noreferrer" className="font-medium text-sky-700 underline">Ver estudio</a> : "Sin documento adjunto"}
                        {e.observaciones ? ` · ${e.observaciones}` : ""}{e.registro ? ` · registró ${e.registro}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {editaNinos && n.estado === "activo" && (
                <details open={!d.historialEstudios.length || (d.estudio?.estudios[0]?.estado ?? "vigente") !== "vigente"}>
                  <summary className="cursor-pointer font-medium text-sky-700">{d.historialEstudios.length ? "Registrar el estudio renovado" : "Registrar el estudio"}</summary>
                  <div className="mt-3"><FormularioEstudio ninoId={id} hoy={hoy} renovacion={d.historialEstudios.length > 0} vigenciaAnios={d.estudio?.reglas?.vigenciaAnios ?? null} /></div>
                </details>
              )}
            </section>
          ) : null}

          {veNotasNinos && (
            <section className={estiloTarjeta}>
              <h2 className="mb-1 text-xl font-semibold">Notas</h2>
              <p className="mb-4 text-sm text-slate-500">Situaciones o información importante. Solo las ven la dirección, coordinación y auditoría.</p>
              {editaNinos && <FormularioNota ninoId={id} hoy={hoy} />}
              <ul className="mt-5 space-y-3">
                {d.notas.map((t) => (
                  <li key={t.id} className="border-l-4 border-slate-200 pl-3">
                    <p className="whitespace-pre-line">{t.texto}</p>
                    <p className="text-sm text-slate-500">{fecha(t.fecha)}{t.autor ? ` · ${t.autor}` : ""}</p>
                  </li>
                ))}
                {d.notas.length === 0 && <li className="text-slate-500">Sin notas.</li>}
              </ul>
            </section>
          )}

          {editaNinos && (
            <section className={estiloTarjeta}>
              <h2 className="mb-2 text-xl font-semibold">{n.estado === "activo" ? "Retiro" : "Reingreso"}</h2>
              {n.estado === "activo" ? <FormularioRetiro ninoId={id} hoy={hoy} /> : <FormularioReingreso ninoId={id} />}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
