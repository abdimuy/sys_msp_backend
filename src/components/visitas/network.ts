import { Router, response } from "express";
import controller from "./controller";
import moment from "moment";
import responses from "../../network/responses";
import { Visita } from "./types";

const router = Router()

router.get("/", (req, res) => {
    const dateStart = moment(req.query.dateStart as string)
    const dateEnd = moment(req.query.dateEnd as string)
    const zonaClienteId = Number(req.query.zonaClienteId as string)
    controller.getVisitasByDateAndZonaCliente(
        dateStart,
        dateEnd,
        zonaClienteId
    ).then((visitas) => {
        responses.success({
            req, res, data: visitas
        })
    }).catch((err) => {
        responses.error({
            req, res, error: "Error al obtener las visitas", details: err
        })
    })
})

router.post("/", (req, res) => {
    const visitaData = req.body as Visita
    controller.addVisita(visitaData)
        .then((response) => {
            responses.success({
                req, res, data: "Visita agregada con exito",
            })
        }).catch(err => {
            responses.error({
                req, res, error: "Error al agregar la visita", details: err
            })
        })
})

router.get("/pagos-visitas", (req, res) => {
    const dateInit = moment(req.query.dateInit as string).startOf("day")
    const dateEnd = moment(req.query.dateEnd as string).endOf('day')
    const zonaClienteId = Number(req.query.zonaClienteId)

    controller.getPagosAndVisitasByFecha(dateInit, dateEnd, zonaClienteId)
        .then(pagosAndVisitas => {
            responses.success({
                req, res, data: pagosAndVisitas
            })
        }).catch(err => {
            responses.error({
                req,
                res,
                error: 'Error al obtener los pagos y las visitas',
                details: err
            })
        })
})

export default router;