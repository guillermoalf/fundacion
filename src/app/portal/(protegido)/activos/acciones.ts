"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import { hoyCR } from "@/lib/portal/formato";
import type { EstadoActivo, MetodoDepreciacion } from "@/lib/db/tipos";

type R = Resultado | null;

function datosActivo(f: FormData) {
  const costo = numero(f, "costo");
  if (costo !== null && costo < 0) throw new ErrorUsuario("El costo no puede ser negativo.");
  const residual = numero(f, "valor_residual") ?? 0;
  if (costo !== null && residual > costo) throw new ErrorUsuario("El valor residual no puede ser mayor que el costo.");
  const tasa = numero(f, "tasa_anual_override");
  if (tasa !== null && (tasa <= 0 || tasa > 100)) throw new ErrorUsuario("La tasa debe estar entre 0 y 100 %.");
  return {
    placa: texto(f, "placa"),
    tipo_bien: textoObligatorio(f, "tipo_bien", "el tipo de bien (qué es)"),
    marca: texto(f, "marca"),
    modelo: texto(f, "modelo"),
    serie: texto(f, "serie"),
    categoria_id: entero(f, "categoria_id"),
    fuente_id: entero(f, "fuente_id") ?? (() => { throw new ErrorUsuario("Falta la fuente de financiamiento."); })(),
    fecha_adquisicion: texto(f, "fecha_adquisicion"),
    costo,
    valor_residual: residual,
    metodo: (texto(f, "metodo") ?? "linea_recta") as MetodoDepreciacion,
    tasa_anual_override: tasa,
    notas: texto(f, "notas"),
  };
}

export async function crearActivo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const datos = datosActivo(f);
    const ubicacion = entero(f, "ubicacion_id");
    const cantidad = entero(f, "cantidad") ?? 1;
    if (cantidad < 1 || cantidad > 200) throw new ErrorUsuario("La cantidad debe estar entre 1 y 200.");
    const placas = (texto(f, "placas") ?? datos.placa ?? "").split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
    if (placas.length > cantidad) throw new ErrorUsuario(`Hay más placas (${placas.length}) que unidades (${cantidad}).`);
    const ids = await consultar(async (tx) => {
      const foto = await guardarArchivo(tx, f.get("foto"));
      const creados: string[] = [];
      // Un activo por unidad, cada uno con su placa (las que falten quedan en Pendientes).
      for (let u = 0; u < cantidad; u++) {
        const { id } = await tx.insertInto("activos").values({ ...datos, placa: placas[u] ?? null, ubicacion_id: ubicacion, foto_url: foto, origen: "formulario" }).returning("id").executeTakeFirstOrThrow();
        await tx.insertInto("activo_movimientos").values({ activo_id: id, tipo: "alta", ubicacion_destino_id: ubicacion, motivo: texto(f, "motivo_alta") ?? "Registro en el portal" }).execute();
        creados.push(id);
      }
      return creados;
    });
    return { id: ids[0], cantidad: ids.length };
  });
  if (r.ok) {
    revalidatePath("/portal/activos");
    redirect(r.cantidad > 1 ? "/portal/activos" : `/portal/activos/${r.id}?guardado=1`);
  }
  return r;
}

export async function editarActivo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const datos = datosActivo(f);
    const estado = (texto(f, "estado") ?? "en_uso") as EstadoActivo;
    if (estado === "dado_de_baja") throw new ErrorUsuario("Para dar de baja use el botón «Dar de baja», que pide el motivo.");
    await consultar(async (tx) => {
      const foto = await guardarArchivo(tx, f.get("foto"));
      const n = await tx.updateTable("activos").set({ ...datos, estado, ...(foto ? { foto_url: foto } : {}) })
        .where("id", "=", id).where("estado", "<>", "dado_de_baja").returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario("No se pudo editar: el activo está dado de baja o no tiene permiso.");
    });
    return {};
  });
  if (r.ok) {
    revalidatePath(`/portal/activos/${id}`);
    redirect(`/portal/activos/${id}?guardado=1`);
  }
  return r;
}

export async function trasladarActivo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const id = textoObligatorio(f, "id", "el activo");
    const destino = entero(f, "destino");
    if (!destino) throw new ErrorUsuario("Elija a dónde se traslada.");
    const motivo = textoObligatorio(f, "motivo", "el motivo del traslado");
    await consultar(async (tx) => {
      const a = await tx.selectFrom("activos").select(["ubicacion_id", "estado"]).where("id", "=", id).executeTakeFirstOrThrow();
      if (a.estado === "dado_de_baja") throw new ErrorUsuario("Un activo dado de baja no se traslada.");
      if (a.ubicacion_id === destino) throw new ErrorUsuario("El activo ya está en esa ubicación.");
      const documento = await guardarArchivo(tx, f.get("documento"));
      await tx.insertInto("activo_movimientos").values({
        activo_id: id, tipo: "traslado", fecha: texto(f, "fecha") ?? hoyCR(), ubicacion_origen_id: a.ubicacion_id, ubicacion_destino_id: destino, motivo, documento_url: documento,
      }).execute();
      await tx.updateTable("activos").set({ ubicacion_id: destino }).where("id", "=", id).execute();
    });
    revalidatePath(`/portal/activos/${id}`);
    return {};
  });
}

export async function darDeBaja(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const motivo = textoObligatorio(f, "motivo", "el motivo de la baja");
    const fecha = texto(f, "fecha") ?? hoyCR();
    await consultar(async (tx) => {
      const documento = await guardarArchivo(tx, f.get("documento"));
      const a = await tx.updateTable("activos").set({ estado: "dado_de_baja", fecha_baja: fecha, motivo_baja: motivo })
        .where("id", "=", id).where("estado", "<>", "dado_de_baja").returning("ubicacion_id").executeTakeFirst();
      if (!a) throw new ErrorUsuario("El activo ya estaba dado de baja o no tiene permiso.");
      await tx.insertInto("activo_movimientos").values({ activo_id: id, tipo: "baja", fecha, ubicacion_origen_id: a.ubicacion_id, motivo, documento_url: documento }).execute();
    });
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/activos");
    redirect(`/portal/activos/${id}?guardado=baja`);
  }
  return r;
}

/** Revierte la baja (solo el superadministrador, con motivo): el activo vuelve a la lista de Activos. */
export async function revertirBaja(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const motivo = textoObligatorio(f, "motivo", "el motivo");
    await consultar((tx) => sql`select revertir_baja(${id}::uuid, ${motivo})`.execute(tx));
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/activos");
    revalidatePath("/portal/activos/desecho");
    redirect(`/portal/activos/${id}`);
  }
  return r;
}

/** Color de una ubicación (Dirección). Vacío = automático. */
export async function cambiarColorUbicacion(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const id = entero(f, "id");
    const color = texto(f, "color");
    if (id === null) throw new ErrorUsuario("Falta la ubicación.");
    await consultar((tx) => tx.updateTable("ubicaciones").set({ color }).where("id", "=", id).execute());
    revalidatePath("/portal/activos", "layout");
    return {};
  });
}

/** Nueva ubicación (aula, bodega, oficina…). */
export async function crearUbicacion(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const nombre = textoObligatorio(f, "nombre", "el nombre");
    await consultar((tx) => tx.insertInto("ubicaciones").values({ nombre, color: texto(f, "color") }).execute());
    revalidatePath("/portal/activos", "layout");
    return {};
  });
}

/** Boleta de egreso: el activo sale a revisión o reparación (no se da de baja). Queda «En revisión» con su boleta. */
export async function registrarEgreso(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  return ejecutar(async () => {
    const motivo = textoObligatorio(f, "motivo", "el motivo (a dónde va y por qué)");
    await consultar(async (tx) => {
      const documento = await guardarArchivo(tx, f.get("documento"));
      const a = await tx.updateTable("activos").set({ estado: "en_reparacion" })
        .where("id", "=", id).where("estado", "not in", ["dado_de_baja", "en_reparacion"]).returning("ubicacion_id").executeTakeFirst();
      if (!a) throw new ErrorUsuario("El activo ya está en revisión, dado de baja o no tiene permiso.");
      await tx.insertInto("activo_movimientos").values({ activo_id: id, tipo: "reparacion", fecha: texto(f, "fecha") ?? hoyCR(), ubicacion_origen_id: a.ubicacion_id, motivo, documento_url: documento }).execute();
    });
    revalidatePath(`/portal/activos/${id}`);
    revalidatePath("/portal/activos");
    return {};
  });
}

/** El activo regresó de revisión: vuelve a «En uso» en su ubicación. */
export async function registrarRetorno(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  return ejecutar(async () => {
    const motivo = texto(f, "motivo") ?? "Regresó de revisión";
    await consultar(async (tx) => {
      const documento = await guardarArchivo(tx, f.get("documento"));
      const a = await tx.updateTable("activos").set({ estado: "en_uso" }).where("id", "=", id).where("estado", "=", "en_reparacion").returning("ubicacion_id").executeTakeFirst();
      if (!a) throw new ErrorUsuario("El activo no está en revisión o no tiene permiso.");
      await tx.insertInto("activo_movimientos").values({ activo_id: id, tipo: "retorno", fecha: texto(f, "fecha") ?? hoyCR(), ubicacion_destino_id: a.ubicacion_id, motivo, documento_url: documento }).execute();
    });
    revalidatePath(`/portal/activos/${id}`);
    revalidatePath("/portal/activos");
    return {};
  });
}
