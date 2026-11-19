"use client";

import { useActionState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, Casilla, MensajeError, Seleccion, FormularioAccion } from "../../_ui/Formulario";
import { colones } from "@/lib/portal/formato";
import { useAvisoResultado } from "../../_ui/Avisos";
import { crearActivo, editarActivo } from "./acciones";

type Opcion = { valor: number | string; texto: string };
export type ValoresActivo = {
  id?: string; placa?: string | null; tipo_bien?: string; ubicacion_id?: number | null; marca?: string | null; modelo?: string | null; serie?: string | null;
  categoria_id?: number | null; fuente_id?: number; fecha_adquisicion?: string | null; costo?: string | null;
  valor_residual?: string; metodo?: string; tasa_anual_override?: string | null; notas?: string | null; estado?: string;
};

const ESTADOS = [
  { valor: "en_uso", texto: "En uso" },
  { valor: "en_reparacion", texto: "En reparación" },
  { valor: "en_bodega", texto: "En bodega" },
  { valor: "extraviado", texto: "Extraviado" },
];

export default function FormularioActivo({ v = {}, ubicaciones, fuentes, categorias, umbral = null }: { v?: ValoresActivo; ubicaciones: Opcion[]; fuentes: Opcion[]; categorias: Opcion[]; umbral?: number | null }) {
  const editando = !!v.id;
  const [estado, accion, accionPendiente] = useActionState(editando ? editarActivo : crearActivo, null);
  useAvisoResultado(estado, "Guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="space-y-6">
      {editando && <input type="hidden" name="id" value={v.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Qué es</legend>
        <Campo etiqueta="Tipo de bien" name="tipo_bien" defaultValue={v.tipo_bien} required placeholder="Ej.: Refrigeradora, Silla plástica, Tobogán" />
        {editando ? (
          <Campo etiqueta="Placa" name="placa" defaultValue={v.placa ?? ""} ayuda="Si todavía no tiene placa, déjela vacía: queda como pendiente." />
        ) : (
          <>
            <Campo etiqueta="Cantidad (unidades iguales)" name="cantidad" type="number" min={1} max={200} defaultValue="1" required ayuda="Ej.: 6 sillas de bebé iguales = 6. Se crea una ficha por unidad." />
            <Campo etiqueta="Placas (separadas por coma)" name="placas" ayuda="Ej.: 120, 121, 122. Las que falten quedan como pendientes." />
          </>
        )}
        <Campo etiqueta="Marca" name="marca" defaultValue={v.marca ?? ""} />
        <Campo etiqueta="Modelo" name="modelo" defaultValue={v.modelo ?? ""} />
        <Campo etiqueta="Serie" name="serie" defaultValue={v.serie ?? ""} />
        {editando ? (
          <Seleccion etiqueta="Estado" name="estado" opciones={ESTADOS} defaultValue={v.estado ?? "en_uso"} />
        ) : (
          <Seleccion etiqueta="Ubicación" name="ubicacion_id" opciones={ubicaciones} vacio="Todavía no se sabe" defaultValue={v.ubicacion_id ?? ""} ayuda="Si todavía no sabe dónde va, déjelo así: queda en Pendientes hasta asignarla." />
        )}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Compra y depreciación</legend>
        <Seleccion etiqueta="Fuente de financiamiento" name="fuente_id" opciones={fuentes} vacio="Elija…" required defaultValue={v.fuente_id ?? ""} />
        <Campo etiqueta="Fecha de compra" name="fecha_adquisicion" type="date" defaultValue={v.fecha_adquisicion ?? ""} ayuda="Si no la sabe, déjela vacía: queda como pendiente." />
        <Campo etiqueta="Precio por unidad (₡)" name="costo" inputMode="decimal" defaultValue={v.costo ?? ""}
          ayuda={umbral ? `Costo de UNA unidad (sin el total). Es activo si supera ${colones(umbral)}; si no, va al inventario.` : "Costo de una unidad. Si no lo sabe, déjelo vacío."} />
        <Seleccion etiqueta="Fila de la tabla de depreciación" name="categoria_id" opciones={categorias} vacio="Sin definir (queda pendiente)" defaultValue={v.categoria_id ?? ""} />
        <details className="sm:col-span-2">
          <summary className="cursor-pointer text-base font-medium text-sky-700">Opciones avanzadas de depreciación</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Seleccion etiqueta="Método" name="metodo" defaultValue={v.metodo ?? "linea_recta"} opciones={[{ valor: "linea_recta", texto: "Línea recta" }, { valor: "suma_digitos", texto: "Suma de dígitos" }]} />
            <Campo etiqueta="Tasa propia (%)" name="tasa_anual_override" inputMode="decimal" defaultValue={v.tasa_anual_override ?? ""} ayuda="Solo si este activo usa otra tasa." />
            <Campo etiqueta="Valor residual (₡)" name="valor_residual" inputMode="decimal" defaultValue={v.valor_residual ?? "0"} />
          </div>
        </details>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Otros</legend>
        <CampoArchivo etiqueta={editando ? "Cambiar foto" : "Foto"} name="foto" aceptar="image/*" />
        <AreaTexto etiqueta="Notas" name="notas" defaultValue={v.notas ?? ""} />
      </fieldset>
      {!editando && <Casilla etiqueta="Es activo aunque cueste menos del monto de baja cuantía (excepción)" name="es_activo_igual" />}
      <MensajeError estado={estado} />
      <BotonEnviar>{editando ? "Guardar cambios" : "Registrar activo"}</BotonEnviar>
    </FormularioAccion>
  );
}
