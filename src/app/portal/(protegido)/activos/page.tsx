import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { conDepreciacion, consultaActivos } from "@/lib/portal/activos";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { colones, fecha, hoyCR } from "@/lib/portal/formato";
import { VolverAlBorrador } from "../../_ui/Borrador";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton } from "../../_ui/estilos";
import { alfa } from "@/lib/db/orden";

export const metadata: Metadata = { title: "Activos" };

const TONO_ESTADO = { en_uso: "verde", en_reparacion: "ambar", en_bodega: "gris", extraviado: "rojo", dado_de_baja: "gris" } as const;

export default async function ActivosPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const hoy = hoyCR();
  const activos = (await consultar((tx) => consultaActivos(tx).orderBy(alfa("u.nombre")).orderBy("a.placa").execute())).map((a) => conDepreciacion(a, hoy));
  const vigentes = activos.filter((a) => a.estado !== "dado_de_baja");
  const totalLibros = vigentes.reduce((s, a) => s + (a.valorLibros ?? 0), 0);
  const sinValor = vigentes.filter((a) => a.valorLibros === null).length;

  return (
    <>
      <VolverAlBorrador nombre="activo" href="/portal/activos/nuevo" />
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
            {puedeEscribir && <Link href="/portal/compras/nueva" className={estiloBoton.primario}>+ Registrar compra (factura)</Link>}
            {puedeEscribir && <Link href="/portal/activos/nuevo" className={estiloBoton.secundario}>Activo sin factura</Link>}
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
          { clave: "categoria", titulo: "Categoría (Anexo 2)", oculta: true },
          { clave: "marca", titulo: "Marca", oculta: true },
          { clave: "modelo", titulo: "Modelo", oculta: true },
          { clave: "serie", titulo: "Serie", oculta: true },
          { clave: "adquisicion", titulo: "Fecha de adquisición", oculta: true },
          { clave: "depreciacion", titulo: "Depreciación acumulada", alinear: "derecha", oculta: true },
          { clave: "origen", titulo: "Origen", oculta: true },
        ]}
        filtros={[{ clave: "ubicacion", titulo: "Ubicación" }, { clave: "fuente", titulo: "Fuente" }, { clave: "estado", titulo: "Estado" }, { clave: "categoria", titulo: "Categoría" }]}
        filas={activos.map((a) => ({
          id: a.id,
          href: `/portal/activos/${a.id}`,
          celdas: {
            bien: [a.tipo_bien, a.marca].filter(Boolean).join(" · "),
            placa: a.placa,
            ubicacion: a.ubicacion ?? { texto: "Sin ubicación", tono: "ambar" },
            fuente: a.fuente,
            estado: { texto: ESTADOS_ACTIVO[a.estado], tono: TONO_ESTADO[a.estado] },
            costo: colones(a.costo),
            libros: a.estado === "dado_de_baja" ? { vacio: true } : colones(a.valorLibros),
            categoria: a.categoria,
            marca: a.marca ?? { vacio: true }, modelo: a.modelo ?? { vacio: true }, serie: a.serie ?? { vacio: true },
            adquisicion: fecha(a.fecha_adquisicion),
            depreciacion: colones(a.depreciacion),
            origen: a.compra_linea_id ? "Compra con factura" : a.origen === "importacion" ? "Importado del Excel" : "Registrado a mano",
          },
          orden: { costo: a.costo === null ? null : Number(a.costo), libros: a.valorLibros, placa: a.placa, adquisicion: a.fecha_adquisicion, depreciacion: a.depreciacion },
          filtros: { ubicacion: a.ubicacion ?? "Sin ubicación", fuente: a.fuente, estado: ESTADOS_ACTIVO[a.estado], categoria: a.categoria ?? "Sin categoría" },
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
