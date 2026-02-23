/**
 * Migración: Crear tabla de combos para ventas locales
 * Ejecutar con: npx ts-node src/migrations/001_crear_combos_venta_local.ts
 */

import { query } from "../repositories/fbRepository";

const ejecutarMigracion = async () => {
  console.log("🚀 Iniciando migración de combos para ventas locales...\n");

  try {
    // 1. Crear tabla MSP_LOCAL_SALE_COMBO
    console.log("1. Creando tabla MSP_LOCAL_SALE_COMBO...");
    await query({
      sql: `
        CREATE TABLE MSP_LOCAL_SALE_COMBO (
          COMBO_ID VARCHAR(100) NOT NULL,
          LOCAL_SALE_ID VARCHAR(100) NOT NULL,
          NOMBRE_COMBO VARCHAR(200) NOT NULL,
          PRECIO_LISTA DECIMAL(15,2) DEFAULT 0,
          PRECIO_CORTO_PLAZO DECIMAL(15,2) DEFAULT 0,
          PRECIO_CONTADO DECIMAL(15,2) DEFAULT 0,
          PRIMARY KEY (COMBO_ID),
          FOREIGN KEY (LOCAL_SALE_ID) REFERENCES MSP_LOCAL_SALE(LOCAL_SALE_ID) ON DELETE CASCADE
        )
      `,
    });
    console.log("   ✅ Tabla MSP_LOCAL_SALE_COMBO creada\n");

    // 2. Agregar campo COMBO_ID a MSP_LOCAL_SALE_PRODUCT
    console.log("2. Agregando campo COMBO_ID a MSP_LOCAL_SALE_PRODUCT...");
    await query({
      sql: `ALTER TABLE MSP_LOCAL_SALE_PRODUCT ADD COMBO_ID VARCHAR(100)`,
    });
    console.log("   ✅ Campo COMBO_ID agregado\n");

    // 3. Crear índice para mejorar consultas por LOCAL_SALE_ID en combos
    console.log("3. Creando índice IDX_COMBO_LOCAL_SALE...");
    await query({
      sql: `CREATE INDEX IDX_COMBO_LOCAL_SALE ON MSP_LOCAL_SALE_COMBO(LOCAL_SALE_ID)`,
    });
    console.log("   ✅ Índice IDX_COMBO_LOCAL_SALE creado\n");

    // 4. Crear índice para mejorar consultas por COMBO_ID en productos
    console.log("4. Creando índice IDX_PRODUCT_COMBO...");
    await query({
      sql: `CREATE INDEX IDX_PRODUCT_COMBO ON MSP_LOCAL_SALE_PRODUCT(COMBO_ID)`,
    });
    console.log("   ✅ Índice IDX_PRODUCT_COMBO creado\n");

    console.log("🎉 Migración completada exitosamente!");
    process.exit(0);
  } catch (error: any) {
    // Verificar si el error es porque ya existe
    if (error.message?.includes("already exists") ||
        error.message?.includes("ya existe") ||
        error.message?.includes("Table MSP_LOCAL_SALE_COMBO already exists") ||
        error.message?.includes("Column COMBO_ID already exists")) {
      console.log("⚠️  Algunos objetos ya existían (migración ya aplicada parcialmente)");
      console.log("   Error:", error.message);
      process.exit(0);
    }

    console.error("❌ Error en la migración:", error.message || error);
    process.exit(1);
  }
};

ejecutarMigracion();
