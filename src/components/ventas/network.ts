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

router.get("/all-with-cliente", (req, res) => {
  console.log("entro");
  controller
    .getAllVentasWithCliente()
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

router.get("/update-all-with-cliente", (req, res) => {
  controller
    .setAllVentasWithCliente()
    .then(() => {
      responses.success({ req, res, data: "Ventas actualizadas" });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al actualizar las ventas",
        details: err,
      });
    });
});

router.get("/folio-cr", (req, res) => {
  controller
    .getNextFolioCR()
    .then((folio) => {
      responses.success({
        req,
        res,
        data: {
          FOLIO: folio,
        },
      });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: "Error al obtener el folio",
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
