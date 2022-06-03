import { QUERY_GET_LINEA_ARTICULOS } from "./querys";
import { query } from "../../repositories/fbRepository";

const getLineasArticulos = () => {
  return new Promise(async(resolve, reject) => {
    try {
      const lineasArticulos = await query({
        sql: QUERY_GET_LINEA_ARTICULOS,
      });
      resolve(lineasArticulos);
    } catch (error) {
      reject(error);
    };
  });
};

export default {
  list: getLineasArticulos,
}