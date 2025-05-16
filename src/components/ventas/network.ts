import express from "express";
import controller from "./controller";
import responses from "../../network/responses";
import moment from "moment";

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

// router.get("/all-with-cliente", (req, res) => {
//   console.log("entro");
//   controller
//     .getAllVentasWithCliente()
//     .then((ventas) => {
//       responses.success({ req, res, data: ventas });
//     })
//     .catch((err) => {
//       responses.error({
//         req,
//         res,
//         error: "Error al obtener las ventas",
//         details: err,
//       });
//     });
// });

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

router.get("/getAllVentasByZona/:zonaId", (req, res) => {
  const { zonaId } = req.params;
  const dateInit = moment(req.query.dateInit as string)
  const ZONA_ID = Number(zonaId) || 0
  controller.getVentasByZona(ZONA_ID, dateInit)
    .then(result => {
      responses.success({
        data: result,
        req,
        res,
      })
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        details: err,
        error: "Error al obtener las ventas por zona"
      })
    })
})

router.post("/add-pago", (req, res) => {
  const {
    pago
  } = req.body
  controller.addPago(pago)
    .then(response => {
      responses.success({
        req, res, data: response
      })
    })
    .catch(err => {
      responses.error({
        req, res, error: "Error al insertar el pago", details: err
      })
    })
})

router.get('/get-ventas-by-zona-cliente/:zona_cliente_id', (req, res) => {
  const {
    zona_cliente_id
  } = req.params

  controller.getVentasByZonaCliente(Number(zona_cliente_id))
    .then(ventas => {
      responses.success({
        req, res, data: ventas
      })
    }).catch(err => {
      console.log(err)
    })
})

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
