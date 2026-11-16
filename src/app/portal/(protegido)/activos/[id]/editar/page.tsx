import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { catalogosActivos } from "@/lib/portal/catalogos";
import Encabezado from "../../../../_ui/Encabezado";
import SinPermiso from "../../../../_ui/SinPermiso";
import Vacio from "../../../../_ui/Vacio";
import { estiloTarjeta } from "../../../../_ui/estilos";
import FormularioActivo from "../../FormularioActivo";

export const metadata: Metadata = { title: "Editar activo" };

export default async function EditarActivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { consultar, puedeEscribir } = await obtenerSesion();
  if (!puedeEscribir) return <SinPermiso que="la edición de activos" />;
  const { a, c } = await consultar(async (tx) => ({
    a: await tx.selectFrom("activos").selectAll().where("id", "=", id).executeTakeFirst(),
    c: await catalogosActivos(tx),
  }));
  if (!a) notFound();
  const nombre = `${a.tipo_bien}${a.placa ? ` · placa ${a.placa}` : ""}`;
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Activos", href: "/portal/activos" }, { etiqueta: nombre, href: `/portal/activos/${id}` }, { etiqueta: "Editar" }]} titulo={`Editar: ${nombre}`} />
      {a.estado === "dado_de_baja" ? (
        <Vacio titulo="Este activo está dado de baja.">Ya no se edita: su información queda tal como estaba al darlo de baja.</Vacio>
      ) : (
        <div className={estiloTarjeta}>
          <FormularioActivo
            v={{ ...a, costo: a.costo, valor_residual: a.valor_residual, tasa_anual_override: a.tasa_anual_override }}
            ubicaciones={[]}
            fuentes={c.fuentes.filter((x) => x.activo || x.id === a.fuente_id).map((x) => ({ valor: x.id, texto: `${x.codigo} · ${x.nombre}` }))}
            categorias={c.categorias.filter((x) => x.activa || x.id === a.categoria_id).map((x) => ({ valor: x.id, texto: `${x.nombre} (${Number(x.tasa_anual)} %)${x.activa ? "" : " — retirada"}` }))}
          />
        </div>
      )}
    </>
  );
}
