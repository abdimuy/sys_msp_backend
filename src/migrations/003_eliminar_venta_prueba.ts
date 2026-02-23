import store from "../components/ventasLocales/store";

async function eliminar() {
  try {
    console.log("🗑️  Eliminando venta VENTA-PRUEBA-COMBO-001...");
    const resultado = await store.eliminar("VENTA-PRUEBA-COMBO-001");
    console.log("✅ Resultado:", resultado);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
  process.exit(0);
}
eliminar();
