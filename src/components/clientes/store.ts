import { query } from "../../repositories/fbRepository";
import {
  QUERY_GET_CLIENTE_BY_ID,
  QUERY_GET_CLIENTE_BY_TEXT,
  QUERY_GET_CLIENTE_BY_RUTA,
} from "./queries";
import { IQueryConverter } from "../../repositories/fbRepository";

interface IGetClienteByIdStore {
  clienteId: number;
}

const converters: IQueryConverter[] = [
  {
    column: "ZONA",
    type: "buffer",
  },
  {
    column: "TELEFONO",
    type: "buffer",
  },
];

const getClienteById = ({ clienteId }: IGetClienteByIdStore) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const cliente = await query({
        sql: QUERY_GET_CLIENTE_BY_ID,
        params: [clienteId],
        converters: converters,
      });
      resolve(cliente);
    } catch (err) {
      reject(err);
    }
  });
};

const getClienteByText = (text: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cliente = await query({
        sql: QUERY_GET_CLIENTE_BY_TEXT,
        params: [text, text],
        converters: converters,
      });
      resolve(cliente);
    } catch (err) {
      reject(err);
    }
  });
};

const getClientesByRuta = (rutaId: number) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const clientesList = await query({
        sql: QUERY_GET_CLIENTE_BY_RUTA,
        params: [rutaId],
      });
      resolve(clientesList);
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  getCliente: getClienteById,
  getClienteByText,
  getClientesByRuta,
};
