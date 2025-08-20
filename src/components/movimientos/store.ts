import { query } from "../../repositories/fbRepository";
import {
  QUERY_GET_MOVIMIENTOS,
  QUERY_GET_MOVIMIENTOS_BY_ALMACEN_ID,
} from "./querys";
import { IQueryConverter } from "../../repositories/fbRepository";
import { ApiMicrosip } from "../../repositories/apiMicrosip";

const converter: IQueryConverter[] = [
  {
    type: "buffer",
    column: "DESCRIPCION",
  },
  {
    type: "buffer",
    column: "USUARIO_ULT_MODIF",
  },
  {
    type: "buffer",
    column: "FOLIO",
  },
  {
    type: "buffer",
    column: "CONCEPTO",
  },
];

const getMovimientos = () => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const movimientos = await query({
        sql: QUERY_GET_MOVIMIENTOS,
        params: [15],
        converters: converter,
      });
      resolve(movimientos);
    } catch (err) {
      reject(err);
    }
  });
};

const getMovimientosOneAlmacen = (almacenId: number) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const movimientos = await query({
        sql: QUERY_GET_MOVIMIENTOS_BY_ALMACEN_ID,
        params: [15, almacenId],
        converters: converter,
      });
      resolve(movimientos);
    } catch (err) {
      reject(err);
    }
  });
};
export default {
  list: getMovimientos,
  oneByAlmacen: getMovimientosOneAlmacen,
};
