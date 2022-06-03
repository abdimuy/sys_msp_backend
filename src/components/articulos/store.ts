import {
  QUERY_GET_EXISTENCIAS,
} from "./querys";
import { IQueryConverter, query } from "../../repositories/fbRepository";
import {
  ALMACEN_ID_DEFAULT,
  ARTICULO_ESTATUS_DEFAULT
} from "../../constants/fbStoreConstanst";

const converters: IQueryConverter[] = [
  {
    column: 'ESTATUS',
    type: 'buffer'
  }
]

interface IGetArticulosParams {
  almacenId?: number;
  estatus?: 'A' | 'B' | 'C';
}

const getArticulos = (args: IGetArticulosParams = {}) => {
  const {
    almacenId = ALMACEN_ID_DEFAULT,
    estatus = ARTICULO_ESTATUS_DEFAULT
  } = args;
  return new Promise(async (resolve, reject) => {
    try {
      const articulos = await query({
        sql: QUERY_GET_EXISTENCIAS,
        params: [almacenId, estatus],
      });
      resolve(articulos);
    } catch (err) {
      reject(err);
    };
  });
};

const getArticulo = () => {
  return new Promise((resolve, reject) => {
    
  })
}

export default {
  list: getArticulos,
};