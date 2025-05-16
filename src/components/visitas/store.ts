import { query } from "../../repositories/fbRepository";
import { PagoOrVisita, Visita } from "./types";
import { GET_PAGOS_AND_VISITAS_BY_FECHA, GET_VISITAS_BY_DATE_AND_ZONA_CLIENTE_ID, GET_VISITAS_BY_ID, SET_VISITA } from "./queries";
import moment, { Moment } from "moment";

const getVisitaById = (visitaId: string):Promise<Visita> => {
    return new Promise((resolve, reject) => {
        query({
            sql: GET_VISITAS_BY_ID,
            params: [visitaId]
        }).then((values) => {
            if(values.length === 0) {
                reject('La visita no existe')
                return
            }
            const visita = values[0]
            resolve(visita as any)
        }).catch(err => {
            reject(err)
        })
    })
}

const addVisita = (visita: Visita) => {
    return new Promise((resolve, reject) => {
        resolve(query({
            sql: SET_VISITA,
            params: [
                visita.ID,
                visita.CLIENTE_ID,
                visita.COBRADOR,
                visita.COBRADOR_ID,
                moment(visita.FECHA).format("YYYY-MM-DD HH:mm:ss"),
                visita.FORMA_COBRO_ID,
                visita.LAT,
                visita.LNG,
                visita.NOTA,
                visita.TIPO_VISITA,
                visita.ZONA_CLIENTE_ID,
                visita.IMPTE_DOCTO_CC_ID ? visita.IMPTE_DOCTO_CC_ID : null
            ]
        }))
    })
}

const getVisitasByDateAndZonaCliente = (dateStart: Moment, dateEnd: Moment, zonaClienteId: number): Promise<Visita[]> => {
    return new Promise((resolve, reject) => {
        resolve(
            query({
                sql: GET_VISITAS_BY_DATE_AND_ZONA_CLIENTE_ID,
                params: [
                    dateStart.format('YYYY-MM-DD HH:mm:ss'),
                    dateEnd.format('YYYY-MM-DD HH:mm:ss'),
                    zonaClienteId
                ]
            })
        )
    })
}

const getPagosAndVisitasByFecha = (dateInit: Moment, dateEnd: Moment, zonaClienteId: number): Promise<PagoOrVisita[]> => {
    return new Promise((resolve, reject) => {
        const sql = GET_PAGOS_AND_VISITAS_BY_FECHA(
            dateInit.format('YYYY-MM-DD HH:mm:ss'),
            dateEnd.format('YYYY-MM-DD HH:mm:ss'),
            zonaClienteId
        )
        query({
            sql: sql,
            converters: [
                {
                    column: "LAT",
                    type: "buffer"
                },
                {
                    column: "LNG",
                    type: "buffer"
                }
            ]
        }).then((response: PagoOrVisita[]) => {
            resolve(response)
        }).catch(err => {
            reject(err)
        })
    })
}

export default {
    getVisitaById,
    addVisita,
    getVisitasByDateAndZonaCliente,
    getPagosAndVisitasByFecha
}