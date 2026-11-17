"use client";

import { estiloBoton } from "../../../_ui/estilos";

export default function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return <button type="button" onClick={() => window.print()} className={estiloBoton.primario}>{texto}</button>;
}
