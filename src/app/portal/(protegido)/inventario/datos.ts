export const CATEGORIAS_PRODUCTO = {
  perecedero: "Alimentos perecederos",
  no_perecedero: "Alimentos no perecederos",
  limpieza: "Limpieza",
  didactico: "Material didáctico",
  oficina: "Oficina",
  otro: "Otro",
} as const;
export const opcionesCategoria = Object.entries(CATEGORIAS_PRODUCTO).map(([valor, texto]) => ({ valor, texto }));
/** Días antes del vencimiento en que se avisa. */
export const DIAS_AVISO_VENCIMIENTO = 15;

/** Palabras que sugieren la categoría de un producto nuevo (solo una sugerencia: la persona la puede cambiar). */
const PISTAS: [keyof typeof CATEGORIAS_PRODUCTO, RegExp][] = [
  ["didactico", /did[aá]ctic|juguete|rompecabeza|plastilina|crayol|tempera|pintura|libro|cuento|bloque|t[ií]tere|goma|silicón|papel construcci/],
  ["oficina", /l[aá]piz|lapic|lapicer|bol[ií]grafo|cuaderno|folder|grapa|clip|tinta|toner|t[oó]ner|resma|papel bond|marcador|borrador|tijera|cinta adhesiva|sobre|calculadora|[uú]tiles/],
  ["limpieza", /jab[oó]n|detergente|cloro|desinfect|limpi|escoba|trapeador|lampazo|papel higi[eé]nico|toalla|servilleta|bolsa.*basura|esponja|guante|alcohol|lavaplatos|suavizante|desodorante ambiental/],
  ["perecedero", /fruta|verdura|banano|manzana|papaya|pi[nñ]a|mel[oó]n|sand[ií]a|naranja|mango|tomate|lechuga|cebolla|papa\b|zanahoria|chayote|ayote|br[oó]coli|culantro|chile|huevo|leche|queso|yogur|natilla|pollo|carne|res\b|cerdo|pescado|pan\b|tortilla/],
  ["no_perecedero", /arroz|frijol|az[uú]car|sal\b|aceite|harina|pasta|espagueti|at[uú]n|sardina|avena|cereal|caf[eé]|enlatad|lenteja|garbanzo|maicena|galleta|salsa|consom[eé]|leche en polvo/],
];

export function sugerirCategoriaProducto(texto: string): keyof typeof CATEGORIAS_PRODUCTO | null {
  const t = texto.toLowerCase();
  return PISTAS.find(([, re]) => re.test(t))?.[0] ?? null;
}
