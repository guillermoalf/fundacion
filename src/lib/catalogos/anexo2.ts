/**
 * Filas del Anexo 2 (Reglamento de la Ley del Impuesto sobre la Renta) que aplican a la fundación.
 * Transcritas de la tabla oficial que entregó la fundación (secciones A–F).
 * Se cargan a la tabla `categorias_activo`. Desde el portal la directora puede agregar más filas del
 * Anexo (por ejemplo de la G a la Z) y el sistema las usa de inmediato.
 *
 * Regla 2.º del Anexo: si el bien aparece de forma individual se usa esa fila; si no, la del grupo al que pertenece.
 * `palabrasClave` sirve para sugerir la fila al importar o registrar un activo (el orden importa:
 * se evalúan de arriba hacia abajo y gana la primera coincidencia).
 */
export interface CategoriaAnexo2 {
  nombre: string;
  tasaAnual: number; // % línea recta
  aniosVida: number; // años, método suma de dígitos
  palabrasClave: string[];
}

export const ANEXO2: CategoriaAnexo2[] = [
  // --- primero lo más específico, para que no lo capture una regla general ---
  { nombre: "Equipo electrónico especializado", tasaAnual: 20, aniosVida: 5, palabrasClave: ["patch panel", "grabador", "dvr", "nvr", "consola", "ps4", "ps5", "play station", "playstation", "nintendo", "switch", "pedales", "volante", "xbox"] },
  { nombre: "Carruseles (caballitos, ruedas de chicago, carros chocones, toboganes y similares)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["juguete", "cocina plastica", "cocina plástica", "tobogan", "tobogán", "columpio", "casita", "casa rosada", "play ", "play de", "trampolin", "trampolín", "piscina", "titeres", "títeres", "sube y baja", "resbaladero", "juego"] },
  { nombre: "Baterías de cocina", tasaAnual: 25, aniosVida: 4, palabrasClave: ["bateria de cocina", "batería de cocina", "sarten", "sartén", "juego de ollas"] },
  { nombre: "Computadoras", tasaAnual: 20, aniosVida: 5, palabrasClave: ["computadora", "laptop", "portatil", "portátil", "ipad", "tablet", "monitor", "cpu"] },
  { nombre: "Equipo de proyección y sonido (T.V.)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["pantalla", "televisor", "television", "televisión", "tv ", "smart tv", "proyector"] },
  { nombre: "Cámaras fotográficas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["camara fotografica", "cámara fotográfica"] },
  { nombre: "Cámaras de televisión", tasaAnual: 10, aniosVida: 10, palabrasClave: ["camara", "cámara", "cctv"] },
  { nombre: "Equipo de refrigeración", tasaAnual: 7, aniosVida: 15, palabrasClave: ["refrigerador", "refri", "nevera", "enfriador"] },
  { nombre: "Congeladores", tasaAnual: 10, aniosVida: 10, palabrasClave: ["congelador", "freezer"] },
  { nombre: "Equipo de lavandería", tasaAnual: 5, aniosVida: 20, palabrasClave: ["lavadora", "secadora", "plancha"] },
  { nombre: "Cocinas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["cocina", "microondas", "micronda", "horno", "arrocera", "freidora", "licuadora", "batidora", "procesador de alimentos"] },
  { nombre: "Estufas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["estufa", "plantilla"] },
  { nombre: "Abanicos", tasaAnual: 10, aniosVida: 10, palabrasClave: ["ventilador", "abanico"] },
  { nombre: "Aire acondicionado (equipo)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["aire acondicionado"] },
  { nombre: "Equipo de sonido", tasaAnual: 10, aniosVida: 10, palabrasClave: ["parlante", "bocina", "equipo de sonido", "microfono", "micrófono", "grabadora", "mixer",
    // instrumentos musicales: no tienen fila propia en A–F; se agrupan aquí hasta agregar su fila del Anexo
    "bateria", "batería", "bolillo", "bombo", "faja", "guiro", "güiro", "lira", "mazo", "tambor", "timbaleta", "guitarra", "teclado musical", "xilofono", "xilófono", "pandereta", "maraca"] },
  { nombre: "Amplificadores (fotografía y sonido)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["amplificador"] },
  { nombre: "Archivadores (todo tipo)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["archivador", "gabinete"] },
  { nombre: "Escritorios (toda clase)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["escritorio"] },
  { nombre: "Estantería", tasaAnual: 10, aniosVida: 10, palabrasClave: ["estante", "estanteria", "estantería", "repisa", "librero"] },
  { nombre: "Camas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["cama", "cuna", "camarote"] },
  { nombre: "Colchones, mantelería, ropa de cama", tasaAnual: 20, aniosVida: 5, palabrasClave: ["colchon", "colchón", "colchoneta", "mantel", "sabana", "sábana", "cobija"] },
  { nombre: "Equipo de oficina y mobiliario", tasaAnual: 10, aniosVida: 10, palabrasClave: ["mueble", "mesa", "silla", "cajon", "cajón", "locker", "pizarra", "pizarron", "pizarrón", "sillon", "sillón"] },
  { nombre: "Fotocopiadoras", tasaAnual: 20, aniosVida: 5, palabrasClave: ["fotocopiadora", "impresora", "multifuncional"] },
  { nombre: "Aparatos telefónicos", tasaAnual: 10, aniosVida: 10, palabrasClave: ["telefono", "teléfono", "celular", "central telefonica"] },
  { nombre: "Alarmas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["alarma"] },
  { nombre: "Extintores", tasaAnual: 7, aniosVida: 15, palabrasClave: ["extintor"] },
  { nombre: "Equipo de iluminación", tasaAnual: 10, aniosVida: 10, palabrasClave: ["lampara", "lámpara", "reflector"] },
  { nombre: "Calentadores de agua", tasaAnual: 10, aniosVida: 10, palabrasClave: ["calentador", "termo de agua", "termoducha"] },
  { nombre: "Aspiradoras", tasaAnual: 10, aniosVida: 10, palabrasClave: ["aspiradora"] },
  { nombre: "Extractores de aire", tasaAnual: 10, aniosVida: 10, palabrasClave: ["extractor"] },
  { nombre: "Alfombras", tasaAnual: 10, aniosVida: 10, palabrasClave: ["alfombra", "tapete", "piso de foam"] },
  { nombre: "Cortinas para todo uso", tasaAnual: 20, aniosVida: 5, palabrasClave: ["cortina", "persiana"] },
  { nombre: "Bicicletas", tasaAnual: 10, aniosVida: 10, palabrasClave: ["bicicleta", "triciclo"] },
  { nombre: "Bibliotecas (mobiliario y equipo)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["biblioteca"] },
  { nombre: "Calculadoras (todo tipo)", tasaAnual: 10, aniosVida: 10, palabrasClave: ["calculadora"] },
  { nombre: "Equipo médico", tasaAnual: 10, aniosVida: 10, palabrasClave: ["termometro", "termómetro", "tensiometro", "camilla"] },
  { nombre: "Equipo de computación", tasaAnual: 20, aniosVida: 5, palabrasClave: ["router", "servidor", "ups", "disco duro"] },
  { nombre: "Escaleras", tasaAnual: 10, aniosVida: 10, palabrasClave: ["escalera"] },
  { nombre: "Exhibidores", tasaAnual: 10, aniosVida: 10, palabrasClave: ["exhibidor", "vitrina"] },
];

const normalizar = (s: string) =>
  ` ${s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ")} `;

/** Sugiere la fila del Anexo 2 para un tipo de bien. Devuelve null si no reconoce el bien. */
export function sugerirCategoria<T extends { palabrasClave: string[] }>(tipoBien: string, categorias: T[]): T | null {
  const t = normalizar(tipoBien);
  for (const c of categorias) {
    for (const p of c.palabrasClave) {
      const k = normalizar(p).trim();
      if (!k) continue;
      // la palabra clave debe iniciar una palabra ("refrigerador" reconoce "refrigeradora");
      // por eso las filas específicas van antes que las generales (Cámaras antes que Camas)
      const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      if (re.test(t)) return c;
    }
  }
  return null;
}
