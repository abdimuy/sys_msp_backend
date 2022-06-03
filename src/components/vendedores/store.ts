import { query } from "../../repositories/fbRepository";
import { QUERY_GET_VENDEDORES } from "./queries";

const getVendedores = () => {
  return new Promise((resolve, reject) => {
    try {
      const vendedores = query({
        sql: QUERY_GET_VENDEDORES,
        converters: [
          {
            column: 'NOMBRE',
            type: 'buffer'
          }
        ]
      });
      resolve(vendedores);
    } catch (err) {
      reject(err);
    };
  });
};

export default {
  list: getVendedores,
};