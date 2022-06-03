import { query } from "../../repositories/fbRepository";
import { QUERY_GET_MOVIMIENTO_INDIV } from "./querys";
import { IQueryConverter } from "../../repositories/fbRepository";
import { ALMACEN_ID_DEFAULT } from "../../constants/fbStoreConstanst";

const converters: IQueryConverter[] = [
  {
    column: 'TIPO_MOVTO',
    type: 'buffer'
  },
  {
    column: 'CANCELADO',
    type: 'buffer'
  },
  {
    column: 'APLICADO',
    type: 'buffer'
  },
  {
    column: 'COSTEO_PEND',
    type: 'buffer'
  },
  {
    column: 'PEDIMENTO_PEND',
    type: 'buffer'
  },
  {
    column: 'ROL',
    type: 'buffer'
  },
  {
    column: 'CONCEPTO',
    type: 'buffer'
  }
];

interface IGetMovimientosIndiv {
  limit?: number;
  id?: number[] | string[];
  almacenId?: number;
}

const getMovimientosIndiv = ({ limit = 100, id = [], almacenId = ALMACEN_ID_DEFAULT }: IGetMovimientosIndiv = {}) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const movimientosIndiv = await query({
        sql: QUERY_GET_MOVIMIENTO_INDIV + ` (${id.join(',')})`,
        params: [almacenId],
        converters: converters
      });
      resolve(movimientosIndiv);
    } catch (err) {
      reject(err);
    };
  });
};

export default {
  list: getMovimientosIndiv,
}