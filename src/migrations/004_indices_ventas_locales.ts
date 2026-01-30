/**
 * Migración: Crear índices para optimizar consultas de ventas locales
 *
 * Estos índices están diseñados para soportar:
 * - Paginación por cursor (FECHA_VENTA + LOCAL_SALE_ID)
 * - Filtros frecuentes (NOMBRE_CLIENTE, TIPO_VENTA, ZONA_CLIENTE_ID, etc.)
 * - Búsqueda por rango de fechas
 * - Búsqueda por vendedor (USER_EMAIL)
 *
 * Ejecutar con: npx ts-node src/migrations/004_indices_ventas_locales.ts
 */

import { query } from "../repositories/fbRepository";

interface IIndexDefinition {
  name: string;
  table: string;
  columns: string[];
  descending?: boolean;  // Para Firebird: CREATE DESCENDING INDEX
  description: string;
}

const INDICES: IIndexDefinition[] = [
  // Índice descendente principal para paginación por cursor
  // Soporta ORDER BY FECHA_VENTA DESC
  {
    name: "IDX_LOCAL_SALE_FECHA_DESC",
    table: "MSP_LOCAL_SALE",
    columns: ["FECHA_VENTA"],
    descending: true,
    description: "Índice descendente para paginación por fecha",
  },

  // Índice para búsqueda por nombre de cliente
  {
    name: "IDX_LOCAL_SALE_CLIENTE",
    table: "MSP_LOCAL_SALE",
    columns: ["NOMBRE_CLIENTE"],
    description: "Búsqueda por nombre de cliente",
  },

  // Índice para filtro por tipo de venta
  {
    name: "IDX_LOCAL_SALE_TIPO",
    table: "MSP_LOCAL_SALE",
    columns: ["TIPO_VENTA"],
    description: "Filtro por tipo de venta (CONTADO/CREDITO)",
  },

  // Índice para filtro por zona de cliente
  {
    name: "IDX_LOCAL_SALE_ZONA",
    table: "MSP_LOCAL_SALE",
    columns: ["ZONA_CLIENTE_ID"],
    description: "Filtro por zona de cliente",
  },

  // Índice para filtro por vendedor
  {
    name: "IDX_LOCAL_SALE_VENDEDOR",
    table: "MSP_LOCAL_SALE",
    columns: ["USER_EMAIL"],
    description: "Filtro por vendedor (email)",
  },

  // Índice para filtro por almacén
  {
    name: "IDX_LOCAL_SALE_ALMACEN",
    table: "MSP_LOCAL_SALE",
    columns: ["ALMACEN_ID"],
    description: "Filtro por almacén origen",
  },

  // Índice compuesto para filtro por tipo + fecha (consultas frecuentes)
  {
    name: "IDX_LOCAL_SALE_TIPO_FECHA",
    table: "MSP_LOCAL_SALE",
    columns: ["TIPO_VENTA", "FECHA_VENTA"],
    description: "Filtro combinado tipo + fecha",
  },

  // Índice compuesto para filtro por zona + fecha
  {
    name: "IDX_LOCAL_SALE_ZONA_FECHA",
    table: "MSP_LOCAL_SALE",
    columns: ["ZONA_CLIENTE_ID", "FECHA_VENTA"],
    description: "Filtro combinado zona + fecha",
  },

  // Índice compuesto para filtro por vendedor + fecha
  {
    name: "IDX_LOCAL_SALE_VENDEDOR_FECHA",
    table: "MSP_LOCAL_SALE",
    columns: ["USER_EMAIL", "FECHA_VENTA"],
    description: "Filtro combinado vendedor + fecha",
  },

  // Índice para búsqueda por ciudad
  {
    name: "IDX_LOCAL_SALE_CIUDAD",
    table: "MSP_LOCAL_SALE",
    columns: ["CIUDAD"],
    description: "Búsqueda por ciudad",
  },

  // Índice para filtro por precio total
  {
    name: "IDX_LOCAL_SALE_PRECIO",
    table: "MSP_LOCAL_SALE",
    columns: ["PRECIO_TOTAL"],
    description: "Filtro por rango de precio",
  },

  // Índice para filtro por estado de envío
  {
    name: "IDX_LOCAL_SALE_ENVIADO",
    table: "MSP_LOCAL_SALE",
    columns: ["ENVIADO"],
    description: "Filtro por estado de envío",
  },

  // Índice para productos por venta
  {
    name: "IDX_LOCAL_SALE_PRODUCT_SALE",
    table: "MSP_LOCAL_SALE_PRODUCT",
    columns: ["LOCAL_SALE_ID", "ARTICULO_ID"],
    description: "Búsqueda de productos por venta",
  },
];

const crearIndice = async (index: IIndexDefinition): Promise<boolean> => {
  const columnsStr = index.columns.join(", ");
  // En Firebird, para índices descendentes se usa: CREATE DESCENDING INDEX
  const descendingKeyword = index.descending ? "DESCENDING " : "";
  const sql = `CREATE ${descendingKeyword}INDEX ${index.name} ON ${index.table}(${columnsStr})`;

  try {
    await query({ sql });
    console.log(`   ✅ ${index.name} - ${index.description}`);
    return true;
  } catch (error: any) {
    // Verificar si ya existe
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("ya existe") ||
      error.message?.includes("attempt to store duplicate value")
    ) {
      console.log(`   ⏭️  ${index.name} - Ya existe (omitido)`);
      return true;
    }
    console.error(`   ❌ ${index.name} - Error: ${error.message}`);
    return false;
  }
};

const ejecutarMigracion = async () => {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   MIGRACIÓN: Índices para Ventas Locales (Producción)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let exitosos = 0;
  let fallidos = 0;

  console.log("Creando índices...\n");

  for (const index of INDICES) {
    const resultado = await crearIndice(index);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`   RESULTADO: ${exitosos} exitosos, ${fallidos} fallidos`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (fallidos > 0) {
    console.log("⚠️  Algunos índices no pudieron crearse. Revisa los errores arriba.");
    process.exit(1);
  }

  console.log("🎉 Migración completada exitosamente!\n");
  console.log("Índices creados optimizan:");
  console.log("  • Paginación por cursor (FECHA_VENTA + LOCAL_SALE_ID)");
  console.log("  • Filtros individuales (cliente, tipo, zona, vendedor, etc.)");
  console.log("  • Filtros combinados (tipo+fecha, zona+fecha, vendedor+fecha)");
  console.log("  • Búsqueda por ciudad y rango de precios");
  console.log("");

  process.exit(0);
};

ejecutarMigracion();
