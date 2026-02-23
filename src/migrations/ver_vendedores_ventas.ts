/**
 * Script para verificar si las últimas ventas locales tienen vendedores asignados
 *
 * Uso: npx ts-node src/migrations/ver_vendedores_ventas.ts [cantidad]
 * Ejemplo: npx ts-node src/migrations/ver_vendedores_ventas.ts 10
 */

import { query } from "../repositories/fbRepository";

interface IVentaRow {
  LOCAL_SALE_ID: string;
  USER_EMAIL: string;
  NOMBRE_CLIENTE: string;
  FECHA_VENTA: string;
  TOTAL_VENDEDORES: number;
}

interface IVendedorRow {
  LOCAL_SALE_ID: string;
  VENDEDOR_EMAIL: string;
  NOMBRE_VENDEDOR: string;
}

const main = async () => {
  const cantidad = parseInt(process.argv[2] || "10", 10);

  console.log(`📋 Últimas ${cantidad} ventas locales y sus vendedores\n`);

  const ventas = await query<IVentaRow>({
    sql: `
      SELECT FIRST ${cantidad}
        V.LOCAL_SALE_ID,
        V.USER_EMAIL,
        V.NOMBRE_CLIENTE,
        V.FECHA_VENTA,
        (SELECT COUNT(*) FROM MSP_LOCAL_SALE_VENDEDOR VE WHERE VE.LOCAL_SALE_ID = V.LOCAL_SALE_ID) AS TOTAL_VENDEDORES
      FROM MSP_LOCAL_SALE V
      ORDER BY V.FECHA_VENTA DESC
    `,
    converters: [
      { type: "buffer", column: "LOCAL_SALE_ID" },
      { type: "buffer", column: "USER_EMAIL" },
      { type: "buffer", column: "NOMBRE_CLIENTE" },
    ],
  });

  if (ventas.length === 0) {
    console.log("No hay ventas locales registradas.");
    process.exit(0);
  }

  let conVendedores = 0;
  let sinVendedores = 0;

  for (const venta of ventas) {
    const tiene = venta.TOTAL_VENDEDORES > 0;
    if (tiene) conVendedores++;
    else sinVendedores++;

    console.log(`${tiene ? "✅" : "❌"} ${venta.LOCAL_SALE_ID}`);
    console.log(`   Cliente: ${venta.NOMBRE_CLIENTE}`);
    console.log(`   Email: ${venta.USER_EMAIL}`);
    console.log(`   Fecha: ${venta.FECHA_VENTA}`);
    console.log(`   Vendedores: ${venta.TOTAL_VENDEDORES}`);

    if (tiene) {
      const vendedores = await query<IVendedorRow>({
        sql: "SELECT VENDEDOR_EMAIL, NOMBRE_VENDEDOR FROM MSP_LOCAL_SALE_VENDEDOR WHERE LOCAL_SALE_ID = ?",
        params: [venta.LOCAL_SALE_ID],
        converters: [
          { type: "buffer", column: "VENDEDOR_EMAIL" },
          { type: "buffer", column: "NOMBRE_VENDEDOR" },
        ],
      });
      for (const v of vendedores) {
        console.log(`     - ${v.NOMBRE_VENDEDOR} (${v.VENDEDOR_EMAIL})`);
      }
    }
    console.log("");
  }

  console.log(`── Resumen`);
  console.log(`   Con vendedores: ${conVendedores}`);
  console.log(`   Sin vendedores: ${sinVendedores}`);
  process.exit(0);
};

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});
