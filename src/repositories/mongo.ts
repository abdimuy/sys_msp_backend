// mongodb.client.ts
import { MongoClient, ServerApiVersion } from "mongodb";

// URI de conexión a MongoDB. Asegúrate de reemplazar '<password>' con tu contraseña real.
const uri =
  "mongodb+srv://admin:admin@cluster0.uxlx8vt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Conectar al servidor MongoDB automáticamente al cargar el módulo.
client
  .connect()
  .then(() => console.log("Connected successfully to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Exportar el cliente de MongoDB para ser usado en otras partes de la aplicación.
export default client.db("Cluster0");
