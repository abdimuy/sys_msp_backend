import { query } from "../src/repositories/fbRepository";

async function main() {
  try {
    console.log("Creando índice IDX_MSP_DOCTOS_CC_CONCEPTO_CLI...");
    console.log("Esto puede tardar unos segundos (2.28M filas)...");
    const start = Date.now();

    await query({
      sql: `CREATE INDEX IDX_MSP_DOCTOS_CC_CONCEPTO_CLI ON DOCTOS_CC (CONCEPTO_CC_ID, CANCELADO, CLIENTE_ID)`,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Índice creado exitosamente en ${elapsed}s`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
