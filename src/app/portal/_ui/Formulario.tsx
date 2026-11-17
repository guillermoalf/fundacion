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

const TOPE_BYTES = 5 * 1024 * 1024;
const PARTE = 3 * 1024 * 1024;

/** Fotos: lado más largo 1600 px, JPEG al 80 %. Si así no pesa menos, se deja la original. */
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

/** Sube el archivo en partes de 3 MB (Vercel no acepta más de 4,5 MB por petición) y devuelve su id. */
async function subirPorPartes(archivo: File, progreso: (pct: number) => void): Promise<string> {
  const subida = crypto.randomUUID();
  const partes = Math.ceil(archivo.size / PARTE);
  for (let i = 0; i < partes; i++) {
    const r = await fetch(`/portal/archivos/subir?subida=${subida}&parte=${i}`, { method: "POST", body: archivo.slice(i * PARTE, (i + 1) * PARTE) });
    const d = await r.json().catch(() => ({ ok: false, error: "No se pudo subir el archivo. Revise el internet e intente de nuevo." }));
    if (!d.ok) throw new Error(d.error);
    progreso(Math.round(((i + 1) / partes) * 100));
  }
  const r = await fetch(`/portal/archivos/subir?subida=${subida}&completar=1`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: archivo.name, tipo: archivo.type }),
  });
  const d = await r.json().catch(() => ({ ok: false, error: "No se pudo terminar de subir el archivo." }));
  if (!d.ok) throw new Error(d.error);
  return d.id as string;
}

/**
 * Foto o PDF. Se sube apenas se elige (las fotos se comprimen antes) y el formulario solo envía su id.
 * En el celular ofrece la cámara directamente.
 */
export function CampoArchivo({ etiqueta, name, ayuda, required, aceptar = "image/*,application/pdf" }: { etiqueta: string; name: string; ayuda?: ReactNode; required?: boolean; aceptar?: string }) {
  const [estado, setEstado] = useState<{ t: "nada" } | { t: "subiendo"; pct: number } | { t: "listo"; id: string; kb: number } | { t: "error"; msg: string }>({ t: "nada" });
  const ref = useRef<HTMLInputElement>(null);
  // Cuando el formulario se vacía después de guardar, el archivo ya usado se olvida.
  useEffect(() => {
    const form = ref.current?.form;
    const limpiar = () => setEstado({ t: "nada" });
    form?.addEventListener("reset", limpiar);
    return () => form?.removeEventListener("reset", limpiar);
  }, []);
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className={estiloEtiqueta}>
        {etiqueta}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        ref={ref}
        id={name}
        type="file"
        accept={aceptar}
        required={required}
        className="block w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2.5 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
        onChange={async (e) => {
          const input = e.currentTarget;
          const original = input.files?.[0];
          input.setCustomValidity("");
          if (!original) { setEstado({ t: "nada" }); return; }
          if (!original.type.startsWith("image/") && original.type !== "application/pdf") {
            input.value = "";
            setEstado({ t: "error", msg: "Solo fotos o PDF." });
            return;
          }
          const final = await comprimirImagen(original);
          if (final.size > TOPE_BYTES) {
            input.value = "";
            setEstado({ t: "error", msg: "El archivo pesa más de 5 MB. Tome la foto otra vez o use un PDF más liviano." });
            return;
          }
          input.setCustomValidity("Espere a que termine de subir el archivo.");
          setEstado({ t: "subiendo", pct: 0 });
          try {
            const id = await subirPorPartes(final, (pct) => setEstado({ t: "subiendo", pct }));
            input.setCustomValidity("");
            setEstado({ t: "listo", id, kb: Math.max(1, Math.round(final.size / 1024)) });
          } catch (err) {
            input.value = "";
            input.setCustomValidity("");
            setEstado({ t: "error", msg: (err as Error).message });
          }
        }}
      />
      <input type="hidden" name={name} value={estado.t === "listo" ? estado.id : ""} />
      {estado.t === "subiendo" && <p className="text-sm text-sky-700">Subiendo… {estado.pct} %</p>}
      {estado.t === "listo" && <p className="text-sm text-emerald-700">Listo ({estado.kb} KB).</p>}
      {estado.t === "error" && <p className="text-sm text-red-700">{estado.msg}</p>}
      {estado.t === "nada" && ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}
