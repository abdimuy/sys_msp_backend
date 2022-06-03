import { query } from '../../repositories/connection';
import {
  QUERY_GET_ALMACENES,
  QUERY_GET_ALMACENES_BY_ID,
  QUERY_GET_ALMACEN_BY_ID,
  QUERY_GET_ALMACEN_EXISTENCIAS_BY_ID
} from './querys';

const getAlmacenes = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await query({ sql: QUERY_GET_ALMACENES });
      resolve(result);
    } catch (error) {
      reject(error);
    };
  });
};

const getOneAlmacen = (almacenId: number, comparation: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [articulos, almacen] = await Promise.all([
        getAlmacenMov({almacenId, comparation}),
        query({
          sql: QUERY_GET_ALMACEN_EXISTENCIAS_BY_ID,
          params: [almacenId]
        })
      ])
      resolve({
        ARTICULOS: articulos,
        ALMACEN: almacen[0]
      });
    } catch (error) {
      reject(error);
    };
  })
}

interface IGetAlmacenMov {
  almacenId: number
  comparation?: string
}

const getAlmacenMov = ({almacenId, comparation = '' }: IGetAlmacenMov) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await query({
        sql: QUERY_GET_ALMACENES_BY_ID,
        params: [almacenId, comparation]
      })
      resolve(result);
    } catch (error) {
      reject(error);
    };
  })
};

const getAlmacenInfo = (almacenId: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await query({
        sql: QUERY_GET_ALMACEN_BY_ID,
        params: [almacenId]
      })
      resolve(result[0]);
    } catch (error) {
      reject(error);
    };
  });
};

export default {
  list: getAlmacenes,
  one: getOneAlmacen,
  oneOnlyMovs: getAlmacenMov,
  oneOnlyInfo: getAlmacenInfo
};