/**
 * Genera db/seed.sql: fuentes, categorías del Anexo 2, ubicaciones, proveedores, productos y parámetros.
 * Uso: npx tsx scripts/generar-seed.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ANEXO2 } from "../src/lib/catalogos/anexo2";
import { importarActivosExcel } from "../src/lib/importacion/activosExcel";
import { nombreUbicacion, tipoUbicacion } from "../src/lib/importacion/guardar";

const q = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `array[${xs.map(q).join(",")}]::text[]`;

// Ubicaciones tal como aparecen en el Excel de activos de la fundación
const { filas } = await importarActivosExcel(readFileSync(new URL("../src/lib/importacion/__fixtures__/Activos_2026_PANI.xlsx", import.meta.url)), { categorias: ANEXO2, corte: "2026-10-31" });
const ubicaciones: [string, string][] = [...new Set(filas.map((f) => f.ubicacion).filter((u): u is string => !!u).map(nombreUbicacion))]
  .map((n) => [n, tipoUbicacion(n)]);
ubicaciones.push(["Sin ubicación", "area_comun"]);

const productos: [string | null, string, string, string, string][] = [
  // código PriceSmart, nombre, categoría, unidad, proveedor
  ["494850", "Aceite 20 L", "no_perecedero", "unidad", "PriceSmart"], ["152519", "Achiote", "no_perecedero", "unidad", "PriceSmart"],
  ["465819", "Arroz 15 kg", "no_perecedero", "saco", "PriceSmart"], ["287486", "Atún 1 kg", "no_perecedero", "lata", "PriceSmart"],
  ["447412", "Azúcar 6 kg", "no_perecedero", "bolsa", "PriceSmart"], ["19748", "Aderezo italiano", "no_perecedero", "unidad", "PriceSmart"],
  ["307605", "Cereal chocolate", "no_perecedero", "caja", "PriceSmart"], ["307604", "Cereal fruta", "no_perecedero", "caja", "PriceSmart"],
  ["12463", "Cloro", "limpieza", "galón", "PriceSmart"], ["260028", "Crema dulce", "perecedero", "unidad", "PriceSmart"],
  ["375410", "Detergente 10 kg", "limpieza", "bolsa", "PriceSmart"], ["475839", "Frijoles molidos", "no_perecedero", "paquete", "PriceSmart"],
  ["255491", "Galleta sorbeto", "no_perecedero", "paquete", "PriceSmart"], ["353217", "Harina", "no_perecedero", "bolsa", "PriceSmart"],
  ["283129", "Miel de abejas", "no_perecedero", "unidad", "PriceSmart"], ["379801", "Lavaplatos", "limpieza", "unidad", "PriceSmart"],
  ["14442", "Leche evaporada", "no_perecedero", "paquete", "PriceSmart"], ["348721", "Leche condensada", "no_perecedero", "paquete", "PriceSmart"],
  ["305920", "Leche en polvo 1,5 kg", "no_perecedero", "bolsa", "PriceSmart"], ["171307", "Margarina", "perecedero", "unidad", "PriceSmart"],
  [null, "Masa", "perecedero", "bolsa", "PriceSmart"], // en la lista tenía el mismo código que Harina
  ["163467", "Pan cuadrado", "perecedero", "paquete", "PriceSmart"], ["370846", "Papel higiénico", "limpieza", "paquete", "PriceSmart"],
  ["372013", "Papel toalla", "limpieza", "paquete", "PriceSmart"], ["253881", "Salsa Lizano", "no_perecedero", "unidad", "PriceSmart"],
  ["467880", "Salsitas 12 u", "no_perecedero", "paquete", "PriceSmart"], ["433271", "Tortillas 90 u", "perecedero", "paquete", "PriceSmart"],
  [null, "Crystal", "limpieza", "unidad", "Higiene 365"], [null, "Germicida", "limpieza", "unidad", "Higiene 365"],
  [null, "Jabón de manos", "limpieza", "unidad", "Higiene 365"], [null, "Atomizador", "limpieza", "unidad", "Higiene 365"],
  [null, "Toalla de manos", "limpieza", "paquete", "Higiene 365"],
];

const sql = `-- Generado por scripts/generar-seed.ts
begin;

insert into fuentes_financiamiento (codigo, nombre, programa) values
  ('PANI', 'Patronato Nacional de la Infancia', 'Fundación Creciendo Feliz ABC'),
  ('IMAS', 'Instituto Mixto de Ayuda Social', null),
  ('JPS', 'Junta de Protección Social', null),
  ('PROPIOS', 'Recursos propios de la fundación', null),
  ('DONACION', 'Donaciones en especie o dinero', null);

insert into categorias_activo (nombre, tasa_anual, anios_vida, palabras_clave) values
  ${ANEXO2.map((c) => `(${q(c.nombre)}, ${c.tasaAnual}, ${c.aniosVida}, ${arr(c.palabrasClave)})`).join(",\n  ")};

insert into ubicaciones (nombre, tipo) values
  ${ubicaciones.map(([n, t]) => `(${q(n)}, ${q(t)})`).join(",\n  ")};

insert into proveedores (nombre, tipo, notas) values
  ('PriceSmart', 'mayorista', 'Abarrotes al por mayor'),
  ('Más x Menos', 'supermercado', null),
  ('Pipasa', 'carnes', 'Carnes y pollo'),
  ('Frutas y verduras', 'frutas_verduras', 'Cambiar por el nombre del proveedor'),
  ('Higiene 365', 'limpieza', 'Productos de limpieza');

insert into productos (nombre, categoria, unidad, proveedor_habitual_id, codigo_proveedor) values
  ${productos.map(([cod, n, c, u, p]) => `(${q(n)}, ${q(c)}, ${q(u)}, (select id from proveedores where nombre = ${q(p)}), ${q(cod)})`).join(",\n  ")};

-- Parámetros con vigencia. En enero se agrega una fila nueva; los cálculos de años anteriores no cambian.
insert into parametros (clave, valor, vigente_desde, fuente_legal) values
  ('ccss_patronal_pct', 26.67, '2025-01-01', 'CCSS 2025'),
  ('ccss_obrero_pct', 10.67, '2025-01-01', 'CCSS 2025'),
  ('ccss_patronal_pct', 26.83, '2026-01-01', 'CCSS 2026 (IVM patronal 5,58 %)'),
  ('ccss_obrero_pct', 10.83, '2026-01-01', 'CCSS 2026 (IVM obrero 4,33 %)'),
  ('aguinaldo_divisor', 12, '1959-01-01', 'Ley 2412: salarios de dic a nov ÷ 12'),
  ('vacaciones_dias_habiles_anuales', 10, '1943-01-01', 'Código de Trabajo art. 153: 2 semanas por cada 50 laboradas (10 días hábiles lunes–viernes)'),
  ('incapacidad_ccss_patrono_pct_dias_1_3', 50, '2026-01-01', 'Reglamento del Seguro de Salud CCSS: patrono paga 50 % de los días 1 a 3'),
  ('tardia_tolerancia_min', 5, '2026-01-01', 'Reglamento interno de la fundación');

commit;
`;
writeFileSync(new URL("../db/seed.sql", import.meta.url), sql);
console.log(`seed.sql: ${ANEXO2.length} categorías, ${ubicaciones.length} ubicaciones, ${productos.length} productos`);
