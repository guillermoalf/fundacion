import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { hoyCR } from "@/lib/portal/formato";
import { ausenciasSeguidas, edad, textoEdad, type EstadoAsistencia } from "@/lib/calculos/ninos";
import { VolverAlBorrador } from "../../_ui/Borrador";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton } from "../../_ui/estilos";
import { AVISO_AUSENCIAS } from "./datos";

export const metadata: Metadata = { title: "Niños y niñas" };

export default async function NinosPage() {
  const { consultar, veNinos, editaNinos, esPersonal } = await obtenerSesion();
  if (!veNinos) return <SinPermiso que="los datos de los niños" />;
  const hoy = hoyCR();
  const d = await consultar(async (tx) => {
    const ninos = await tx.selectFrom("ninos as n").leftJoin("ubicaciones as u", "u.id", "n.aula_id").leftJoin("fuentes_financiamiento as f", "f.id", "n.fuente_id")
      .select(["n.id", "n.nombre", "n.apellidos", "n.fecha_nacimiento", "n.estado", "n.identificacion", "n.alergias", "u.nombre as aula", "f.codigo as fuente"])
      .orderBy("n.estado").orderBy("n.nombre").orderBy("n.apellidos").execute();
    const responsables = await tx.selectFrom("responsables_nino").select(["nino_id", "nombre", "parentesco", "telefono", "es_legal", "orden"])
      .where("activo", "=", true).orderBy("orden").orderBy("id").execute();
    const asistencia = await tx.selectFrom("asistencia_ninos").select(["nino_id", "fecha", "estado"])
      .where("fecha", ">=", new Date(Date.parse(hoy) - 30 * 86400000).toISOString().slice(0, 10)).execute();
    return { ninos, responsables, asistencia };
  });
  const principal = new Map<string, (typeof d.responsables)[number]>();
  const hayLegal = new Set<string>();
  for (const r of d.responsables) {
    if (!principal.has(r.nino_id)) principal.set(r.nino_id, r);
    if (r.es_legal) hayLegal.add(r.nino_id);
  }
  const porNino = new Map<string, { fecha: string; estado: EstadoAsistencia }[]>();
  for (const a of d.asistencia) porNino.set(a.nino_id, [...(porNino.get(a.nino_id) ?? []), { fecha: a.fecha, estado: a.estado as EstadoAsistencia }]);

  const avisos = (n: (typeof d.ninos)[number]) => {
    if (n.estado !== "activo") return [];
    const a: string[] = [];
    const seguidas = ausenciasSeguidas(porNino.get(n.id) ?? []);
    if (seguidas >= AVISO_AUSENCIAS) a.push(`${seguidas} ausencias seguidas`);
    if (!esPersonal) {
      if (!n.fecha_nacimiento) a.push("Falta fecha de nacimiento");
      if (!hayLegal.has(n.id)) a.push("Falta responsable legal");
      else if (!principal.get(n.id)?.telefono) a.push("Falta teléfono");
      if (!n.aula) a.push("Sin aula");
    }
    return a;
  };

  const activos = d.ninos.filter((n) => n.estado === "activo").length;
  return (
    <>
      <VolverAlBorrador nombre="nino" href="/portal/ninos/nuevo" />
      <Encabezado
        migas={[{ etiqueta: "Niños y niñas" }]}
        titulo="Niños y niñas"
        descripcion={`${activos} activos. Toque un nombre para ver sus datos y contactos.`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link href="/portal/ninos/lista" className={editaNinos ? estiloBoton.secundario : estiloBoton.primario}>Pasar lista</Link>
            {editaNinos && <Link href="/portal/ninos/nuevo" className={estiloBoton.primario}>+ Registrar niño o niña</Link>}
          </div>
        }
      />
      <Tabla
        columnas={[
          { clave: "nombre", titulo: "Nombre" }, { clave: "edad", titulo: "Edad" }, { clave: "aula", titulo: "Aula" },
          { clave: "responsable", titulo: "Responsable" }, { clave: "telefono", titulo: "Teléfono" },
          ...(esPersonal ? [] : [{ clave: "fuente", titulo: "Subsidio", ocultarEnMovil: true }]),
          { clave: "avisos", titulo: "Avisos" }, { clave: "estado", titulo: "Estado", ocultarEnMovil: true },
        ]}
        filtros={[{ clave: "estado", titulo: "Estado" }, { clave: "aula", titulo: "Aula" }, ...(esPersonal ? [] : [{ clave: "fuente", titulo: "Subsidio" }, { clave: "aviso", titulo: "Avisos" }])]}
        filas={d.ninos.map((n) => {
          const r = principal.get(n.id);
          const a = avisos(n);
          const e = edad(n.fecha_nacimiento, hoy);
          return {
            id: n.id,
            href: `/portal/ninos/${n.id}`,
            celdas: {
              nombre: `${n.nombre} ${n.apellidos}`,
              edad: textoEdad(e) ?? { vacio: true },
              aula: n.aula ?? { vacio: true },
              responsable: r ? `${r.nombre} (${r.parentesco.toLowerCase()})` : { vacio: true },
              telefono: r?.telefono ? { texto: r.telefono, href: `tel:${r.telefono.replace(/[^\d+]/g, "")}` } : { vacio: true },
              fuente: n.fuente ?? { vacio: true },
              avisos: a.length ? { texto: a.join(" · "), tono: "ambar" } : n.alergias ? { texto: "Alergias", tono: "rojo" } : { vacio: true },
              estado: n.estado === "activo" ? { texto: "Activo", tono: "verde" } : { texto: "Retirado", tono: "gris" },
            },
            orden: { edad: e ? e.anios * 12 + e.meses : null },
            filtros: { estado: n.estado === "activo" ? "Activo" : "Retirado", aula: n.aula ?? "Sin aula", fuente: n.fuente ?? "Sin definir", aviso: a.length ? "Con avisos" : "Sin avisos" },
          };
        })}
        vacio={<Vacio titulo="Todavía no hay niños registrados." accion={editaNinos && <Link href="/portal/ninos/nuevo" className={estiloBoton.primario}>Registrar el primero</Link>} />}
      />
    </>
  );
}
