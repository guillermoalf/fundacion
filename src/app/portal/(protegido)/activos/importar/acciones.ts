"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { importarActivosExcel, type CategoriaRef, type FilaImportada, type ResultadoImportacion } from "@/lib/importacion/activosExcel";
import { clienteDB, guardarImportacion, ImportacionDuplicadaError } from "@/lib/importacion/guardar";
import { hoyCR } from "@/lib/portal/formato";
import type { Tx } from "@/lib/db";

const categorias = async (tx: Tx): Promise<CategoriaRef[]> =>
  (await tx.selectFrom("categorias_activo").select(["id", "nombre", "tasa_anual", "anios_vida", "palabras_clave"]).where("activa", "=", true).execute())
    .map((c) => ({ id: c.id, nombre: c.nombre, tasaAnual: Number(c.tasa_anual), aniosVida: c.anios_vida, palabrasClave: c.palabras_clave }));

export type Vista = Resultado<ResultadoImportacion & { archivo: string; fuente: string }> | null;

export async function previsualizar(_: Vista, f: FormData): Promise<Vista> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const archivo = f.get("archivo");
    if (!archivo || typeof archivo === "string" || archivo.size === 0) throw new ErrorUsuario("Elija el archivo de Excel.");
    if (!/\.xlsx$/i.test(archivo.name)) throw new ErrorUsuario("El archivo debe ser de Excel (.xlsx). Si es .xls, ábralo y guárdelo como .xlsx.");
    const fuente = textoObligatorio(f, "fuente", "la fuente de financiamiento");
    const cats = await consultar(categorias);
    try {
      const r = await importarActivosExcel(Buffer.from(await archivo.arrayBuffer()), { categorias: cats, corte: hoyCR() });
      return { ...r, archivo: archivo.name, fuente };
    } catch (e) {
      throw new ErrorUsuario(`No se pudo leer el Excel: ${(e as Error).message}.`);
    }
  });
}

export type Guardado = (Resultado<{ activos: number; ubicacionesCreadas: string[] }> & { duplicado?: boolean }) | null;

export async function confirmar(_: Guardado, f: FormData): Promise<Guardado> {
  const { consultar } = await obtenerSesion();
  let duplicado = false;
  const r = await ejecutar(async () => {
    const filas = JSON.parse(String(f.get("filas"))) as FilaImportada[];
    const opts = { fuenteCodigo: String(f.get("fuente")), archivo: String(f.get("archivo")), forzar: f.get("forzar") === "true" };
    try {
      return await consultar(async (tx) => {
        const cats = await categorias(tx);
        return guardarImportacion(clienteDB(tx), filas, { ...opts, categoriaIdPorNombre: new Map(cats.map((c) => [c.nombre, c.id!])) });
      });
    } catch (e) {
      if (e instanceof ImportacionDuplicadaError) {
        duplicado = true;
        throw new ErrorUsuario(e.message);
      }
      throw e;
    }
  });
  if (r.ok) revalidatePath("/portal/activos");
  return duplicado ? { ...r, duplicado } : r;
}
