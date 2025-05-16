import { Router } from "express";
import controller from "../controller";
import responses from "../../../network/responses";

const router = Router()

router.get("/", (req, res) => {
    controller.processData().then(result => {
        responses.success({
            req,
            res,
            data: 'Datos procesados con exito'
        })
    })
})

export default router;