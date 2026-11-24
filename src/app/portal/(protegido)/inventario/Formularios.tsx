"use client";

import { useActionState, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, Casilla, MensajeError, Seleccion, FormularioAccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { crearProducto, editarProducto, registrarMovimiento } from "./acciones";

type Opcion = { valor: number | string; texto: string };
const TIPOS = [
  { valor: "salida", texto: "Salida (entrega a cocina, limpieza, aula…)" },
  { valor: "merma", texto: "Merma (vencido, dañado, perdido)" },
  { valor: "entrada", texto: "Entrada sin factura (donación)" },
];

export function FormularioMovimiento({ productos, hoy, tipoInicial = "salida", productoInicial }: { productos: Opcion[]; hoy: string; tipoInicial?: string; productoInicial?: string }) {
  const [estado, accion, accionPendiente] = useActionState(registrarMovimiento, null);
  const [tipo, setTipo] = useState(tipoInicial);
  useAvisoResultado(estado, "Movimiento registrado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2">
      <Seleccion etiqueta="¿Qué pasó?" name="tipo" opciones={TIPOS} defaultValue={tipoInicial} onChange={(e) => setTipo(e.target.value)} required className="sm:col-span-2" />
      <Seleccion etiqueta="Producto" name="producto_id" opciones={productos} vacio="Elija…" defaultValue={productoInicial ?? ""} required />
      <Campo etiqueta="Cantidad" name="cantidad" inputMode="decimal" required />
      <Campo etiqueta="Fecha" name="fecha" type="date" defaultValue={hoy} required />
      {tipo === "salida" && <Campo etiqueta="Entregado a" name="entregado_a" required placeholder="Ej.: Doña Ana (cocina)" />}
      {tipo === "entrada" && <Campo etiqueta="Vence (si aplica)" name="fecha_vencimiento" type="date" />}
      <AreaTexto etiqueta={tipo === "salida" ? "Para qué (opcional)" : tipo === "merma" ? "Motivo" : "De dónde viene"} name="motivo" required={tipo !== "salida"} className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>Registrar</BotonEnviar></div>
    </FormularioAccion>
  );
}

type VP = { id?: number; nombre?: string; categoria?: string; unidad?: string; proveedor_habitual_id?: number | null; stock_minimo?: string; activo?: boolean };

export function FormularioProducto({ v = {}, proveedores, categorias, nuevoConProveedor = false }: { v?: VP; proveedores: Opcion[]; categorias: Opcion[]; nuevoConProveedor?: boolean }) {
  const editando = v.id !== undefined && !nuevoConProveedor;
  const [estado, accion, accionPendiente] = useActionState(editando ? editarProducto : crearProducto, null);
  useAvisoResultado(estado, "Producto agregado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2"
      borrador={editando ? undefined : { nombre: nuevoConProveedor ? `producto-proveedor-${v.proveedor_habitual_id}` : "producto", titulo: "Producto nuevo" }}>
      {editando && <input type="hidden" name="id" value={v.id} />}
      <Campo etiqueta="Nombre" name="nombre" id="prod-nombre" defaultValue={v.nombre} required />
      <Seleccion etiqueta="Categoría" name="categoria" id="prod-categoria" opciones={categorias} vacio="Elija una…" defaultValue={v.categoria ?? ""} ayuda={<>¿Falta una? Agréguela en <a href="/portal/inventario/categorias" className="text-sky-700 underline">Categorías</a>.</>} required />
      <Campo etiqueta="Unidad" name="unidad" id="prod-unidad" defaultValue={v.unidad ?? ""} required placeholder="kg, litro, paquete, unidad…" />
      <Campo etiqueta="Mínimo en bodega" name="stock_minimo" id="prod-stock_minimo" inputMode="decimal" defaultValue={v.stock_minimo ?? "0"} ayuda="Lo que debe haber al empezar la semana. Se avisa si queda menos y se sugiere en el pedido." />
      <Seleccion etiqueta="Proveedor habitual" name="proveedor_habitual_id" id="prod-proveedor_habitual_id" opciones={proveedores} vacio="—" defaultValue={v.proveedor_habitual_id ?? ""} />
      {editando && <Casilla etiqueta="Activo (aparece en compras y salidas)" name="activo" defaultChecked={v.activo ?? true} />}
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>{editando ? "Guardar cambios" : "Agregar producto"}</BotonEnviar></div>
    </FormularioAccion>
  );
}
