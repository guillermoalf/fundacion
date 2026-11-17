"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { hashPassword } from "better-auth/crypto";
import { obtenerSesion } from "@/lib/portal/sesion";
import { casilla, ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import { hoyCR } from "@/lib/portal/formato";

type R = Resultado | null;

function datos(f: FormData) {
  const horas = numero(f, "horas_jornada_diaria") ?? 8;
  if (horas <= 0 || horas > 24) throw new ErrorUsuario("Las horas de la jornada deben estar entre 1 y 24.");
  return {
    cedula: textoObligatorio(f, "cedula", "la cédula"),
    nombre: textoObligatorio(f, "nombre", "el nombre"),
    puesto: textoObligatorio(f, "puesto", "el puesto"),
    ubicacion_id: entero(f, "ubicacion_id"),
    fuente_id: entero(f, "fuente_id"),
    fecha_ingreso: textoObligatorio(f, "fecha_ingreso", "la fecha de ingreso"),
    fecha_salida: texto(f, "fecha_salida"),
    horas_jornada_diaria: horas,
  };
}

export async function crearEmpleado(_: R, f: FormData): Promise<R> {
  const { consultar, editaSalarios } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const d = datos(f);
    const salario = editaSalarios ? numero(f, "salario_mensual") : null;
    if (salario !== null && salario < 0) throw new ErrorUsuario("El salario no puede ser negativo.");
    const id = await consultar(async (tx) => {
      const foto = await guardarArchivo(tx, f.get("foto"));
      const { id } = await tx.insertInto("empleados").values({ ...d, foto_url: foto }).returning("id").executeTakeFirstOrThrow();
      if (salario !== null) await tx.insertInto("salarios").values({ empleado_id: id, salario_mensual: salario, vigente_desde: d.fecha_ingreso, motivo: "Salario de ingreso" }).execute();
      return id;
    });
    return { id };
  });
  if (r.ok) {
    revalidatePath("/portal/personal");
    redirect(`/portal/personal/${r.id}?guardado=1`);
  }
  return r;
}

export async function editarEmpleado(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const d = datos(f);
    const activo = casilla(f, "activo");
    if (!activo && !d.fecha_salida) throw new ErrorUsuario("Para desactivar a alguien anote su fecha de salida.");
    await consultar(async (tx) => {
      const foto = await guardarArchivo(tx, f.get("foto"));
      const n = await tx.updateTable("empleados").set({ ...d, activo, ...(foto ? { foto_url: foto } : {}) }).where("id", "=", id).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario("No tiene permiso para editar al personal.");
    });
    return {};
  });
  if (r.ok) {
    revalidatePath(`/portal/personal/${id}`);
    redirect(`/portal/personal/${id}?guardado=1`);
  }
  return r;
}

/** Horario nuevo desde una fecha: cierra el anterior (queda en el historial) y abre el nuevo. */
export async function guardarHorario(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const desde = texto(f, "vigente_desde") ?? hoyCR();
    const dias = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ d, entrada: texto(f, `entrada_${d}`), salida: texto(f, `salida_${d}`) }));
    for (const x of dias) {
      if (!!x.entrada !== !!x.salida) throw new ErrorUsuario("En cada día ponga hora de entrada y de salida, o deje las dos vacías.");
      if (x.entrada && x.salida && x.salida <= x.entrada) throw new ErrorUsuario("La hora de salida debe ser después de la de entrada.");
    }
    await consultar(async (tx) => {
      // Lo que empezaba el mismo día se reemplaza; lo anterior se cierra el día antes.
      const abiertos = await tx.selectFrom("horarios").select(["id", "vigente_desde"]).where("empleado_id", "=", id).where("vigente_hasta", "is", null).execute();
      for (const h of abiertos) {
        if (h.vigente_desde >= desde) await tx.updateTable("horarios").set({ vigente_hasta: h.vigente_desde }).where("id", "=", h.id).execute();
        else await tx.updateTable("horarios").set({ vigente_hasta: sql<string>`(${desde}::date - 1)` }).where("id", "=", h.id).execute();
      }
      const nuevos = dias.filter((x) => x.entrada);
      if (nuevos.length) {
        await tx.insertInto("horarios").values(nuevos.map((x) => ({ empleado_id: id, dia_semana: x.d, hora_entrada: x.entrada!, hora_salida: x.salida!, vigente_desde: desde })))
          .onConflict((oc) => oc.columns(["empleado_id", "dia_semana", "vigente_desde"]).doUpdateSet((eb) => ({ hora_entrada: eb.ref("excluded.hora_entrada"), hora_salida: eb.ref("excluded.hora_salida"), vigente_hasta: null })))
          .execute();
      }
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/personal/${id}`);
  return r;
}

export async function asignarPin(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const id = textoObligatorio(f, "id", "la persona");
    const pin = texto(f, "pin") ?? "";
    if (!/^\d{4}$/.test(pin)) throw new ErrorUsuario("El PIN debe tener exactamente 4 números.");
    if (pin !== texto(f, "pin2")) throw new ErrorUsuario("Los dos PIN no coinciden.");
    if (/^(\d)\1{3}$/.test(pin) || ["1234", "4321", "0123"].includes(pin)) throw new ErrorUsuario("Ese PIN es muy fácil de adivinar. Elija otro.");
    const hash = await hashPassword(pin);
    await consultar((tx) => sql`select asignar_pin_empleado(${id}::uuid, ${hash})`.execute(tx));
    return {};
  });
  if (r.ok) revalidatePath("/portal/personal");
  return r;
}

/** Salario nuevo desde una fecha (aumento, cambio de jornada…). El anterior queda en el historial. Solo admin y contabilidad (RLS). */
export async function cambiarSalario(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const salario = numero(f, "salario_mensual");
    if (salario === null || salario < 0) throw new ErrorUsuario("Falta el salario mensual (o es negativo).");
    const desde = textoObligatorio(f, "vigente_desde", "desde cuándo rige");
    await consultar((tx) =>
      tx.insertInto("salarios").values({ empleado_id: id, salario_mensual: salario, vigente_desde: desde, motivo: texto(f, "motivo") })
        .onConflict((oc) => oc.columns(["empleado_id", "vigente_desde"]).doUpdateSet({ salario_mensual: salario, motivo: texto(f, "motivo") })).execute(),
    );
    return {};
  });
  if (r.ok) revalidatePath(`/portal/personal/${id}`);
  return r;
}
