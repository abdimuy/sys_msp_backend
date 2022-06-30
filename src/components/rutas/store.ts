import { query } from "../../repositories/fbRepository";
import { QUERY_GET_RUTAS, QUERY_GET_CTAS_POR_RUTAS } from "./queries";

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
    const numCtasRutas = await query({
      sql: QUERY_GET_CTAS_POR_RUTAS,
    });
    resolve(numCtasRutas);
  });
};

export default {
  getRutas,
  getNumCtasByRuta,
};
