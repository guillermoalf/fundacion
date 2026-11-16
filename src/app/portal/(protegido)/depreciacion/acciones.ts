"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";

type R = Resultado | null;

function datos(f: FormData) {
  const tasa = numero(f, "tasa_anual");
  const anios = entero(f, "anios_vida");
  if (tasa === null || tasa <= 0 || tasa > 100) throw new ErrorUsuario("La tasa anual debe estar entre 0 y 100 %.");
  if (anios === null || anios <= 0) throw new ErrorUsuario("Los años de vida útil deben ser un número mayor que cero.");
  return {
    nombre: textoObligatorio(f, "nombre", "el nombre de la fila"),
    tasa_anual: tasa,
    anios_vida: anios,
    referencia: texto(f, "referencia") ?? "Anexo 2 RLISR",
    palabras_clave: (texto(f, "palabras_clave") ?? "").split(",").map((p) => p.trim().toLowerCase()).filter(Boolean),
  };
}

export async function crearCategoria(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const d = datos(f);
    await consultar((tx) => tx.insertInto("categorias_activo").values(d).execute());
    return {};
  });
  if (r.ok) revalidatePath("/portal/depreciacion");
  return r;
}

export async function editarCategoria(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = entero(f, "id")!;
  const r = await ejecutar(async () => {
    const d = datos(f);
    const n = await consultar((tx) => tx.updateTable("categorias_activo").set(d).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("Solo la dirección puede editar la tabla de depreciación.");
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/depreciacion");
    redirect("/portal/depreciacion?guardado=1");
  }
  return r;
}

export async function cambiarActiva(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const id = entero(f, "id")!;
    const activa = f.get("activa") === "true";
    const n = await consultar((tx) => tx.updateTable("categorias_activo").set({ activa }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("Solo la dirección puede cambiar la tabla de depreciación.");
    return {};
  });
  if (r.ok) revalidatePath("/portal/depreciacion");
  return r;
}
