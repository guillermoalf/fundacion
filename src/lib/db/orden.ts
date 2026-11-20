import { sql } from "kysely";

/**
 * Orden alfabético sin importar mayúsculas ni tildes («AGENDA» va antes de «Aguacate», «Ácido» con las A).
 * La base ordena por bytes (las mayúsculas primero), por eso los nombres se ordenan con esto.
 */
export const alfa = (columna: string) => sql`lower(translate(${sql.ref(columna)}, 'ÁÉÍÓÚÜáéíóúü', 'AEIOUUaeiouu'))`;
