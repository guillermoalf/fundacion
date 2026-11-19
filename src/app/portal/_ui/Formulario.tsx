"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState, type FormHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { estiloBoton, estiloEtiqueta, estiloInput } from "./estilos";
import { borrarBorrador, guardarBorrador, leerBorrador, useUsuarioId } from "./Borrador";

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
  accion, estado, pendiente, reiniciar = true, borrador, children, ...props
}: {
  accion: (fd: FormData) => void; estado: { ok: boolean } | null; pendiente: boolean; reiniciar?: boolean;
  /** Guarda lo escrito en este navegador mientras se llena (ver Borrador.tsx). */
  borrador?: OpcionesBorrador;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action">) {
  const ref = useRef<HTMLFormElement>(null);
  const recuperado = useBorradorFormulario(ref, estado, borrador);
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
          recuperado.alEnviar();
          startTransition(() => accion(fd));
        }}
      >
        {borrador && recuperado.guardado && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:col-span-full">
            <p>
              <strong>{borrador.titulo} sin terminar</strong> (guardada {cuando(recuperado.guardado)}). Siga donde quedó; solo se pierde si la descarta.
            </p>
            <button type="button" onClick={recuperado.descartar} className="rounded-xl border border-amber-400 bg-white px-3 py-2 font-medium hover:bg-amber-100">
              {borrador.volverA ? "Descartar y volver a la lista" : "Descartar y empezar de nuevo"}
            </button>
          </div>
        )}
        {children}
      </form>
    </ContextoPendiente.Provider>
  );
}

export type OpcionesBorrador = {
  /** Identifica el formulario: "compra", "activo", "nino", "empleado"… */
  nombre: string;
  /** Para el aviso: "Compra", "Registro del niño"… */
  titulo: string;
  /** A dónde ir al descartar (la lista). */
  volverA?: string;
  /** Para formularios con estado propio (líneas de la compra, etc.): recibe lo guardado para restaurarlo. */
  alRestaurar?: (datos: Record<string, string>) => void;
};

/** Evento que avisa a los campos con estado propio (archivos) que se restauró un borrador. */
export const EVENTO_RESTAURAR = "borrador-restaurar";

function cuando(ms: number) {
  const d = new Date(ms);
  const hoy = new Date();
  const hora = d.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === hoy.toDateString() ? `hoy a las ${hora}` : `el ${d.toLocaleDateString("es-CR")} a las ${hora}`;
}

function datosDe(form: HTMLFormElement) {
  const datos: Record<string, string> = {};
  for (const [k, v] of new FormData(form)) if (typeof v === "string") datos[k] = datos[k] !== undefined ? `${datos[k]}\u0000${v}` : v;
  return datos;
}

function restaurarCampos(form: HTMLFormElement, datos: Record<string, string>) {
  for (const el of Array.from(form.elements)) {
    const c = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!c.name || c.type === "file" || c.type === "hidden" || c.type === "submit" || c.type === "button") continue;
    const v = datos[c.name];
    if (c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio")) {
      c.checked = v !== undefined && v.split("\u0000").includes(c.value);
    } else if (v !== undefined) {
      c.value = v;
    }
  }
}

/**
 * Al abrir: si hay un borrador lo restaura. Mientras se escribe: lo guarda (si cambió algo respecto al formulario vacío).
 * Al enviar se borra; si la Server Action devuelve un error, se vuelve a guardar para no perder nada.
 */
function useBorradorFormulario(ref: React.RefObject<HTMLFormElement | null>, estado: { ok: boolean } | null, op?: OpcionesBorrador) {
  const usuario = useUsuarioId();
  const [guardado, setGuardado] = useState<number | null>(null);
  const inicial = useRef<string>("");
  const enviado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opRef = useRef(op);
  opRef.current = op;
  const nombre = op?.nombre;

  const guardarAhora = useCallback(() => {
    const form = ref.current;
    if (!form || !nombre || enviado.current) return;
    const datos = datosDe(form);
    if (JSON.stringify(datos) === inicial.current) borrarBorrador(usuario, nombre);
    else guardarBorrador(usuario, nombre, datos);
  }, [ref, nombre, usuario]);

  useEffect(() => {
    const form = ref.current;
    if (!form || !nombre || !usuario) return;
    inicial.current = JSON.stringify(datosDe(form));
    const b = leerBorrador(usuario, nombre);
    if (b) {
      restaurarCampos(form, b.datos);
      opRef.current?.alRestaurar?.(b.datos);
      form.dispatchEvent(new CustomEvent(EVENTO_RESTAURAR, { detail: b.datos }));
      setGuardado(b.guardado);
    }
    const programar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(guardarAhora, 500);
    };
    form.addEventListener("input", programar);
    form.addEventListener("change", programar);
    form.addEventListener("click", programar);
    form.addEventListener(EVENTO_ARCHIVOS, programar);
    // Cambios que no vienen de teclear (p. ej. lo que llena el XML de la factura en los campos ocultos).
    const obs = new MutationObserver(programar);
    obs.observe(form, { subtree: true, attributes: true, attributeFilter: ["value"] });
    return () => {
      obs.disconnect();
      form.removeEventListener("input", programar);
      form.removeEventListener("change", programar);
      form.removeEventListener("click", programar);
      form.removeEventListener(EVENTO_ARCHIVOS, programar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [ref, nombre, usuario, guardarAhora]);

  // Si al enviar hubo un error, lo escrito sigue en pantalla: se guarda de nuevo.
  useEffect(() => {
    if (!nombre || !estado) return;
    if (estado.ok) borrarBorrador(usuario, nombre);
    else { enviado.current = false; guardarAhora(); }
  }, [estado, nombre, usuario, guardarAhora]);

  return {
    guardado,
    alEnviar() {
      if (!nombre) return;
      if (temporizador.current) clearTimeout(temporizador.current);
      enviado.current = true;
      borrarBorrador(usuario, nombre);
    },
    descartar() {
      if (!nombre || !confirm("¿Descartar lo que había escrito? No se puede recuperar.")) return;
      enviado.current = true;
      borrarBorrador(usuario, nombre);
      window.location.href = opRef.current?.volverA ?? window.location.pathname;
    },
  };
}

/** Lo emiten los campos de archivos cuando terminan de subir uno (no generan "input" en el formulario). */
export const EVENTO_ARCHIVOS = "archivos-cambiaron";

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

/** Fotos, PDF o XML (algunos navegadores no dicen el tipo del XML: se deduce de la extensión). */
function normalizarTipo(archivo: File): File | null {
  if (archivo.type.startsWith("image/") || archivo.type === "application/pdf") return archivo;
  if (archivo.type.includes("xml") || /\.xml$/i.test(archivo.name)) return new File([archivo], archivo.name, { type: "application/xml" });
  return null;
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
    // Borrador: el archivo ya subido se vuelve a mostrar.
    const restaurar = (e: Event) => {
      try {
        const a = JSON.parse((e as CustomEvent<Record<string, string>>).detail[`${name}__info`] ?? "null");
        if (a?.id) setEstado({ t: "listo", id: a.id, kb: a.kb });
      } catch { /* borrador viejo */ }
    };
    form?.addEventListener("reset", limpiar);
    form?.addEventListener(EVENTO_RESTAURAR, restaurar);
    return () => { form?.removeEventListener("reset", limpiar); form?.removeEventListener(EVENTO_RESTAURAR, restaurar); };
  }, [name]);
  useEffect(() => { ref.current?.form?.dispatchEvent(new Event(EVENTO_ARCHIVOS)); }, [estado]);
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
          const normal = normalizarTipo(original);
          if (!normal) {
            input.value = "";
            setEstado({ t: "error", msg: "Solo fotos, PDF o XML de factura electrónica." });
            return;
          }
          const final = await comprimirImagen(normal);
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
      <input type="hidden" name={`${name}__info`} value={estado.t === "listo" ? JSON.stringify({ id: estado.id, kb: estado.kb }) : ""} />
      {estado.t === "subiendo" && <p className="text-sm text-sky-700">Subiendo… {estado.pct} %</p>}
      {estado.t === "listo" && <p className="text-sm text-emerald-700">Listo ({estado.kb} KB).</p>}
      {estado.t === "error" && <p className="text-sm text-red-700">{estado.msg}</p>}
      {estado.t === "nada" && ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}

export type ArchivoSubido = { id: string; nombre: string; tipo: string; kb: number };

/**
 * Varios archivos a la vez (por ejemplo la factura electrónica: PDF + 2 XML). Cada uno se sube apenas se elige;
 * el formulario envía los ids separados por coma. `alSubir` avisa cada archivo listo (para leer el XML).
 */
export function CampoArchivos({ etiqueta, name, ayuda, aceptar = "image/*,application/pdf,.xml,application/xml,text/xml", alSubir }: {
  etiqueta: string; name: string; ayuda?: ReactNode; aceptar?: string; alSubir?: (a: ArchivoSubido) => void;
}) {
  const [listos, setListos] = useState<ArchivoSubido[]>([]);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    const limpiar = () => { setListos([]); setError(null); };
    const restaurar = (e: Event) => {
      try {
        const l = JSON.parse((e as CustomEvent<Record<string, string>>).detail[`${name}__info`] ?? "[]");
        if (Array.isArray(l)) setListos(l);
      } catch { /* borrador viejo */ }
    };
    form?.addEventListener("reset", limpiar);
    form?.addEventListener(EVENTO_RESTAURAR, restaurar);
    return () => { form?.removeEventListener("reset", limpiar); form?.removeEventListener(EVENTO_RESTAURAR, restaurar); };
  }, [name]);
  useEffect(() => { ref.current?.form?.dispatchEvent(new Event(EVENTO_ARCHIVOS)); }, [listos]);
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className={estiloEtiqueta}>{etiqueta}</label>
      <input
        ref={ref}
        id={name}
        type="file"
        multiple
        accept={aceptar}
        className="block w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2.5 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
        onChange={async (e) => {
          const input = e.currentTarget;
          const elegidos = [...(input.files ?? [])];
          setError(null);
          input.setCustomValidity("Espere a que terminen de subir los archivos.");
          for (const original of elegidos) {
            const normal = normalizarTipo(original);
            if (!normal) { setError(`«${original.name}»: solo fotos, PDF o XML.`); continue; }
            const final = await comprimirImagen(normal);
            if (final.size > TOPE_BYTES) { setError(`«${original.name}» pesa más de 5 MB.`); continue; }
            setSubiendo(`${original.name}…`);
            try {
              const id = await subirPorPartes(final, (pct) => setSubiendo(`${original.name}: ${pct} %`));
              const a = { id, nombre: original.name, tipo: final.type, kb: Math.max(1, Math.round(final.size / 1024)) };
              setListos((l) => [...l, a]);
              alSubir?.(a);
            } catch (err) {
              setError(`«${original.name}»: ${(err as Error).message}`);
            }
          }
          setSubiendo(null);
          input.setCustomValidity("");
          input.value = "";
        }}
      />
      <input type="hidden" name={name} value={listos.map((a) => a.id).join(",")} />
      <input type="hidden" name={`${name}__info`} value={JSON.stringify(listos)} />
      {listos.length > 0 && (
        <ul className="space-y-1 text-sm">
          {listos.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-emerald-800">
              ✓ {a.nombre} ({a.kb} KB)
              <button type="button" className="text-slate-500 underline" onClick={() => setListos((l) => l.filter((x) => x.id !== a.id))}>quitar</button>
            </li>
          ))}
        </ul>
      )}
      {subiendo && <p className="text-sm text-sky-700">Subiendo {subiendo}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!listos.length && !subiendo && !error && ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
    </div>
  );
}
