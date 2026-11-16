"use client";

import { createContext, startTransition, useContext, useEffect, useRef, useState, type FormHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { estiloBoton, estiloEtiqueta, estiloInput } from "./estilos";

type Base = { etiqueta: string; ayuda?: ReactNode; className?: string };

export function Campo({ etiqueta, ayuda, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const id = props.id ?? props.name;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className={estiloEtiqueta}>
        {etiqueta}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input id={id} className={estiloInput} {...props} />
      {ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}

export function Seleccion({
  etiqueta, ayuda, className, opciones, vacio, ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { name: string; opciones: { valor: string | number; texto: string }[]; vacio?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className={estiloEtiqueta}>
        {etiqueta}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <select id={id} className={estiloInput} {...props}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
      {ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}

export function AreaTexto({ etiqueta, ayuda, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  const id = props.id ?? props.name;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className={estiloEtiqueta}>
        {etiqueta}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <textarea id={id} rows={3} className={estiloInput} {...props} />
      {ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}

export function Casilla({ etiqueta, ...props }: { etiqueta: ReactNode } & InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <label className="flex items-center gap-3 text-base">
      <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-sky-600" {...props} />
      {etiqueta}
    </label>
  );
}

const ContextoPendiente = createContext<boolean | null>(null);

/**
 * Formulario que llama a una Server Action sin vaciarse si hay un error.
 * (Con <form action>, React 19 vacía el formulario después de cada envío, también cuando falla:
 * la directora perdería lo que escribió.) Si sale bien, se vacía (`reiniciar`, por defecto sí).
 */
export function FormularioAccion({
  accion, estado, pendiente, reiniciar = true, children, ...props
}: { accion: (fd: FormData) => void; estado: { ok: boolean } | null; pendiente: boolean; reiniciar?: boolean } & Omit<FormHTMLAttributes<HTMLFormElement>, "action">) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok && reiniciar) ref.current?.reset();
  }, [estado, reiniciar]);
  return (
    <ContextoPendiente.Provider value={pendiente}>
      <form
        ref={ref}
        {...props}
        onSubmit={(e) => {
          props.onSubmit?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => accion(fd));
        }}
      >
        {children}
      </form>
    </ContextoPendiente.Provider>
  );
}

/** Botón de envío que se desactiva mientras se guarda. */
export function BotonEnviar({ children, pendiente = "Guardando…", variante = "primario", ...props }: { children: ReactNode; pendiente?: string; variante?: keyof typeof estiloBoton } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending: pendienteForm } = useFormStatus();
  const pending = useContext(ContextoPendiente) ?? pendienteForm;
  return (
    <button type="submit" disabled={pending || props.disabled} className={estiloBoton[variante]} {...props}>
      {pending ? pendiente : children}
    </button>
  );
}

export function MensajeError({ estado }: { estado: { ok: boolean; error?: string } | null }) {
  if (!estado || estado.ok || !estado.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-base text-red-700">
      {estado.error}
    </p>
  );
}

const TOPE_BYTES = 4 * 1024 * 1024;

async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo;
  const bitmap = await createImageBitmap(archivo).catch(() => null);
  if (!bitmap) return archivo;
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", 0.8));
  if (!blob || blob.size >= archivo.size) return archivo;
  return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Foto o PDF. Las fotos se achican en el navegador antes de subirlas (las del celular pesan varios MB).
 * En el celular ofrece la cámara directamente.
 */
export function CampoArchivo({ etiqueta, name, ayuda, required, aceptar = "image/*,application/pdf" }: { etiqueta: string; name: string; ayuda?: ReactNode; required?: boolean; aceptar?: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept={aceptar}
        required={required}
        className="block w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2.5 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
        onChange={async (e) => {
          const input = e.currentTarget;
          const original = input.files?.[0];
          setAviso(null);
          if (!original) return;
          const final = await comprimirImagen(original);
          if (final.size > TOPE_BYTES) {
            input.value = "";
            setAviso("El archivo pesa más de 4 MB. Tome la foto otra vez o use un PDF más liviano.");
            return;
          }
          if (final !== original) {
            const dt = new DataTransfer();
            dt.items.add(final);
            input.files = dt.files;
          }
        }}
      />
      {aviso ? <p className="text-sm text-red-700">{aviso}</p> : ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}
