import express from "express";
import controller from "./controller";
import responses from "../../network/responses";

const router = express.Router();

router.get("/search", (req, res) => {
  const { text = "" } = req.query;
  controller
    .getClienteByText(text.toString())
    .then((cliente) => {
      responses.success({ req, res, data: cliente });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener el cliente",
        details: err,
      });
    });
});

router.get("/:clienteId", (req, res) => {
  const { clienteId } = req.params;
  controller
    .getClienteById(parseInt(clienteId))
    .then((cliente) => {
      responses.success({ req, res, data: cliente });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener el cliente",
        details: err,
      });
    });
});

export default router;
