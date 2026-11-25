import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton, estiloTarjeta } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Pendientes" };

/** Qué hacer con cada tipo de pendiente (en palabras de la directora). */
const AYUDA: Record<string, string> = {
  "Sin ubicación": "Decidir dónde va a estar y asignarla desde la ficha del activo («Asignar ubicación»).",
  "Sin placa": "Ponerle una placa al bien y anotarla en el activo.",
  "Placa repetida en otro activo": "Dos activos tienen la misma placa: revise cuál es la correcta y corrija la otra.",
  "Sin fecha de adquisición": "Buscar la factura y anotar la fecha de compra (sin fecha no se puede calcular la depreciación).",
  "Sin costo de adquisición": "Buscar la factura y anotar el costo (sin costo no hay valor en libros).",
  "Sin categoría de depreciación": "Elegir la fila del Anexo 2 que corresponde al bien.",
  "Sin factura adjunta": "Registrar la compra con su factura en Compras y ligarle este activo.",
  "Serie repetida en otro activo": "Dos activos tienen el mismo número de serie: revise si es un error de digitación.",
};

export default async function PendientesPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const { alertas, lineas } = await consultar(async (tx) => {
    const alertas = await tx.selectFrom("v_activos_alertas").select(["activo_id", "placa", "tipo_bien", "ubicacion", "alerta"]).orderBy("ubicacion").orderBy("placa").execute();
    const ids = [...new Set(alertas.map((a) => a.activo_id!))];
    const lineas = ids.length
      ? await tx.selectFrom("activos as a").leftJoin("compra_lineas as l", "l.id", "a.compra_linea_id").select(["a.id", "a.compra_linea_id", "l.compra_id"]).where("a.id", "in", ids).execute()
      : [];
    return { alertas, lineas };
  });
  const porTipo = new Map<string, number>();
  for (const a of alertas) porTipo.set(a.alerta!, (porTipo.get(a.alerta!) ?? 0) + 1);
  const activosConAlgo = new Set(alertas.map((a) => a.activo_id)).size;

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
  const visibles = [...grupos.values()].filter((g) => !tipo || g.activos[0].pendientes.includes(tipo));

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Pendientes" }]}
        titulo="Pendientes"
        descripcion={alertas.length ? `${activosConAlgo} activos tienen algo por completar. Nada de esto bloquea el trabajo: se va completando poco a poco.` : undefined}
      />
      {alertas.length === 0 ? (
        <Vacio titulo="¡Todo al día!">Todos los activos tienen placa, fecha, costo, categoría y factura.</Vacio>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...porTipo].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <Link
                key={t}
                href={tipo === t ? "/portal/pendientes" : `/portal/pendientes?tipo=${encodeURIComponent(t)}`}
                className={`${estiloTarjeta} block transition hover:border-sky-300 ${tipo === t ? "border-sky-400 ring-2 ring-sky-200" : ""}`}
              >
                <p className="text-3xl font-bold">{n}</p>
                <p className="text-lg font-semibold">{t}</p>
                <p className="mt-1 text-sm text-slate-600">{AYUDA[t] ?? ""}</p>
              </Link>
            ))}
          </div>
          {tipo && (
            <p className="text-base">
              Mostrando solo «{tipo}». <Link href="/portal/pendientes" className={estiloBoton.enlace}>Ver todos</Link>
            </p>
          )}
          <Tabla
            columnas={[
              { clave: "activo", titulo: "Activo" },
              { clave: "unidades", titulo: "Unidades", alinear: "derecha" },
              { clave: "placa", titulo: "Placa" },
              { clave: "ubicacion", titulo: "Ubicación" },
              { clave: "pendientes", titulo: "Pendientes" },
              { clave: "accion", titulo: "" },
            ]}
            filtros={[{ clave: "ubicacion", titulo: "Ubicación" }]}
            filas={visibles.map((g) => {
              const a = g.activos[0];
              const n = g.activos.length;
              const varios = n > 1;
              return {
                id: a.id,
                href: varios && g.compra ? `/portal/compras/${g.compra}` : `/portal/activos/${a.id}`,
                celdas: {
                  activo: a.tipoBien,
                  unidades: n,
                  placa: a.placa ?? { texto: "Sin placa", tono: "ambar" },
                  ubicacion: a.ubicacion ?? { texto: "Sin ubicación", tono: "ambar" },
                  pendientes: { texto: `${a.pendientes.length} ${a.pendientes.length === 1 ? "pendiente" : "pendientes"}`, tono: "ambar", ayuda: a.pendientes },
                  accion: varios
                    ? (g.compra ? { texto: `Ver las ${n} →`, href: `/portal/compras/${g.compra}` } : { texto: "Completar →", href: `/portal/activos/${a.id}` })
                    : puedeEscribir ? { texto: "Completar →", href: `/portal/activos/${a.id}/editar` } : { texto: "Ver →", href: `/portal/activos/${a.id}` },
                },
                orden: { unidades: n },
                filtros: { ubicacion: a.ubicacion ?? "Sin ubicación" },
              };
            })}
          />
        </div>
      )}
    </>
  );
}
