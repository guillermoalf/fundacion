/** Constantes de niños compartidas por servidor y cliente (sin "use client"). */
export const PROVINCIAS = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];

export const ESTADOS_ASISTENCIA = {
  presente: "Presente",
  ausente: "Ausente",
  justificada: "Ausencia justificada",
} as const;

/** Ausencias seguidas sin justificar a partir de las cuales se avisa. */
export const AVISO_AUSENCIAS = 3;

/** Estado del estudio socioeconómico (solo niños PANI). */
export const ESTADOS_ESTUDIO = {
  falta: { texto: "Falta el estudio", tono: "rojo" },
  vencido: { texto: "Vencido", tono: "rojo" },
  urgente: { texto: "Vence en menos de 3 meses", tono: "rojo" },
  aviso: { texto: "Vence en menos de 6 meses", tono: "ambar" },
  vigente: { texto: "Vigente", tono: "verde" },
} as const;
