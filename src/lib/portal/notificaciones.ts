import type { Tx } from "@/lib/db";
import { hoyCR } from "@/lib/portal/formato";
import { estudiosPani, resumenEstudios } from "@/lib/portal/estudios";

export type Notificacion = { clave: string; titulo: string; detalle: string; tono: "rojo" | "ambar"; href: string; cantidad: number };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Avisos que piden atención (se ven en «Notificaciones» del menú). Cada usuario ve solo los que le tocan:
 * estudios socioeconómicos (quien ve las notas de los niños), vacaciones por aprobar (dirección) y productos bajo el mínimo.
 */
export async function notificaciones(tx: Tx, permisos: { veNotasNinos: boolean; esAdmin: boolean; esPersonal: boolean }): Promise<Notificacion[]> {
  const lista: Notificacion[] = [];
  if (permisos.veNotasNinos) {
    const e = resumenEstudios((await estudiosPani(tx, hoyCR())).estudios);
    const urgentes = e.falta + e.vencido + e.urgente;
    if (urgentes) {
      lista.push({
        clave: "estudios-urgentes", tono: "rojo", href: "/portal/ninos/estudios", cantidad: urgentes,
        titulo: "Estudios socioeconómicos PANI urgentes",
        detalle: [e.vencido && plural(e.vencido, "vencido", "vencidos"), e.urgente && `${plural(e.urgente, "vence", "vencen")} en menos de 3 meses`,
          e.falta && plural(e.falta, "niño sin estudio registrado", "niños sin estudio registrado")].filter(Boolean).join(" · "),
      });
    }
    if (e.aviso) {
      lista.push({ clave: "estudios-aviso", tono: "ambar", href: "/portal/ninos/estudios", cantidad: e.aviso,
        titulo: "Estudios socioeconómicos PANI por vencer", detalle: `${plural(e.aviso, "vence", "vencen")} en menos de 6 meses` });
    }
  }
  if (permisos.esAdmin) {
    const { n } = await tx.selectFrom("solicitudes_vacaciones").select(({ fn }) => fn.countAll<number>().as("n")).where("estado", "=", "pendiente").executeTakeFirstOrThrow();
    if (Number(n)) lista.push({ clave: "vacaciones", tono: "ambar", href: "/portal/vacaciones", cantidad: Number(n), titulo: "Vacaciones por aprobar", detalle: plural(Number(n), "solicitud pendiente", "solicitudes pendientes") });
  }
  if (!permisos.esPersonal) {
    const bajos = await tx.selectFrom("v_saldo_inventario as v").innerJoin("productos as p", "p.id", "v.producto_id").select(["v.nombre"])
      .where("p.activo", "=", true).where("v.stock_minimo", ">", "0").whereRef("v.saldo", "<", "v.stock_minimo").execute();
    if (bajos.length) {
      lista.push({ clave: "inventario", tono: "ambar", href: "/portal/inventario", cantidad: bajos.length, titulo: "Productos bajo el mínimo",
        detalle: bajos.slice(0, 4).map((b) => b.nombre).join(", ") + (bajos.length > 4 ? "…" : "") });
    }
  }
  return lista;
}
