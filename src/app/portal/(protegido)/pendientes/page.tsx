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
  const alertas = await consultar((tx) =>
    tx.selectFrom("v_activos_alertas").select(["activo_id", "placa", "tipo_bien", "ubicacion", "alerta"]).orderBy("ubicacion").orderBy("placa").execute(),
  );
  const porTipo = new Map<string, number>();
  for (const a of alertas) porTipo.set(a.alerta!, (porTipo.get(a.alerta!) ?? 0) + 1);
  const activosConAlgo = new Set(alertas.map((a) => a.activo_id)).size;
  const visibles = tipo ? alertas.filter((a) => a.alerta === tipo) : alertas;

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
              { clave: "placa", titulo: "Placa" },
              { clave: "ubicacion", titulo: "Ubicación" },
              { clave: "alerta", titulo: "Qué falta" },
              { clave: "accion", titulo: "" },
            ]}
            filtros={[{ clave: "ubicacion", titulo: "Ubicación" }, { clave: "alerta", titulo: "Qué falta" }]}
            filas={visibles.map((a, i) => ({
              id: `${a.activo_id}-${i}`,
              href: `/portal/activos/${a.activo_id}`,
              celdas: {
                activo: a.tipo_bien!,
                placa: a.placa ?? { texto: "Sin placa", tono: "ambar" },
                ubicacion: a.ubicacion!,
                alerta: { texto: a.alerta!, tono: "ambar" },
                accion:
                  a.alerta === "Sin factura adjunta"
                    ? { texto: "Ir a Compras", href: "/portal/compras" }
                    : puedeEscribir ? { texto: "Completar →", href: `/portal/activos/${a.activo_id}/editar` } : { vacio: true },
              },
              filtros: { ubicacion: a.ubicacion!, alerta: a.alerta! },
            }))}
          />
        </div>
      )}
    </>
  );
}
