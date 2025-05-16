import express from "express";
import router from "./network/router";
import cors from "cors";
import { connectToMongo } from "./repositories/mongoConnection";
import { syncInitialData } from "./components/sincronizarAMongo/store";
import store from "./components/pagos/store";
import path from "path"

const app = express();

// __dirname existe en CommonJS y apunta a la carpeta de este archivo
const uploadsDir = path.join(__dirname, '..', 'uploads');

// 1. Servir la carpeta 'uploads' en la URL '/uploads'
app.use('/uploads', express.static(uploadsDir));


(async () => {
  try {
    const db = await connectToMongo();
    console.log('La conexión a MongoDB se realizó correctamente.');
    // Aquí puedes iniciar tu servidor o ejecutar consultas usando "db"
  } catch (error) {
    console.error('No se pudo conectar a MongoDB:', error);
  }
})();

// syncInitialData().then(() => {
//   setInterval(store.syncChangesToMongo, 30000);
//   store.syncChangesToMongo();
// })


//Descomentar esta parte
// setInterval(store.syncChangesToMongo, 30000);
// store.syncChangesToMongo();

app.use(cors());
app.use(express.json());
router(app);

export default app;
