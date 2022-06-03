import { query } from "../../repositories/connection";
import { IQueryConverter } from "../../repositories/fbRepository";
import {
  QUERY_GET_VENTAS_BY_CLIENTE,
  QUERY_GET_ARTICULOS_BY_FOLIO,
  QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID,
  QUERY_GET_VENTAS_BY_RUTA,
  QUERY_GET_PAGOS_BY_VENTAS_ID,
  QUERY_GET_VENTES_BY_CLIENTES_SIMPLIFICADO,
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

const getVentasByRuta = (cajaId: number) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await query({
        sql: QUERY_GET_VENTES_BY_CLIENTES_SIMPLIFICADO,
        converters: [
          {
            column: "FREC_PAGO",
            type: "buffer",
          },
        ],
      });

      let ventasIds = ``;
      ventas.forEach((venta, index) => {
        ventasIds += `${index === 0 ? "" : ","}${venta.DOCTO_CC_ID}`;
      });

      // const pagos = query({
      //   sql: `${QUERY_GET_PAGOS_BY_VENTAS_ID} (${ventasIds})`,
      //   params: [ventasIds],
      //   converters: convertersVentas,
      // });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasProductosByFolio = (folio: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    const venta = await query({
      sql: QUERY_GET_ARTICULOS_BY_FOLIO,
      params: [folio],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
      ],
    });
    const productos = await getProductosByVentaId(venta[0]?.DOCTO_PV_ID);
    resolve(productos);
  });
};

const getProductosByVentaId = (ventaId: number) => {
  return new Promise<any[]>((resolve, reject) => {
    try {
      const productos = query({
        sql: QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID,
        params: [ventaId],
      });
      resolve(productos);
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  ventasByCliente: getVentasByCliente,
  ventasProductosByFolio: getVentasProductosByFolio,
  ventasByRuta: getVentasByRuta,
};
