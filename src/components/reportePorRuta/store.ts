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
      })
    );
  });
};

const getPorcentajeBaseParcialidadPorRuta = () => {
  return new Promise<any[]>((resolve, reject) => {
    resolve(
      query({
        sql: QUERY_GET_PORCENTAJE_PARCIALIDAD_POR_RUTA,
      })
    );
  });
};

export default {
  listReportsRuta: getReportsRutas,
  listPorcentajesParcialidadRuta: getPorcentajeBaseParcialidadPorRuta,
};
