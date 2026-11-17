import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { conDepreciacion, consultaActivos } from "@/lib/portal/activos";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { colones, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Activos" };

const TONO_ESTADO = { en_uso: "verde", en_reparacion: "ambar", en_bodega: "gris", extraviado: "rojo", dado_de_baja: "gris" } as const;

export default async function ActivosPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const activos = (await consultar((tx) => consultaActivos(tx).orderBy("u.nombre").orderBy("a.placa").execute())).map((a) => conDepreciacion(a, hoy));
  const vigentes = activos.filter((a) => a.estado !== "dado_de_baja");
  const totalLibros = vigentes.reduce((s, a) => s + (a.valorLibros ?? 0), 0);
  const sinValor = vigentes.filter((a) => a.valorLibros === null).length;

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Activos" }]}
        titulo="Activos"
        descripcion={
          <>
            {vigentes.length} activos en uso · valor en libros hoy: <strong>{colones(totalLibros)}</strong>
            {sinValor > 0 && <> (sin contar {sinValor} a los que les falta costo, fecha o categoría)</>}
          </>
        }
        acciones={
          <>
            {puedeEscribir && <Link href="/portal/activos/nuevo" className={estiloBoton.primario}>+ Nuevo activo</Link>}
            {puedeEscribir && <Link href="/portal/activos/importar" className={estiloBoton.secundario}>Importar Excel</Link>}
            <Link href="/portal/activos/etiquetas" className={estiloBoton.secundario}>Imprimir etiquetas</Link>
          </>
        }
      />
      <Tabla
        columnas={[
          { clave: "bien", titulo: "Activo" },
          { clave: "placa", titulo: "Placa" },
          { clave: "ubicacion", titulo: "Ubicación" },
          { clave: "fuente", titulo: "Fuente" },
          { clave: "estado", titulo: "Estado" },
          { clave: "costo", titulo: "Costo", alinear: "derecha", ocultarEnMovil: true },
          { clave: "libros", titulo: "Valor en libros", alinear: "derecha" },
        ]}
        filtros={[{ clave: "ubicacion", titulo: "Ubicación" }, { clave: "fuente", titulo: "Fuente" }, { clave: "estado", titulo: "Estado" }, { clave: "categoria", titulo: "Categoría" }]}
        filas={activos.map((a) => ({
          id: a.id,
          href: `/portal/activos/${a.id}`,
          celdas: {
            bien: [a.tipo_bien, a.marca].filter(Boolean).join(" · "),
            placa: a.placa,
            ubicacion: a.ubicacion,
            fuente: a.fuente,
            estado: { texto: ESTADOS_ACTIVO[a.estado], tono: TONO_ESTADO[a.estado] },
            costo: colones(a.costo),
            libros: a.estado === "dado_de_baja" ? { vacio: true } : colones(a.valorLibros),
          },
          orden: { costo: a.costo === null ? null : Number(a.costo), libros: a.valorLibros, placa: a.placa },
          filtros: { ubicacion: a.ubicacion, fuente: a.fuente, estado: ESTADOS_ACTIVO[a.estado], categoria: a.categoria ?? "Sin categoría" },
        }))}
        vacio={
          <Vacio
            titulo="Todavía no hay activos registrados."
            accion={puedeEscribir && <Link href="/portal/activos/importar" className={estiloBoton.primario}>Importar el Excel de activos</Link>}
          >
            Puede importar el Excel que ya usa la fundación o registrarlos uno por uno.
          </Vacio>
        }
      />
    </>
  );
}
