/**
 * Migración: Crear tabla de vendedores para ventas locales
 * Ejecutar con: npx ts-node src/migrations/005_crear_vendedores_venta_local.ts
 */

import { query } from "../repositories/fbRepository";

const ejecutarMigracion = async () => {
  console.log("🚀 Iniciando migración de vendedores para ventas locales...\n");

  try {
    // 1. Crear tabla MSP_LOCAL_SALE_VENDEDOR
    console.log("1. Creando tabla MSP_LOCAL_SALE_VENDEDOR...");
    await query({
      sql: `
        CREATE TABLE MSP_LOCAL_SALE_VENDEDOR (
          LOCAL_SALE_ID VARCHAR(100) NOT NULL,
          VENDEDOR_EMAIL VARCHAR(200) NOT NULL,
          NOMBRE_VENDEDOR VARCHAR(300) NOT NULL,
          PRIMARY KEY (LOCAL_SALE_ID, VENDEDOR_EMAIL),
          FOREIGN KEY (LOCAL_SALE_ID) REFERENCES MSP_LOCAL_SALE(LOCAL_SALE_ID) ON DELETE CASCADE
        )
      `,
    });
    console.log("   ✅ Tabla MSP_LOCAL_SALE_VENDEDOR creada\n");

    // 2. Crear índice por LOCAL_SALE_ID
    console.log("2. Creando índice IDX_VENTA_VENDEDOR_SALE...");
    await query({
      sql: `CREATE INDEX IDX_VENTA_VENDEDOR_SALE ON MSP_LOCAL_SALE_VENDEDOR(LOCAL_SALE_ID)`,
    });
    console.log("   ✅ Índice IDX_VENTA_VENDEDOR_SALE creado\n");

    // 3. Crear índice por VENDEDOR_EMAIL
    console.log("3. Creando índice IDX_VENTA_VENDEDOR_EMAIL...");
    await query({
      sql: `CREATE INDEX IDX_VENTA_VENDEDOR_EMAIL ON MSP_LOCAL_SALE_VENDEDOR(VENDEDOR_EMAIL)`,
    });
    console.log("   ✅ Índice IDX_VENTA_VENDEDOR_EMAIL creado\n");

    console.log("🎉 Migración completada exitosamente!");
    process.exit(0);
  } catch (error: any) {
    // Verificar si el error es porque ya existe
    if (error.message?.includes("already exists") ||
        error.message?.includes("ya existe") ||
        error.message?.includes("Table MSP_LOCAL_SALE_VENDEDOR already exists")) {
      console.log("⚠️  Algunos objetos ya existían (migración ya aplicada parcialmente)");
      console.log("   Error:", error.message);
      process.exit(0);
    }

    console.error("❌ Error en la migración:", error.message || error);
    process.exit(1);
  }
};

ejecutarMigracion();
