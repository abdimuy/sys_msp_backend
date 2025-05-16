import { Router, response } from "express";
import controller from "./controller";
import responses from "../../network/responses";

const router = Router();

router.get("/pagos-by-id/:id", (req, res) => {
    const { id } = req.params
    const idNumber = parseInt(id)

    controller.getPagosByVentaId(idNumber)
        .then((pagos) => {
            responses.success({
                req, res, data: pagos
            })
        }).catch((err) => {
            responses.error({
                req,
                res,
                error: "Error al obtener los pagos por cliente",
                details: err
            })
        })
})

router.get("exist-id-unique-pago", (req, res) => {
    const id = req.query.id as string
    controller.existUniqueIdPago(id)
        .then(() => {
            responses.success({
                req, res, data: 'El id del pago ya esta registrado'
            })
        }).catch(err => {
            responses.error({
                req, res, error: "Hubo un problema al validar la existencia del id", details: err
            })
        })
})

export default router;