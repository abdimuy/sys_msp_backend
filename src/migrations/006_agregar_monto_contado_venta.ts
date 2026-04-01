/**
 * Migración: Agregar campo MONTO_CONTADO a MSP_LOCAL_SALE
 * Ejecutar con: npx ts-node src/migrations/006_agregar_monto_contado_venta.ts
 */

import { query } from "../repositories/fbRepository";

const ejecutarMigracion = async () => {
  console.log("Iniciando migración: agregar MONTO_CONTADO a MSP_LOCAL_SALE...\n");

  try {
    await query({
      sql: `ALTER TABLE MSP_LOCAL_SALE ADD MONTO_CONTADO BIGINT DEFAULT 0`,
    });
    console.log("Campo MONTO_CONTADO agregado correctamente");
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("El campo MONTO_CONTADO ya existe");
      process.exit(0);
    }

    console.error("Error en la migración:", error.message || error);
    process.exit(1);
  }
};

ejecutarMigracion();
