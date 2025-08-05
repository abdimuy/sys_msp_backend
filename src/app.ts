import express from "express";
import router from "./network/router";
import cors from "cors";
import { connectToMongo } from "./repositories/mongoConnection";
import { syncInitialData } from "./components/sincronizarAMongo/store";
import store from "./components/pagos/store";
import path from "path";
import fs from "fs";

const app = express();

const privadosDir = path.join(__dirname, "..", "private_files");

// Servir archivos estáticos desde otra carpeta con otra URL base
app.use("/private", express.static(privadosDir));


app.get("/download-app/:nombreArchivo", (req, res) => {
  const nombreArchivo = path.basename(req.params.nombreArchivo);
  const archivoPath = path.join(privadosDir, nombreArchivo);

  if (!fs.existsSync(archivoPath)) {
    return res.status(404).send("Archivo no encontrado");
  }

  res.download(archivoPath, nombreArchivo);
});

// __dirname existe en CommonJS y apunta a la carpeta de este archivo
const uploadsDir = path.join(__dirname, "..", "uploads");

// 1. Servir la carpeta 'uploads' en la URL '/uploads'
app.use("/uploads", express.static(uploadsDir));

(async () => {
  try {
    const db = await connectToMongo();
    console.log("La conexión a MongoDB se realizó correctamente.");
    // Aquí puedes iniciar tu servidor o ejecutar consultas usando "db"
  } catch (error) {
    console.error("No se pudo conectar a MongoDB:", error);
  }
})();

// syncInitialData().then(() => {
//   setInterval(store.syncChangesToMongo, 30000);
//   store.syncChangesToMongo();
// })

// Configuración mejorada de sincronización
const SYNC_INTERVAL = 30000; // 30 segundos

// Ejecutar sincronización inicial
store.syncChangesToMongo();

// Configurar intervalo de sincronización
setInterval(() => {
  store.syncChangesToMongo();
}, SYNC_INTERVAL);

console.log(`Sincronización automática configurada cada ${SYNC_INTERVAL / 1000} segundos`);

import garantias from "./components/garantias/network";

app.use(cors());
app.use(express.json());

app.use("/garantias", garantias);
router(app);


export default app;
