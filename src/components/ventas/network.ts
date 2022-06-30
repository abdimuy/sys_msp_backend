import express from "express";
import controller from "./controller";
import responses from "../../network/responses";

const router = express.Router();

router.get("/ruta/:numRuta", (req, res) => {
  const { numRuta } = req.params;
  controller
    .getVentasByRuta(parseInt(numRuta))
    .then((ventas) => {
      responses.success({ req, res, data: ventas });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener las ventas",
        details: err,
      });
    });
});

router.get("/:clienteId", (req, res) => {
  const { clienteId } = req.params;
  const clienteIdNum = parseInt(clienteId);
  controller
    .getVentasByCliente(clienteIdNum)
    .then((ventas) => {
      responses.success({ req, res, data: ventas });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener las ventas del cliente",
        details: err,
      });
    });
});

export default router;
