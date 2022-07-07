import { query } from "../../repositories/fbRepository";
import {
  QUERY_GET_MOVIMIENTOS,
  QUERY_GET_MOVIMIENTOS_BY_ALMACEN_ID,
} from "./querys";
import { IQueryConverter } from "../../repositories/fbRepository";
import { ApiMicrosip } from "../../repositories/apiMicrosip";
import { IMovimiento, ITraspaso } from "./controller";
import axios, { Axios } from "axios";

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

const setMovimiento = (traspaso: ITraspaso) => {
  const {
    almacenEndId,
    almacenInitId,
    conceptoId,
    descripcion,
    fecha,
    movimientos,
  } = traspaso;
  return new Promise<Axios>(async (resolve, reject) => {
    try {
      const traspasoApi = {
        concepto_id: conceptoId,
        almacen_init_id: almacenInitId,
        almacen_finish_id: almacenEndId,
        fecha: fecha,
        descripcion: descripcion,
        lista: movimientos.map((movimiento) => ({
          articulo_id: movimiento.articuloId,
          unidades: movimiento.cantidad,
        })),
      };
      const response = await ApiMicrosip.post("inventory", traspasoApi);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  list: getMovimientos,
  oneByAlmacen: getMovimientosOneAlmacen,
  set: setMovimiento,
};
