import express from "express";
import compression from "compression";
import controller from "./controller";
import responses from "../../network/responses";

const router = express.Router();

router.get("/", compression(), (req, res) => {
  controller
    .getAllClientes()
    .then((clientes) => {
      responses.success({ req, res, data: clientes });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener los clientes",
        details: err,
      });
    });
});

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
