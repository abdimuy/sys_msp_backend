import { Router } from "express";
import controller from "./controller";
import responses from "../../network/responses";

const router = Router();

router.get("/", (req, res) => {
  controller
    .getZonasCliente()
    .then((zonas) => {
      responses.success({ req, res, data: zonas });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener las zonas",
        details: err,
      });
    });
});

export default router;
