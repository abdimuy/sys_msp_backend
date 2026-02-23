/**
 * Migración: Aumentar tamaño del campo NOTA en MSP_VISITAS
 * Ejecutar con: npx ts-node src/migrations/004_aumentar_nota_visitas.ts
 */

import { query } from "../repositories/fbRepository";

const ejecutarMigracion = async () => {
  console.log("Iniciando migración para aumentar campo NOTA en MSP_VISITAS...\n");

  try {
    console.log("Alterando campo NOTA a VARCHAR(10000)...");
    await query({
      sql: `ALTER TABLE MSP_VISITAS ALTER COLUMN NOTA TYPE VARCHAR(10000)`,
    });
    console.log("Campo NOTA modificado exitosamente\n");

    console.log("Migración completada!");
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already") ||
        error.message?.includes("ya existe")) {
      console.log("Campo ya fue modificado previamente");
      process.exit(0);
    }

    console.error("Error en la migración:", error.message || error);
    process.exit(1);
  }
};

ejecutarMigracion();
