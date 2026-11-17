export const TIPOS_AUSENCIA = {
  vacaciones: "Vacaciones",
  incapacidad_ccss: "Incapacidad CCSS",
  incapacidad_ins: "Incapacidad INS",
  licencia_maternidad: "Licencia de maternidad",
  permiso_con_goce: "Permiso con goce de salario",
  permiso_sin_goce: "Permiso sin goce de salario",
  ausencia_injustificada: "Ausencia injustificada",
  feriado: "Feriado",
} as const;
export type TipoAusencia = keyof typeof TIPOS_AUSENCIA;
/** Tipos que exigen número de boleta (la base también lo exige). */
export const CON_BOLETA: TipoAusencia[] = ["incapacidad_ccss", "incapacidad_ins", "licencia_maternidad"];
