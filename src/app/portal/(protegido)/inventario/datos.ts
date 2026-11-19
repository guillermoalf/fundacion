/** Las categorías de productos viven en la tabla `categorias_producto` (editable en Inventario → Categorías). */
export type CategoriaProducto = { codigo: string; nombre: string; reporte: string; activo: boolean };
/** Opciones para un select: solo las activas, más la actual del producto aunque esté desactivada. */
export const opcionesCategoria = (cats: CategoriaProducto[], actual?: string | null) =>
  cats.filter((c) => c.activo || c.codigo === actual).map((c) => ({ valor: c.codigo, texto: c.activo ? c.nombre : `${c.nombre} (ya no se usa)` }));
export const REPORTES_CATEGORIA = {
  alimentos: "Formulario N.º 1 de alimentos",
  aseo: "Formulario N.º 1 de aseo (y control de limpieza)",
  ninguno: "Ningún reporte mensual",
} as const;
/** Días antes del vencimiento en que se avisa. */
export const DIAS_AVISO_VENCIMIENTO = 15;

/** Palabras que sugieren la categoría de un producto nuevo (solo una sugerencia: la persona la puede cambiar). */
const PISTAS: [string, RegExp][] = [
  ["electrodomesticos", /licuadora|plancha|ventilador|microondas|olla arrocera|arrocera|batidora|cafetera|tostador|sandwichera|hervidor|secadora de pelo|extractor|aspiradora/],
  ["juguetes", /juguete|pelota|bola\b|mu[nñ]eca|carrito|peluche|rompecabeza|lego|bloques? de construcci|columpio|tobog[aá]n|hula|cuerda de saltar|trompo/],
  ["ferreteria", /martillo|clavo|tornillo|tuerca|destornillador|desatornillador|alicate|llave inglesa|taladro|broca|cable|bombillo|foco|extensi[oó]n|cinta aislante|pintura de pared|brocha|rodillo|candado|bisagra|silicona|pegamento de contacto|tubo pvc|pvc|lija|ferreter/],
  ["didactico", /did[aá]ctic|plastilina|crayol|tempera|pintura|libro|cuento|t[ií]tere|goma|silicón|papel construcci/],
  ["oficina", /l[aá]piz|lapic|lapicer|bol[ií]grafo|cuaderno|folder|grapa|clip|tinta|toner|t[oó]ner|resma|papel bond|marcador|borrador|tijera|cinta adhesiva|sobre|calculadora|[uú]tiles/],
  ["limpieza", /jab[oó]n|detergente|cloro|desinfect|limpi|escoba|trapeador|lampazo|papel higi[eé]nico|toalla|servilleta|bolsa.*basura|esponja|guante|alcohol|lavaplatos|suavizante|desodorante ambiental/],
  ["perecedero", /fruta|verdura|banano|manzana|papaya|pi[nñ]a|mel[oó]n|sand[ií]a|naranja|mango|tomate|lechuga|cebolla|papa\b|zanahoria|chayote|ayote|br[oó]coli|culantro|chile|huevo|leche|queso|yogur|natilla|pollo|carne|res\b|cerdo|pescado|pan\b|tortilla/],
  ["no_perecedero", /arroz|frijol|az[uú]car|sal\b|aceite|harina|pasta|espagueti|at[uú]n|sardina|avena|cereal|caf[eé]|enlatad|lenteja|garbanzo|maicena|galleta|salsa|consom[eé]|leche en polvo/],
];

export function sugerirCategoriaProducto(texto: string, activas?: string[]): string | null {
  const t = texto.toLowerCase();
  return PISTAS.find(([c, re]) => re.test(t) && (!activas || activas.includes(c)))?.[0] ?? null;
}
