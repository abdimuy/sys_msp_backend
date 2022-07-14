import { query } from "../../repositories/connection";
import { IQueryConverter } from "../../repositories/fbRepository";
import {
  QUERY_GET_VENTAS_BY_CLIENTE,
  QUERY_GET_ARTICULOS_BY_FOLIO,
  // QUERY_GET_VENTAS_BY_RUTA,
  // QUERY_GET_PAGOS_BY_VENTAS_ID,
  QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO,
  QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO,
  // QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_1,
  // QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_2,
} from "./queries";

interface IGetVentasByClienteStore {
  clienteId: number;
}

const convertersVentas: IQueryConverter[] = [
  {
    column: "CONCEPTO",
    type: "buffer",
  },
  {
    column: "DESCRIPCION",
    type: "buffer",
  },
  {
    column: "CANCELADO",
    type: "buffer",
  },
  {
    column: "APLICADO",
    type: "buffer",
  },
  {
    column: "ESTATUS",
    type: "buffer",
  },
  {
    column: "FOLIO",
    type: "buffer",
  },
  {
    column: "VENDEDOR_1",
    type: "buffer",
  },
  {
    column: "VENDEDOR_2",
    type: "buffer",
  },
  {
    column: "VENDEDOR_3",
    type: "buffer",
  },
  {
    column: "FORMA_DE_PAGO",
    type: "buffer",
  },
];

const getVentasByCliente = ({ clienteId }: IGetVentasByClienteStore) => {
  return new Promise<Array<any>>((resolve, reject) => {
    try {
      const ventas = query({
        sql: QUERY_GET_VENTAS_BY_CLIENTE,
        params: [clienteId],
        converters: convertersVentas,
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasByRuta = (clientesId: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await query({
        sql: QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO(clientesId),
        converters: [
          {
            column: "FREC_PAGO",
            type: "buffer",
          },
          {
            column: "FOLIO",
            type: "buffer",
          },
          {
            column: "DOMICILIO",
            type: "buffer",
          },
          {
            column: "VENDEDOR_1",
            type: "buffer",
          },
          {
            column: "VENDEDOR_2",
            type: "buffer",
          },
          {
            column: "VENDEDOR_3",
            type: "buffer",
          },
          {
            column: "LOCALIDAD",
            type: "buffer",
          },
          {
            column: "RUTA",
            type: "buffer",
          },
        ],
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasById = (ventasId: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await query({
        sql: QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO(ventasId),
        converters: [
          {
            column: "FREC_PAGO",
            type: "buffer",
          },
          {
            column: "FOLIO",
            type: "buffer",
          },
          {
            column: "DOMICILIO",
            type: "buffer",
          },
          {
            column: "VENDEDOR_1",
            type: "buffer",
          },
          {
            column: "VENDEDOR_2",
            type: "buffer",
          },
          {
            column: "VENDEDOR_3",
            type: "buffer",
          },
        ],
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasProductosByFolio = (folios: string[]) => {
  return new Promise<any[]>(async (resolve, reject) => {
    const foliosStr = QUERY_GET_ARTICULOS_BY_FOLIO(folios.join("','"));
    const productos = await query({
      sql: foliosStr,
      params: [],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
      ],
    });
    // const productos = await getProductosByVentaId(
    //   ventas.map((venta) => venta.DOCTO_PV_ID)
    // );
    resolve(productos);
  });
};

// const getProductosByVentaId = (ventaIds: number[]) => {
//   return new Promise<any[]>((resolve, reject) => {
//     try {
//       const productos = query({
//         sql:
//           QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_1 +
//           ventaIds.join(",") +
//           QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_2,
//         params: [],
//       });
//       resolve(productos);
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

export default {
  ventasByCliente: getVentasByCliente,
  ventasProductosByFolio: getVentasProductosByFolio,
  ventasByRuta: getVentasByRuta,
  ventasById: getVentasById,
};
