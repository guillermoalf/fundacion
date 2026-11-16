"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import { instanteDesdeCR } from "@/lib/portal/formato";

type R = Resultado | null;

/** Marca digitada desde la hoja de asistencia en papel (plan B si no hubo luz o internet), con la foto de la hoja. */
export async function marcaManual(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const empleado = textoObligatorio(f, "empleado_id", "la persona");
    const tipo = textoObligatorio(f, "tipo", "si es entrada o salida") as "entrada" | "salida";
    const cuando = textoObligatorio(f, "marcado_en", "la fecha y hora");
    const motivo = textoObligatorio(f, "motivo_manual", "el motivo (por ejemplo: hoja firmada del lunes, no había internet)");
    const instante = instanteDesdeCR(cuando);
    if (new Date(instante) > new Date()) throw new ErrorUsuario("La fecha y hora no puede ser en el futuro.");
    await consultar(async (tx) => {
      const doc = await guardarArchivo(tx, f.get("documento"));
      await tx.insertInto("marcas").values({ empleado_id: empleado, tipo, marcado_en: instante, origen: doc ? "hoja_firmada" : "manual", motivo_manual: motivo, documento_url: doc }).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/asistencia");
  return r;
}
