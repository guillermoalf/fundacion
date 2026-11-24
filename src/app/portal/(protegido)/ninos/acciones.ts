"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { casilla, ejecutar, ErrorUsuario, entero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { hoyCR, partesCR } from "@/lib/portal/formato";
import { guardarArchivo } from "@/lib/portal/archivos";

type R = Resultado | null;
const SIN_PERMISO = "No tiene permiso para cambiar los datos de los niños. Pídaselo a la dirección.";

function datosNino(f: FormData) {
  const nacimiento = texto(f, "fecha_nacimiento");
  if (nacimiento && nacimiento > hoyCR()) throw new ErrorUsuario("La fecha de nacimiento no puede ser en el futuro.");
  const sexo = texto(f, "sexo");
  return {
    nombre: textoObligatorio(f, "nombre", "el nombre"),
    apellidos: textoObligatorio(f, "apellidos", "los apellidos"),
    identificacion: texto(f, "identificacion"),
    fecha_nacimiento: nacimiento,
    sexo: sexo === "F" || sexo === "M" ? sexo : null,
    provincia: texto(f, "provincia"),
    canton: texto(f, "canton"),
    distrito: texto(f, "distrito"),
    direccion: texto(f, "direccion"),
    aula_id: entero(f, "aula_id"),
    fuente_id: entero(f, "fuente_id"),
    fecha_ingreso: texto(f, "fecha_ingreso") ?? hoyCR(),
    alergias: texto(f, "alergias"),
    condicion_medica: texto(f, "condicion_medica"),
    medicamentos: texto(f, "medicamentos"),
  };
}

function datosResponsable(f: FormData) {
  const telefono = texto(f, "telefono");
  const correo = texto(f, "correo");
  const otro = texto(f, "otro_contacto");
  if (!telefono && !correo && !otro) throw new ErrorUsuario("Anote al menos un teléfono o una forma de contacto.");
  return {
    nombre: textoObligatorio(f, "nombre", "el nombre del responsable"),
    parentesco: textoObligatorio(f, "parentesco", "el parentesco"),
    identificacion: texto(f, "identificacion"),
    telefono,
    otro_telefono: texto(f, "otro_telefono"),
    correo,
    otro_contacto: otro,
    es_legal: casilla(f, "es_legal"),
    puede_recoger: casilla(f, "puede_recoger"),
    orden: entero(f, "orden") ?? 1,
    notas: texto(f, "notas"),
  };
}

export async function crearNino(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const d = datosNino(f);
    const responsable = texto(f, "r_nombre") ? datosResponsable(prefijo(f, "r_")) : null;
    const id = await consultar(async (tx) => {
      const { id } = await tx.insertInto("ninos").values(d).returning("id").executeTakeFirstOrThrow();
      if (responsable) await tx.insertInto("responsables_nino").values({ ...responsable, nino_id: id, es_legal: true, orden: 1 }).execute();
      return id;
    });
    return { id };
  });
  if (r.ok) {
    revalidatePath("/portal/ninos");
    redirect(`/portal/ninos/${r.id}?guardado=1`);
  }
  return r;
}

/** Campos con prefijo (el responsable dentro del formulario del niño) como un FormData aparte. */
function prefijo(f: FormData, p: string) {
  const g = new FormData();
  for (const [k, v] of f.entries()) if (k.startsWith(p)) g.set(k.slice(p.length), v);
  return g;
}

export async function editarNino(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const d = datosNino(f);
    await consultar(async (tx) => {
      const n = await tx.updateTable("ninos").set(d).where("id", "=", id).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario(SIN_PERMISO);
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/ninos/${id}`);
  return r;
}

export async function retirarNino(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const fecha = textoObligatorio(f, "fecha_retiro", "la fecha de retiro");
    const motivo = textoObligatorio(f, "motivo_retiro", "el motivo del retiro");
    await consultar(async (tx) => {
      const n = await tx.updateTable("ninos").set({ estado: "retirado", fecha_retiro: fecha, motivo_retiro: motivo }).where("id", "=", id).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario(SIN_PERMISO);
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/ninos/${id}`);
  return r;
}

export async function reingresarNino(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    await consultar(async (tx) => {
      const n = await tx.updateTable("ninos").set({ estado: "activo", fecha_retiro: null, motivo_retiro: null }).where("id", "=", id).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario(SIN_PERMISO);
      await tx.insertInto("notas_nino").values({ nino_id: id, texto: "Volvió a la fundación (se reactivó su registro)." }).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/ninos/${id}`);
  return r;
}

export async function guardarResponsable(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const ninoId = String(f.get("nino_id"));
  const rid = entero(f, "id");
  const r = await ejecutar(async () => {
    const d = datosResponsable(f);
    await consultar(async (tx) => {
      const n = rid
        ? await tx.updateTable("responsables_nino").set({ ...d, activo: casilla(f, "activo") }).where("id", "=", rid).where("nino_id", "=", ninoId).returning("id").executeTakeFirst()
        : await tx.insertInto("responsables_nino").values({ ...d, nino_id: ninoId }).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario(SIN_PERMISO);
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/ninos/${ninoId}`);
  return r;
}

export async function agregarNota(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const ninoId = String(f.get("nino_id"));
  const r = await ejecutar(async () => {
    const t = textoObligatorio(f, "texto", "lo que pasó");
    await consultar((tx) => tx.insertInto("notas_nino").values({ nino_id: ninoId, texto: t, fecha: texto(f, "fecha") ?? hoyCR() }).execute());
    return {};
  });
  if (r.ok) revalidatePath(`/portal/ninos/${ninoId}`);
  return r;
}

/** Pasar lista: guarda un niño a la vez (un toque = guardado). */
export async function marcarAsistencia(
  ninoId: string, fecha: string, estado: "presente" | "ausente" | "justificada", motivo?: string | null,
): Promise<Resultado<{ hora: string | null }>> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new ErrorUsuario("Fecha inválida.");
    if (fecha > hoyCR()) throw new ErrorUsuario("No se puede pasar lista de un día que todavía no llega.");
    if (!["presente", "ausente", "justificada"].includes(estado)) throw new ErrorUsuario("Elija presente, ausente o justificada.");
    const hora = estado === "presente" && fecha === hoyCR() ? partesCR().hhmm : null;
    // Sin revalidatePath: la pantalla de lista ya muestra el cambio y no se recarga en cada toque.
    return consultar(async (tx) => {
      const previo = await tx.selectFrom("asistencia_ninos").select(["hora_llegada"]).where("nino_id", "=", ninoId).where("fecha", "=", fecha).executeTakeFirst();
      const horaFinal = estado === "presente" ? (previo?.hora_llegada ?? hora) : null;
      await tx.insertInto("asistencia_ninos").values({ nino_id: ninoId, fecha, estado, hora_llegada: horaFinal, motivo: motivo?.trim() || null })
        .onConflict((oc) => oc.columns(["nino_id", "fecha"]).doUpdateSet({ estado, hora_llegada: horaFinal, motivo: motivo?.trim() || null }))
        .execute();
      return { hora: horaFinal?.slice(0, 5) ?? null };
    });
  });
}

/** Registra el estudio socioeconómico (nuevo o renovación). Los anteriores quedan en el historial. */
export async function registrarEstudio(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const ninoId = String(f.get("nino_id"));
  const r = await ejecutar(async () => {
    const fecha = textoObligatorio(f, "fecha_elaboracion", "la fecha en que se elaboró el estudio");
    if (fecha > hoyCR()) throw new ErrorUsuario("La fecha del estudio no puede ser en el futuro.");
    const vence = textoObligatorio(f, "fecha_vencimiento", "la fecha de vencimiento del estudio");
    if (vence <= fecha) throw new ErrorUsuario("La fecha de vencimiento debe ser después de la fecha en que se elaboró.");
    await consultar(async (tx) => {
      const doc = await guardarArchivo(tx, f.get("documento"));
      const n = await tx.insertInto("estudios_socioeconomicos").values({
        nino_id: ninoId, fecha_elaboracion: fecha, fecha_vencimiento: vence, trabajador_social: texto(f, "trabajador_social"), documento_url: doc, observaciones: texto(f, "observaciones"),
      }).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario("No tiene permiso para registrar estudios.");
    });
    return {};
  });
  if (r.ok) { revalidatePath(`/portal/ninos/${ninoId}`); revalidatePath("/portal/ninos", "layout"); revalidatePath("/portal", "layout"); }
  return r;
}
