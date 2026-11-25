"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarFoto } from "./acciones";
import { estiloBoton } from "../../_ui/estilos";

const LADO = 256;

/** Recorta la foto al centro (cuadrada) y la achica a 256 px en JPEG; devuelve base64. */
async function prepararFoto(archivo: File): Promise<string> {
  const img = await createImageBitmap(archivo);
  const lado = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = c.height = LADO;
  c.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export default function FotoPerfil({ foto, inicial }: { foto: string | null; inicial: string }) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const guardar = (base64: string | null) => iniciar(async () => {
    setError(null);
    const r = await cambiarFoto(base64);
    if (!r.ok) setError(r.error);
    else router.refresh();
  });

  return (
    <div className="flex items-center gap-4">
      {foto
        ? <img src={foto} alt="Su foto" className="h-20 w-20 rounded-full object-cover" />
        : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fff6d6] text-3xl font-bold text-[#14284b]">{inicial}</div>}
      <div className="space-y-2">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try { guardar(await prepararFoto(f)); } catch { setError("No se pudo leer esa imagen. Pruebe con otra foto (JPG o PNG)."); }
        }} />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={guardando} onClick={() => ref.current?.click()} className={estiloBoton.secundario}>
            {guardando ? "Guardando…" : foto ? "Cambiar foto" : "Subir foto"}
          </button>
          {foto && <button type="button" disabled={guardando} onClick={() => guardar(null)} className={estiloBoton.secundario}>Quitar</button>}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
