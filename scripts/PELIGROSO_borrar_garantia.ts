/**
 * ⚠️  PELIGROSO — Borra una garantía y todo lo relacionado:
 *   - Imágenes de eventos (MSP_GARANTIA_IMAGENES con EVENTO_ID)
 *   - Imágenes de la garantía (MSP_GARANTIA_IMAGENES)
 *   - Eventos (MSP_GARANTIA_EVENTOS)
 *   - La garantía (MSP_GARANTIAS)
 *   - Archivos físicos en uploads/garantias/
 *
 * Uso: npx ts-node scripts/PELIGROSO_borrar_garantia.ts <ID_GARANTIA>
 */

import {
  getDbConnectionAsync,
  getDbTransactionAsync,
  commitTransactionAsync,
  rollbackTransactionAsync,
  detachDbAsync,
  queryAsync,
} from "../src/repositories/fbRepository";
import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.resolve("uploads/garantias");

async function main() {
  const idArg = process.argv[2];
  if (!idArg) {
    console.error("Uso: npx ts-node scripts/PELIGROSO_borrar_garantia.ts <ID_GARANTIA>");
    process.exit(1);
  }

  const garantiaId = Number(idArg);
  if (!Number.isInteger(garantiaId) || garantiaId <= 0) {
    console.error(`ID inválido: ${idArg}`);
    process.exit(1);
  }

  console.log(`\n⚠️  PELIGROSO: Borrando garantía ID=${garantiaId} y todo lo relacionado...\n`);

  const db = await getDbConnectionAsync();
  const tr = await getDbTransactionAsync(db);

  try {
    // 1. Verificar que existe
    const garantia: any[] = await queryAsync(tr, "SELECT ID, EXTERNAL_ID, ESTADO FROM MSP_GARANTIAS WHERE ID = ?", [garantiaId]);
    if (!garantia || garantia.length === 0) {
      console.error(`No existe garantía con ID=${garantiaId}`);
      await rollbackTransactionAsync(tr);
      await detachDbAsync(db);
      process.exit(1);
    }
    console.log(`  Garantía encontrada: ID=${garantia[0].ID}, EXTERNAL_ID=${garantia[0].EXTERNAL_ID}, ESTADO=${garantia[0].ESTADO}`);

    // 2. Obtener rutas de imágenes para borrar archivos físicos
    const imagenes: any[] = await queryAsync(tr, "SELECT IMG_PATH FROM MSP_GARANTIA_IMAGENES WHERE GARANTIA_ID = ?", [garantiaId]);
    console.log(`  Imágenes en BD: ${imagenes.length}`);

    // 3. Borrar imágenes de la BD
    const delImg: any = await queryAsync(tr, "DELETE FROM MSP_GARANTIA_IMAGENES WHERE GARANTIA_ID = ?", [garantiaId]);
    console.log(`  Imágenes borradas de BD`);

    // 4. Borrar eventos
    const delEv: any = await queryAsync(tr, "DELETE FROM MSP_GARANTIA_EVENTOS WHERE GARANTIA_ID = ?", [garantiaId]);
    console.log(`  Eventos borrados de BD`);

    // 5. Borrar la garantía
    await queryAsync(tr, "DELETE FROM MSP_GARANTIAS WHERE ID = ?", [garantiaId]);
    console.log(`  Garantía borrada de BD`);

    // 6. Commit
    await commitTransactionAsync(tr);
    console.log(`  Commit OK`);

    // 7. Borrar archivos físicos
    let archivosBorrados = 0;
    for (const img of imagenes) {
      if (!img.IMG_PATH) continue;
      const filename = path.basename(img.IMG_PATH);
      const fullPath = path.join(UPLOADS_DIR, filename);
      try {
        await fs.unlink(fullPath);
        archivosBorrados++;
      } catch {
        console.log(`  Archivo no encontrado (ya borrado?): ${fullPath}`);
      }
    }
    console.log(`  Archivos físicos borrados: ${archivosBorrados}/${imagenes.length}`);

    console.log(`\n✅ Garantía ID=${garantiaId} eliminada completamente.\n`);
  } catch (err) {
    console.error("Error, haciendo rollback:", err);
    try { await rollbackTransactionAsync(tr); } catch {}
    process.exit(1);
  } finally {
    try { await detachDbAsync(db); } catch {}
  }
}

main();
