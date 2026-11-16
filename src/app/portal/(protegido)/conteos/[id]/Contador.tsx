"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "../../../_ui/Avisos";
import { estiloBoton, estiloInput } from "../../../_ui/estilos";
import { buscarPorPlaca, marcarActivo } from "../acciones";

type Item = { id: string; placa: string | null; tipo_bien: string; encontrado: boolean | null; nota: string | null };

const idDesdeQr = (texto: string) => texto.match(/\/portal\/activos\/([0-9a-f-]{36})/i)?.[1] ?? null;

/** Lector de QR con la cámara del celular (BarcodeDetector). Si el navegador no lo tiene, se usa la placa. */
function Escaner({ alLeer }: { alLeer: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disponible = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!activo) return;
    let parar = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        // @ts-expect-error BarcodeDetector todavía no está en los tipos de TypeScript
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        let ultimo = "";
        while (!parar) {
          const codigos = await detector.detect(video.current).catch(() => []);
          const t = codigos[0]?.rawValue;
          if (t && t !== ultimo) { ultimo = t; alLeer(t); setTimeout(() => (ultimo = ""), 2500); }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        setError("No se pudo abrir la cámara. Revise el permiso o escriba la placa.");
        setActivo(false);
      }
    })();
    return () => { parar = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [activo, alLeer]);

  if (!disponible) return <p className="text-sm text-slate-500">Este navegador no lee códigos QR: escriba la placa.</p>;
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setActivo((a) => !a)} className={activo ? estiloBoton.secundario : estiloBoton.primario}>
        {activo ? "Cerrar la cámara" : "📷 Escanear QR"}
      </button>
      {activo && <video ref={video} className="w-full max-w-sm rounded-xl" muted playsInline />}
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}

export default function Contador({ conteoId, items }: { conteoId: string; items: Item[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const [pendiente, iniciar] = useTransition();
  const [placa, setPlaca] = useState("");
  const [locales, setLocales] = useState<Record<string, boolean>>({});

  const marcar = (activoId: string, encontrado: boolean, nombre?: string) =>
    iniciar(async () => {
      setLocales((l) => ({ ...l, [activoId]: encontrado }));
      const r = await marcarActivo(conteoId, activoId, encontrado);
      if (!r.ok) { avisar(r.error, "error"); setLocales((l) => { const c = { ...l }; delete c[activoId]; return c; }); return; }
      if (r.nota) avisar(r.nota, "error");
      else if (nombre) avisar(`${nombre}: encontrado.`);
      router.refresh();
    });

  const leido = (texto: string) => {
    const id = idDesdeQr(texto);
    if (!id) { avisar("Ese código QR no es de una etiqueta del portal.", "error"); return; }
    marcar(id, true, items.find((i) => i.id === id)?.tipo_bien ?? "Activo");
  };

  const porPlaca = () =>
    iniciar(async () => {
      if (!placa.trim()) return;
      const a = await buscarPorPlaca(placa);
      if (!a) { avisar(`No hay ningún activo con la placa ${placa}.`, "error"); return; }
      setPlaca("");
      marcar(a.id, true, a.tipo_bien);
    });

  const estado = (i: Item) => (i.id in locales ? locales[i.id] : i.encontrado);
  const faltan = items.filter((i) => estado(i) === null).length;

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <Escaner alLeer={leido} />
        <div className="flex gap-2">
          <input value={placa} onChange={(e) => setPlaca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), porPlaca())}
            placeholder="O escriba la placa" aria-label="Placa" className={`${estiloInput} max-w-xs`} inputMode="numeric" />
          <button type="button" onClick={porPlaca} disabled={pendiente} className={estiloBoton.secundario}>Marcar</button>
        </div>
      </div>
      <p className="text-base text-slate-600">{faltan === 0 ? "Ya se revisaron todos." : `Faltan ${faltan} por revisar.`}</p>
      <ul className="space-y-2">
        {items.map((i) => {
          const e = estado(i);
          return (
            <li key={i.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${e === true ? "border-emerald-300 bg-emerald-50" : e === false ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div>
                <p className="text-lg font-semibold">{i.placa ? `Placa ${i.placa}` : "Sin placa"}</p>
                <p className="text-slate-700">{i.tipo_bien}</p>
                {i.nota && <p className="text-sm text-amber-800">{i.nota}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => marcar(i.id, true)} aria-pressed={e === true}
                  className={`rounded-xl px-4 py-3 text-base font-semibold ${e === true ? "bg-emerald-600 text-white" : "bg-white text-emerald-800 ring-1 ring-emerald-300"}`}>Está</button>
                <button type="button" onClick={() => marcar(i.id, false)} aria-pressed={e === false}
                  className={`rounded-xl px-4 py-3 text-base font-semibold ${e === false ? "bg-red-600 text-white" : "bg-white text-red-700 ring-1 ring-red-300"}`}>No está</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
