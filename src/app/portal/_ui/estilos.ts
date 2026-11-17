/** Clases compartidas: texto y botones grandes, nada apretado (la directora no es técnica y usa el celular). */
export const estiloInput =
  "block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:bg-slate-100";
export const estiloEtiqueta = "block text-sm font-medium text-slate-700";
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60";
export const estiloBoton = {
  primario: `${base} bg-sky-600 text-white hover:bg-sky-700`,
  secundario: `${base} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`,
  peligro: `${base} bg-red-600 text-white hover:bg-red-700`,
  enlace: "font-medium text-sky-700 underline-offset-2 hover:underline",
};
export const estiloTarjeta = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
