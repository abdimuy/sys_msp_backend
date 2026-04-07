/**
 * Migración: Crear generador de folios para traspasos (GEN_MST_FOLIO)
 * Ejecutar con: npx ts-node src/migrations/007_crear_generador_folios_traspasos.ts
 */

import { query } from "../repositories/fbRepository";

const ejecutarMigracion = async () => {
  console.log("Iniciando migración: crear generador GEN_MST_FOLIO...\n");

  try {
    await query({
      sql: `CREATE GENERATOR GEN_MST_FOLIO`,
    });
    console.log("Generador GEN_MST_FOLIO creado correctamente");

    await query({
      sql: `SET GENERATOR GEN_MST_FOLIO TO 0`,
    });
    console.log("Generador inicializado en 0");

    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("El generador GEN_MST_FOLIO ya existe");
      process.exit(0);
    }

    console.error("Error en la migración:", error.message || error);
    process.exit(1);
  }
};

ejecutarMigracion();
