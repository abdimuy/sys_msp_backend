import express from "express";
import router from "./network/router";
import cors from "cors";
import ventasStore from "./components/ventas/stores";

const app = express();

app.use(cors());
app.use(express.json());
router(app);

ventasStore.listeningPagos();

export default app;
