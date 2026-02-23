/**
 * Prueba: Crear una venta local con combo (sin traspaso)
 * Ejecutar con: npx ts-node src/migrations/002_prueba_venta_con_combo.ts
 */

import controller from "../components/ventasLocales/controller";
import store from "../components/ventasLocales/store";

const crearVentaPrueba = async () => {
  console.log("🧪 Creando venta de prueba con combo...\n");

  const ventaPrueba = {
    localSaleId: "VENTA-PRUEBA-COMBO-001",
    userEmail: "prueba@test.com",
    nombreCliente: "Cliente de Prueba",
    fechaVenta: new Date(),
    latitud: 25.6866,
    longitud: -100.3161,
    direccion: "Calle de Prueba 123",
    parcialidad: 500,
    enganche: 1000,
    telefono: "8181234567",
    frecPago: "SEMANAL",
    diaCobranza: "LUNES",
    precioTotal: 15500,
    tiempoACortoPlazoMeses: 12,
    montoACortoPlazo: 18000,
    tipoVenta: "CREDITO" as const,
    almacenOrigenId: 1001, // Almacén ficticio para prueba
    omitirTraspaso: true, // ← No hacer traspaso de inventario
    productos: [
      // Productos del combo (precio en 0 porque el precio está en el combo)
      {
        articuloId: 378,
        articulo: "ALACENA CANTINERA CAOBA",
        cantidad: 1,
        precioLista: 0,
        precioCortoPlazo: 0,
        precioContado: 0,
        comboId: "COMBO-RECAMARA-001",
      },
      {
        articuloId: 381,
        articulo: "ALACENA CANTINERA CHOCOLATE",
        cantidad: 1,
        precioLista: 0,
        precioCortoPlazo: 0,
        precioContado: 0,
        comboId: "COMBO-RECAMARA-001",
      },
      {
        articuloId: 384,
        articulo: "ALACENA CANTINERA NOGAL",
        cantidad: 2,
        precioLista: 0,
        precioCortoPlazo: 0,
        precioContado: 0,
        comboId: "COMBO-RECAMARA-001",
      },
      // Producto individual (fuera del combo)
      {
        articuloId: 387,
        articulo: "ALACENA CANTINERA VINO",
        cantidad: 1,
        precioLista: 500,
        precioCortoPlazo: 600,
        precioContado: 450,
      },
    ],
    combos: [
      {
        comboId: "COMBO-RECAMARA-001",
        nombreCombo: "Combo Recámara King Completa",
        precioLista: 15000,
        precioCortoPlazo: 18000,
        precioContado: 14000,
      },
    ],
  };

  try {
    console.log("📝 Datos de la venta:");
    console.log("   - ID:", ventaPrueba.localSaleId);
    console.log("   - Cliente:", ventaPrueba.nombreCliente);
    console.log("   - Productos:", ventaPrueba.productos.length);
    console.log("   - Combos:", ventaPrueba.combos.length);
    console.log("   - Omitir traspaso:", ventaPrueba.omitirTraspaso);
    console.log("");

    const resultado = await controller.crear(ventaPrueba);

    console.log("✅ Venta creada exitosamente!");
    console.log("   Resultado:", JSON.stringify(resultado, null, 2));
    console.log("");

    // Obtener la venta completa para verificar
    console.log("📖 Obteniendo venta completa para verificar...\n");
    const ventaCompleta = await store.obtenerCompleta(ventaPrueba.localSaleId);

    console.log("📦 Venta completa:");
    console.log("   - LOCAL_SALE_ID:", ventaCompleta.LOCAL_SALE_ID);
    console.log("   - NOMBRE_CLIENTE:", ventaCompleta.NOMBRE_CLIENTE);
    console.log("   - PRECIO_TOTAL:", ventaCompleta.PRECIO_TOTAL);
    console.log("");

    console.log("📦 Productos:");
    ventaCompleta.productos.forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ${p.ARTICULO} (x${p.CANTIDAD})`);
      console.log(`      - Precio Lista: $${p.PRECIO_LISTA}`);
      console.log(`      - Combo ID: ${p.COMBO_ID || "(sin combo)"}`);
    });
    console.log("");

    console.log("🎁 Combos:");
    if (ventaCompleta.combos && ventaCompleta.combos.length > 0) {
      ventaCompleta.combos.forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. ${c.NOMBRE_COMBO}`);
        console.log(`      - ID: ${c.COMBO_ID}`);
        console.log(`      - Precio Lista: $${c.PRECIO_LISTA}`);
        console.log(`      - Precio Corto Plazo: $${c.PRECIO_CORTO_PLAZO}`);
        console.log(`      - Precio Contado: $${c.PRECIO_CONTADO}`);
      });
    } else {
      console.log("   (sin combos)");
    }

    console.log("\n🎉 Prueba completada exitosamente!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message || error);
    if (error.detalles) {
      console.error("   Detalles:", error.detalles);
    }
    process.exit(1);
  }
};

crearVentaPrueba();
