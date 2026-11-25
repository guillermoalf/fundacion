import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";

export const metadata: Metadata = { title: "Pendientes" };

export default async function PendientesPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const { alertas, lineas } = await consultar(async (tx) => {
    const alertas = await tx.selectFrom("v_activos_alertas").select(["activo_id", "placa", "tipo_bien", "ubicacion", "alerta"]).orderBy("ubicacion").orderBy("placa").execute();
    const ids = [...new Set(alertas.map((a) => a.activo_id!))];
    const lineas = ids.length
      ? await tx.selectFrom("activos as a").leftJoin("compra_lineas as l", "l.id", "a.compra_linea_id").select(["a.id", "a.compra_linea_id", "l.compra_id"]).where("a.id", "in", ids).execute()
      : [];
    return { alertas, lineas };
  });

  // Una fila por activo con sus pendientes; los iguales (mismo bien, misma compra, mismo lugar y mismos pendientes,
  // p. ej. 3 sillas de una factura) se juntan en una sola fila con la cantidad de unidades.
  const porActivo = new Map<string, { id: string; tipoBien: string; placa: string | null; ubicacion: string | null; pendientes: string[] }>();
  for (const a of alertas) {
    const x = porActivo.get(a.activo_id!) ?? { id: a.activo_id!, tipoBien: a.tipo_bien!, placa: a.placa, ubicacion: a.ubicacion, pendientes: [] };
    x.pendientes.push(a.alerta!);
    porActivo.set(a.activo_id!, x);
  }
  const compraDe = new Map(lineas.map((l) => [l.id, { linea: l.compra_linea_id, compra: l.compra_id }]));
  const grupos = new Map<string, { activos: (typeof porActivo extends Map<string, infer V> ? V : never)[]; compra: string | null }>();
  for (const a of porActivo.values()) {
    const c = compraDe.get(a.id);
    const clave = a.placa ? a.id : [a.tipoBien.trim().toLowerCase(), c?.linea ?? a.id, a.ubicacion ?? "", [...a.pendientes].sort().join("|")].join("·");
    const g = grupos.get(clave) ?? { activos: [], compra: c?.compra ?? null };
    g.activos.push(a);
    grupos.set(clave, g);
  }
  const visibles = [...grupos.values()];

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Pendientes" }]} titulo="Pendientes" />
      <Tabla
        columnas={[
          { clave: "activo", titulo: "Activo" },
          { clave: "unidades", titulo: "Unidades", alinear: "derecha" },
          { clave: "placa", titulo: "Placa" },
          { clave: "ubicacion", titulo: "Ubicación" },
          { clave: "accion", titulo: "Pendientes" },
          { clave: "falta", titulo: "Qué falta", oculta: true },
        ]}
        filtros={[{ clave: "ubicacion", titulo: "Ubicación" }]}
        filas={visibles.map((g) => {
          const a = g.activos[0];
          const n = g.activos.length;
          const href = n > 1 && g.compra ? `/portal/compras/${g.compra}` : puedeEscribir ? `/portal/activos/${a.id}/editar` : `/portal/activos/${a.id}`;
          return {
            id: a.id,
            href: n > 1 && g.compra ? `/portal/compras/${g.compra}` : `/portal/activos/${a.id}`,
            celdas: {
              activo: a.tipoBien,
              unidades: n,
              placa: a.placa ?? { texto: "Sin placa", tono: "ambar" },
              ubicacion: a.ubicacion ?? { texto: "Sin ubicación", tono: "ambar" },
              accion: { texto: n > 1 && g.compra ? `Ver las ${n}` : "Completar", href, ayuda: a.pendientes },
              falta: a.pendientes.join(", "),
            },
            orden: { unidades: n },
            filtros: { ubicacion: a.ubicacion ?? "Sin ubicación" },
          };
        })}
        vacio={<Vacio titulo="¡Todo al día!">Todos los activos tienen placa, ubicación, fecha, costo, categoría y factura.</Vacio>}
      />
    </>
  );
}
