/**
 * Script para eliminar UNA venta local completamente
 * Elimina todas las filas relacionadas y los archivos físicos de imágenes
 *
 * Uso: npx ts-node src/migrations/eliminar_venta_local.ts <LOCAL_SALE_ID>
 */

import fs from "fs";
import path from "path";
import { query } from "../repositories/fbRepository";

interface IImagenRow {
  IMG_PATH: string;
}

const main = async () => {
  const localSaleId = process.argv[2]?.trim().toUpperCase();

  if (!localSaleId) {
    console.log("Uso: npx ts-node src/migrations/eliminar_venta_local.ts <LOCAL_SALE_ID>");
    process.exit(1);
  }

  console.log(`🗑️  Eliminando venta local: ${localSaleId}\n`);

  // Verificar que existe
  const existe = await query<{ TOTAL: number }>({
    sql: "SELECT COUNT(*) AS TOTAL FROM MSP_LOCAL_SALE WHERE LOCAL_SALE_ID = ?",
    params: [localSaleId],
  });

  if (existe[0].TOTAL === 0) {
    console.log("❌ No se encontró la venta con ese ID");
    process.exit(1);
  }

  // 1. Eliminar archivos físicos de imágenes
  const imagenes = await query<IImagenRow>({
    sql: "SELECT IMG_PATH FROM MSP_LOCAL_SALE_IMAGES WHERE LOCAL_SALE_ID = ?",
    params: [localSaleId],
    converters: [{ type: "buffer", column: "IMG_PATH" }],
  });

  let archivosEliminados = 0;
  for (const img of imagenes) {
    const rutaAbsoluta = path.resolve("." + img.IMG_PATH);
    try {
      if (fs.existsSync(rutaAbsoluta)) {
        fs.unlinkSync(rutaAbsoluta);
        archivosEliminados++;
      }
    } catch {
      console.warn(`   ⚠️  No se pudo eliminar archivo: ${rutaAbsoluta}`);
    }
  }
  console.log(`   Archivos de imágenes eliminados: ${archivosEliminados}`);

  // 2. Eliminar filas de tablas hijas
  const tablas = [
    "MSP_LOCAL_SALE_VENDEDOR",
    "MSP_LOCAL_SALE_IMAGES",
    "MSP_LOCAL_SALE_PRODUCT",
    "MSP_LOCAL_SALE_COMBO",
  ];

  for (const tabla of tablas) {
    try {
      await query({ sql: `DELETE FROM ${tabla} WHERE LOCAL_SALE_ID = ?`, params: [localSaleId] });
      console.log(`   ✅ ${tabla}`);
    } catch (err: any) {
      if (err.message?.includes("not found") || err.message?.includes("does not exist")) {
        console.log(`   ⏭️  ${tabla} (no existe, omitida)`);
      } else {
        throw err;
      }
    }
  }

  // 3. Eliminar la venta principal
  await query({ sql: "DELETE FROM MSP_LOCAL_SALE WHERE LOCAL_SALE_ID = ?", params: [localSaleId] });
  console.log(`   ✅ MSP_LOCAL_SALE`);

  console.log(`\n🎉 Venta ${localSaleId} eliminada completamente`);
  process.exit(0);
};

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});
