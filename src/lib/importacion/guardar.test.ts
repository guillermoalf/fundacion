import { describe, expect, it } from "vitest";
import type { FilaImportada } from "./activosExcel";
import { guardarImportacion, ImportacionDuplicadaError } from "./guardar";

const fila = (p: Partial<FilaImportada>): FilaImportada => ({
  filaOrigen: 10, ubicacion: "COCINA", tipoBien: "Licuadora", marca: null, modelo: null, serie: null, placa: "001",
  fechaAdquisicion: "2024-01-15", fechaAproximada: false, costoEnArchivo: 50000, unidadesCompra: null, costo: 50000,
  categoria: { nombre: "Cocinas", tasaAnual: 10, aniosVida: 10, palabrasClave: [] },
  depreciacionAcumulada: null, valorLibros: null, pendientes: [], ...p,
});

/** Cliente falso: devuelve las ubicaciones dadas y guarda lo que se le manda a la función. */
function clienteFalso(ubicaciones: string[], error?: Error) {
  const llamadas: { funcion: string; args: Record<string, any> }[] = [];
  return {
    llamadas,
    nombresUbicaciones: async () => ubicaciones,
    guardarImportacionActivos: async (args: Record<string, any>) => {
      llamadas.push({ funcion: "guardar_importacion_activos", args });
      if (error) throw error;
      return { activos: 0, ubicacionesCreadas: [] };
    },
  };
}

describe("guardarImportacion", () => {
  it("manda todo en una sola llamada a la función transaccional", async () => {
    const db = clienteFalso(["Cocina", "Sin ubicación"]);
    await guardarImportacion(db, [fila({}), fila({ placa: "002" })], {
      fuenteCodigo: "PANI", archivo: "Activos.xlsx", categoriaIdPorNombre: new Map([["Cocinas", 7]]),
    });
    expect(db.llamadas).toHaveLength(1);
    expect(db.llamadas[0].funcion).toBe("guardar_importacion_activos");
    expect(db.llamadas[0].args).toMatchObject({ p_fuente: "PANI", p_archivo: "Activos.xlsx", p_forzar: false });
    expect(db.llamadas[0].args.p_activos[0]).toMatchObject({
      placa: "001", categoria_id: 7, ubicacion: "Cocina", fila_origen: "Activos.xlsx · fila 10", notas: null,
    });
  });

  it("reconoce ubicaciones existentes aunque cambien tildes y mayúsculas, y solo crea las que faltan", async () => {
    const db = clienteFalso(["Estimulación Temprana", "Sin ubicación"]);
    await guardarImportacion(db, [fila({ ubicacion: "ESTIMULACION TEMPRANA" }), fila({ ubicacion: "AULA 3 AFTER II" }), fila({ ubicacion: null })], {
      fuenteCodigo: "PANI", archivo: "a.xlsx", categoriaIdPorNombre: new Map(),
    });
    const { p_activos, p_ubicaciones_nuevas } = db.llamadas[0].args;
    expect(p_activos.map((a: any) => a.ubicacion)).toEqual(["Estimulación Temprana", "Aula 3 After II", "Sin ubicación"]);
    expect(p_ubicaciones_nuevas).toEqual([{ nombre: "Aula 3 After II", tipo: "aula" }]);
  });

  it("guarda los pendientes como notas y deja vacíos los datos que faltan (nunca en cero)", async () => {
    const db = clienteFalso(["Cocina"]);
    await guardarImportacion(db, [fila({ costo: null, fechaAdquisicion: null, categoria: null, pendientes: ["Sin costo de adquisición", "Sin fecha de adquisición"] })], {
      fuenteCodigo: "PANI", archivo: "a.xlsx", categoriaIdPorNombre: new Map(),
    });
    expect(db.llamadas[0].args.p_activos[0]).toMatchObject({
      costo: null, fecha_adquisicion: null, categoria_id: null, notas: "Sin costo de adquisición | Sin fecha de adquisición",
    });
  });

  it("avisa con un error propio cuando el archivo ya se había importado", async () => {
    const db = clienteFalso(["Cocina"], new ImportacionDuplicadaError('El archivo "a.xlsx" ya se importó.'));
    await expect(guardarImportacion(db, [fila({})], { fuenteCodigo: "PANI", archivo: "a.xlsx", categoriaIdPorNombre: new Map() }))
      .rejects.toBeInstanceOf(ImportacionDuplicadaError);
  });
});
