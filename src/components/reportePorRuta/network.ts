import express, { response } from "express";
import responses from "../../network/responses";
import controller from "./controller";

const router = express.Router();

router.get("/", (req, res) => {
  controller
    .getReportsRutas()
    .then((reports) => {
      responses.success({ req, res, data: reports });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener los reportes por ruta",
        details: err,
      });
    });
});

export default router;
