"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import { diasHabiles } from "@/lib/calculos/planilla";
import { CON_BOLETA, TIPOS_AUSENCIA, type TipoAusencia } from "./tipos";

type R = Resultado | null;

export async function registrarAusencia(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const empleado = textoObligatorio(f, "empleado_id", "la persona");
    const tipo = textoObligatorio(f, "tipo", "el tipo") as TipoAusencia;
    if (!(tipo in TIPOS_AUSENCIA)) throw new ErrorUsuario("Elija un tipo de la lista.");
    const desde = textoObligatorio(f, "desde", "la fecha de inicio");
    const hasta = textoObligatorio(f, "hasta", "la fecha final");
    if (hasta < desde) throw new ErrorUsuario("La fecha final no puede ser antes de la de inicio.");
    const boleta = texto(f, "numero_boleta");
    if (CON_BOLETA.includes(tipo) && !boleta) throw new ErrorUsuario("Falta el número de boleta de la incapacidad.");
    const dias = numero(f, "dias_habiles") ?? diasHabiles(desde, hasta);
    if (dias < 0) throw new ErrorUsuario("Los días hábiles no pueden ser negativos.");
    await consultar(async (tx) => {
      const doc = await guardarArchivo(tx, f.get("documento"));
      await tx.insertInto("ausencias").values({
        empleado_id: empleado, tipo, desde, hasta, dias_habiles: dias, numero_boleta: boleta, documento_url: doc, observaciones: texto(f, "observaciones"),
      }).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/ausencias");
  return r;
}
