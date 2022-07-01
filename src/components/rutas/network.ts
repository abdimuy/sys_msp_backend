import express from "express";
import responses from "../../network/responses";
import controller from "./controller";

const router = express.Router();

router.get("/", (req, res) => {
  controller
    .getRutas()
    .then((rutas) => {
      responses.success({ req, res, data: rutas });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener las rutas",
        details: err,
      });
    });
});

router.get("/num_ctas_por_ruta", (req, res) => {
  controller
    .getNumCtasByRuta()
    .then((numCtasRutas) => {
      responses.success({ req, res, data: numCtasRutas });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener el numero de cuentas por rutas",
        details: err,
      });
    });
});

export default router;
