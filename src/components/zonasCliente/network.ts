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

router.get("/update-zonas-clientes-firebase", (req, res) => {
  controller
    .updateZonasFirebase()
    .then((result) => {
      responses.success({ req, res, data: result });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al actualizar la zonas en firebase",
        details: err,
      });
    });
})

export default router;
