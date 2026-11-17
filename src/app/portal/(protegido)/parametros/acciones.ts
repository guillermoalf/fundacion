"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";

type R = Resultado | null;

/** Valor nuevo de un parámetro desde una fecha (el anterior se conserva: los cálculos pasados no cambian). */
export async function agregarParametro(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const valor = numero(f, "valor");
    if (valor === null) throw new ErrorUsuario("Falta el valor.");
    await consultar((tx) => tx.insertInto("parametros").values({
      clave: textoObligatorio(f, "clave", "el parámetro"), valor, vigente_desde: textoObligatorio(f, "vigente_desde", "desde cuándo rige"), fuente_legal: texto(f, "fuente_legal"),
    }).execute());
    return {};
  });
  if (r.ok) revalidatePath("/portal/parametros");
  return r;
}

/** Juego de tramos de renta para un año (o corrige el de esa misma fecha). Solo admin (RLS). */
export async function guardarTramos(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const desde = textoObligatorio(f, "vigente_desde", "desde cuándo rigen");
    const fuente = textoObligatorio(f, "fuente_legal", "el decreto de Hacienda");
    const tramos: { desde: number; hasta: number | null; tasa: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const d = numero(f, `desde_${i}`);
      const t = numero(f, `tasa_${i}`);
      if (d === null && t === null) continue;
      if (d === null || t === null) throw new ErrorUsuario(`En la fila ${i + 1} falta el monto o el porcentaje.`);
      tramos.push({ desde: d, hasta: numero(f, `hasta_${i}`), tasa: t });
    }
    if (tramos.length === 0) throw new ErrorUsuario("Agregue al menos un tramo.");
    tramos.sort((a, b) => a.desde - b.desde);
    if (tramos[0].desde !== 0) throw new ErrorUsuario("El primer tramo debe empezar en ₡0.");
    for (let i = 0; i < tramos.length; i++) {
      const sig = tramos[i + 1];
      if (sig && tramos[i].hasta !== sig.desde) throw new ErrorUsuario("Cada tramo debe terminar donde empieza el siguiente.");
      if (!sig && tramos[i].hasta !== null) throw new ErrorUsuario("El último tramo debe quedar abierto (sin «hasta»).");
    }
    await consultar(async (tx) => {
      for (const t of tramos) {
        await tx.insertInto("tramos_renta").values({ vigente_desde: desde, ...t, fuente_legal: fuente })
          .onConflict((oc) => oc.columns(["vigente_desde", "desde"]).doUpdateSet({ hasta: t.hasta, tasa: t.tasa, fuente_legal: fuente })).execute();
      }
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/parametros");
  return r;
}
