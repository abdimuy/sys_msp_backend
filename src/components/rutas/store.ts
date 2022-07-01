import { query } from "../../repositories/fbRepository";
import { QUERY_GET_RUTAS, QUERY_GET_CTAS_POR_RUTAS } from "./queries";
import moment from "moment";

const getRutas = () => {
  return new Promise((resolve, reject) => {
    try {
      const rutas = query({
        sql: QUERY_GET_RUTAS,
      });
      resolve(rutas);
    } catch (err) {
      reject(err);
    }
  });
};

const getNumCtasByRuta = () => {
  return new Promise<any[]>(async (resolve, reject) => {
    const ultimoMartes = moment().day("Tuesday").format("YYYY-MM-DD");
    const inicioSemana = moment().day(0);
    const finalSemana = moment().day(6);
    console.log({ inicioSemana, finalSemana });
    const numCtasRutas = await query({
      sql: QUERY_GET_CTAS_POR_RUTAS,
      params: [ultimoMartes, inicioSemana, ultimoMartes],
    });
    resolve(numCtasRutas);
  });
};

export default {
  getRutas,
  getNumCtasByRuta,
};
