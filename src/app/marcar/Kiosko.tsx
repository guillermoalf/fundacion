"use client";

import { useEffect, useState } from "react";

type Persona = { id: string; nombre: string; foto: boolean };
type Paso = { t: "elegir" } | { t: "pin"; p: Persona; pin: string; error?: string } | { t: "listo"; nombre: string; tipo: string; hora: string } | { t: "enviando"; p: Persona };

const iniciales = (n: string) => n.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
const horaCR = (iso: string) => new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));

function Reloj() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  if (!ahora) return null;
  return (
    <p className="text-2xl font-semibold text-slate-700">
      {new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: true }).format(ahora)}
    </p>
  );
}

function Avatar({ p, grande }: { p: Persona; grande?: boolean }) {
  const t = grande ? "h-32 w-32 text-4xl" : "h-24 w-24 text-3xl";
  return p.foto ? (
    <img src={`/marcar/foto/${p.id}`} alt="" className={`${t} rounded-full object-cover ring-4 ring-white`} />
  ) : (
    <span className={`${t} flex items-center justify-center rounded-full bg-sky-200 font-bold text-sky-900 ring-4 ring-white`}>{iniciales(p.nombre)}</span>
  );
}

export default function Kiosko({ personal }: { personal: Persona[] }) {
  const [paso, setPaso] = useState<Paso>({ t: "elegir" });

  // Volver al inicio solo: después de marcar (4 s) o si alguien deja el PIN a medias (30 s).
  useEffect(() => {
    if (paso.t === "listo") { const t = setTimeout(() => setPaso({ t: "elegir" }), 4000); return () => clearTimeout(t); }
    if (paso.t === "pin") { const t = setTimeout(() => setPaso({ t: "elegir" }), 30000); return () => clearTimeout(t); }
  }, [paso]);

  async function marcar(p: Persona, pin: string, tipo: "entrada" | "salida") {
    setPaso({ t: "enviando", p });
    try {
      const r = await fetch("/marcar/registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empleadoId: p.id, pin, tipo }) });
      const d = await r.json();
      if (d.ok) setPaso({ t: "listo", nombre: d.nombre, tipo: d.tipo, hora: d.hora });
      else setPaso({ t: "pin", p, pin: "", error: d.error });
    } catch {
      setPaso({ t: "pin", p, pin: "", error: "No hay conexión. Revise el internet o use la hoja de asistencia en papel." });
    }
  }

  if (paso.t === "listo") {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center ${paso.tipo === "entrada" ? "bg-emerald-500" : "bg-sky-600"} text-white`}>
        <p className="text-8xl" aria-hidden="true">✓</p>
        <p className="text-5xl font-bold">{paso.tipo === "entrada" ? "¡Buenos días" : "¡Hasta luego"}, {paso.nombre.split(" ")[0]}!</p>
        <p className="text-3xl">{paso.tipo === "entrada" ? "Entrada" : "Salida"} registrada a las {horaCR(paso.hora)}</p>
      </main>
    );
  }

  if (paso.t === "pin" || paso.t === "enviando") {
    const pin = paso.t === "pin" ? paso.pin : "••••";
    const completo = pin.length === 4;
    const tecla = (d: string) => paso.t === "pin" && !completo && setPaso({ ...paso, pin: paso.pin + d, error: undefined });
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-6">
        <button type="button" onClick={() => setPaso({ t: "elegir" })} className="self-start rounded-2xl bg-white px-6 py-4 text-2xl font-semibold shadow">← Volver</button>
        <Avatar p={paso.p} grande />
        <p className="text-4xl font-bold">{paso.p.nombre}</p>
        <div className="flex gap-4" aria-label="PIN">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-8 w-8 rounded-full border-4 border-slate-700 ${i < pin.length ? "bg-slate-700" : ""}`} />)}
        </div>
        {paso.t === "pin" && paso.error && <p role="alert" className="max-w-xl rounded-2xl bg-red-600 px-6 py-4 text-center text-2xl font-semibold text-white">{paso.error}</p>}
        {!completo && paso.t === "pin" && <p className="text-2xl text-slate-600">Digite su PIN</p>}
        {completo && paso.t === "pin" ? (
          <div className="grid w-full max-w-2xl grid-cols-2 gap-6">
            <button type="button" onClick={() => marcar(paso.p, paso.pin, "entrada")} className="rounded-3xl bg-emerald-500 py-12 text-4xl font-bold text-white shadow-lg active:scale-95">Entrada</button>
            <button type="button" onClick={() => marcar(paso.p, paso.pin, "salida")} className="rounded-3xl bg-sky-600 py-12 text-4xl font-bold text-white shadow-lg active:scale-95">Salida</button>
            <button type="button" onClick={() => setPaso({ ...paso, pin: "" })} className="col-span-2 text-2xl font-medium text-slate-600 underline">Borrar el PIN</button>
          </div>
        ) : paso.t === "enviando" ? (
          <p className="text-3xl font-semibold">Registrando…</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} type="button" onClick={() => tecla(d)} className="h-24 w-24 rounded-3xl bg-white text-4xl font-bold shadow active:scale-95 sm:h-28 sm:w-28">{d}</button>
            ))}
            <button type="button" onClick={() => paso.t === "pin" && setPaso({ ...paso, pin: paso.pin.slice(0, -1) })} className="h-24 w-24 rounded-3xl bg-slate-200 text-3xl font-bold shadow active:scale-95 sm:h-28 sm:w-28" aria-label="Borrar">⌫</button>
            <button type="button" onClick={() => tecla("0")} className="h-24 w-24 rounded-3xl bg-white text-4xl font-bold shadow active:scale-95 sm:h-28 sm:w-28">0</button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="p-6">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold">Toque su foto para marcar</h1>
        <Reloj />
      </header>
      {personal.length === 0 ? (
        <p className="text-center text-2xl">Todavía no hay personal registrado.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {personal.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setPaso({ t: "pin", p, pin: "" })} className="flex w-full flex-col items-center gap-3 rounded-3xl bg-white p-5 shadow active:scale-95">
                <Avatar p={p} />
                <span className="text-center text-xl font-semibold leading-tight">{p.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
