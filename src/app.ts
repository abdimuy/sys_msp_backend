import express from "express";
import router from "./network/router";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
router(app);

export default app;
