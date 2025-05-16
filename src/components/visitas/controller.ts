import { PagoOrVisita, Visita } from "./types";
import store from "./store";
import { Moment } from "moment";

const addVisita = (visita: Visita): Promise<string> => {
    return new Promise((resolve, reject) => {
        getVisitaById(visita.ID)
            .then(visita => {
                resolve("La visita ya existe")
            }).catch(err => {
                if (err === "La visita no existe") {
                    store.addVisita(visita)
                    .then(response => {
                        resolve("Visita agregada con exito")
                    }).catch(err => {
                        reject(err)
                    })
                } else {
                    reject(err)
                }
            })
    })
}

const getVisitasByDateAndZonaCliente = (dateStart: Moment, dateEnd: Moment, zonaClienteId: number) => {
    return new Promise((resolve: (value: Visita[]) => void, reject) => {
        return store.getVisitasByDateAndZonaCliente(dateStart, dateEnd, zonaClienteId)
            .then((visitas) => {
                resolve(visitas)
            }).catch((err) => {
                reject(err)
            })
    })
}

const getVisitaById = (visitaId: string):Promise<Visita> => {
    return new Promise((resolve, reject) => {
        return resolve(store.getVisitaById(visitaId))
    })
}

const getPagosAndVisitasByFecha = (dateInit: Moment, dateEnd: Moment, zonaClienteId: number): Promise<PagoOrVisita[]> => {
    return new Promise((resolve, reject) => {
        return resolve(store.getPagosAndVisitasByFecha(dateInit, dateEnd, zonaClienteId))
    })
}

export default {
    addVisita,
    getVisitasByDateAndZonaCliente,
    getPagosAndVisitasByFecha
}