import { query } from "../src/repositories/fbRepository";

async function main() {
  try {
    console.log("Creando índice IDX_MSP_PAGOS_DOCTO_CC_ID...");
    const start = Date.now();

    await query({
      sql: `CREATE INDEX IDX_MSP_PAGOS_DOCTO_CC_ID ON MSP_PAGOS_RECIBIDOS (DOCTO_CC_ID)`,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Índice creado en ${elapsed}s`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
