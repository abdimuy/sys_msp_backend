import { query } from "../../repositories/fbRepository";
import { GET_ZONAS_CLIENTE } from "./queries";

const getZonasCliente = async () => {
  const sql = GET_ZONAS_CLIENTE;
  return query({
    sql,
    params: [],
    converters: [
      {
        column: "ZONA_CLIENTE",
        type: "buffer",
      },
    ],
  });
};

export default { getZonasCliente };
