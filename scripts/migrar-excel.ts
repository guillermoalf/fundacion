/**
 * Lee un Excel de activos y genera el Auxiliar PANI recalculado + hoja de pendientes.
 * Es lo mismo que hará el portal cuando la directora suba un archivo; sirve para probar sin la interfaz.
 * Uso: npx vite-node scripts/migrar-excel.ts -- <archivo.xlsx> <fecha_corte YYYY-MM-DD> <salida.xlsx>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ANEXO2 } from "../src/lib/catalogos/anexo2";
import { importarActivosExcel } from "../src/lib/importacion/activosExcel";
import { nombreUbicacion } from "../src/lib/importacion/guardar";
import { generarAuxiliarPani } from "../src/lib/export/auxiliarPani";

const [archivo, corte, salida] = process.argv.slice(2).filter((a) => a !== "--");
const { filas, resumen } = await importarActivosExcel(readFileSync(archivo), { categorias: ANEXO2, corte });
const ubic = (u: string | null) => (u ? nombreUbicacion(u) : null);

const buf = await generarAuxiliarPani(
  filas.map((f) => ({ ...f, ubicacion: ubic(f.ubicacion), costo: f.costo, depreciacionAcumulada: f.depreciacionAcumulada })),
  {
    corte,
    programa: "Fundación Creciendo Feliz ABC",
    pendientes: filas.flatMap((f) => f.pendientes.map((p) => ({ placa: f.placa, tipoBien: f.tipoBien, ubicacion: ubic(f.ubicacion), pendiente: p }))),
  },
);
writeFileSync(salida, buf);
const crc = (n: number) => "₡" + n.toLocaleString("es-CR", { maximumFractionDigits: 0 });
console.log(`Artículos en el Excel: ${resumen.articulosEnArchivo} → activos (uno por placa): ${resumen.activos}`);
console.log(`Con pendientes: ${resumen.conPendientes}`);
console.log(`Costo sumado tal como venía: ${crc(resumen.costoSumadoEnArchivo)}`);
console.log(`Costo registrado (compras grupales divididas): ${crc(resumen.costoRegistrado)}`);
console.log(`Depreciación acumulada: ${crc(resumen.depreciacionAcumulada)} · Valor en libros: ${crc(resumen.valorLibros)}`);
const porCat = new Map<string, number>();
for (const f of filas) porCat.set(f.categoria?.nombre ?? "(sin categoría)", (porCat.get(f.categoria?.nombre ?? "(sin categoría)") ?? 0) + 1);
console.log([...porCat].map(([k, v]) => `  ${v} × ${k}`).join("\n"));
