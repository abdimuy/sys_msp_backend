import store from "./store";
import { validate } from "uuid";

const getPagosByVentaId = (id: number) => {
    return new Promise((resolve, reject) => {
        resolve(store.getPagosByVentaId(id))
    })
}

const existUniqueIdPago = (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const isUUID = validate(id)
        if (isUUID) {
            resolve(store.existUniqueIdPago(id))
        } else {
            resolve(true)
        }
    })
}

export default {
    existUniqueIdPago,
    getPagosByVentaId
}