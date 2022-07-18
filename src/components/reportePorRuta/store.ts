import {
  QUERY_GET_REPORTS_BY_RUTA,
  QUERY_GET_PORCENTAJE_PARCIALIDAD_POR_RUTA,
} from "./queries";
import { query } from "../../repositories/fbRepository";

const getReportsRutas = (semanas: string) => {
  return new Promise<any[]>((resolve, reject) => {
    resolve(
      query({
        sql: QUERY_GET_REPORTS_BY_RUTA(semanas),
        converters: [{ column: "ZONA", type: "buffer" }],
      })
    );
  });
};

const getPorcentajeBaseParcialidadPorRuta = (semana: number) => {
  return new Promise<any[]>((resolve, reject) => {
    resolve(
      query({
        sql: QUERY_GET_PORCENTAJE_PARCIALIDAD_POR_RUTA,
        params: [semana],
      })
    );
  });
};

export default {
  listReportsRuta: getReportsRutas,
  listPorcentajesParcialidadRuta: getPorcentajeBaseParcialidadPorRuta,
};
