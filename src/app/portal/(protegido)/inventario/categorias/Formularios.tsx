"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, Casilla, FormularioAccion, MensajeError, Seleccion } from "../../../_ui/Formulario";
import { useAvisoResultado } from "../../../_ui/Avisos";
import { crearCategoria, editarCategoria } from "../acciones";
import { REPORTES_CATEGORIA } from "../datos";

const OPCIONES_REPORTE = Object.entries(REPORTES_CATEGORIA).map(([valor, texto]) => ({ valor, texto }));

export function FormularioCategoria({ v }: { v?: { codigo: string; nombre: string; reporte: string; orden: number; activo: boolean } }) {
  const [estado, accion, pendiente] = useActionState(v ? editarCategoria : crearCategoria, null);
  useAvisoResultado(estado, v ? "Categoría guardada." : "Categoría agregada.");
  const p = v ? `cat-${v.codigo}-` : "cat-nueva-";
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={!v} className="grid gap-3 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
      {v && <input type="hidden" name="codigo" value={v.codigo} />}
      <Campo etiqueta="Nombre" name="nombre" id={`${p}nombre`} defaultValue={v?.nombre} required placeholder="Ej.: Artículos de jardín" />
      <Seleccion etiqueta="Sale en el reporte" name="reporte" id={`${p}reporte`} opciones={OPCIONES_REPORTE} defaultValue={v?.reporte ?? "ninguno"} required />
      <div className="flex items-center gap-4 pb-1">
        {v && <Casilla etiqueta="En uso" name="activo" id={`${p}activo`} defaultChecked={v.activo} />}
        <BotonEnviar variante={v ? "secundario" : "primario"}>{v ? "Guardar" : "Agregar"}</BotonEnviar>
      </div>
      <div className="sm:col-span-3"><MensajeError estado={estado} /></div>
    </FormularioAccion>
  );
}
