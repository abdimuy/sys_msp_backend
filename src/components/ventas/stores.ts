import moment from "moment";
import { query } from "../../repositories/connection";
import { IQueryConverter } from "../../repositories/fbRepository";
import { db } from "../../repositories/firebase";
import {
  QUERY_GET_VENTAS_BY_CLIENTE,
  QUERY_GET_ARTICULOS_BY_FOLIO,
  // QUERY_GET_VENTAS_BY_RUTA,
  // QUERY_GET_PAGOS_BY_VENTAS_ID,
  QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO,
  QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO,
  QUERY_GET_ALL_VENTAS_WITH_CLIENTE,
  QUERY_GET_NEXT_FOLIO_CR,
  QUERTY_INSERT_PAGO,
  QUERY_GET_CLAVE_CLIENTE,
  QUERY_INSERT_PAGO_IMPORTES,
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

const getAllVentasWithCliente = () => {
  return new Promise<any[]>(async (resolve, reject) => {
    const ultimoMartes = moment().day("Tuesday").format("YYYY-MM-DD");
    const inicioSemana = moment().day(0).format("YYYY-MM-DD");
    console.log({ inicioSemana, ultimoMartes });
    const numCtasRutas = await query({
      sql: QUERY_GET_ALL_VENTAS_WITH_CLIENTE,
      params: [inicioSemana, ultimoMartes, ultimoMartes],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
        {
          column: "ZONA_NOMBRE",
          type: "buffer",
        },
        {
          column: "TELEFONO",
          type: "buffer",
        },
        {
          column: "APLICADO",
          type: "buffer",
        },
        {
          column: "CALLE",
          type: "buffer",
        },
        {
          column: "NOTAS",
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
    resolve(numCtasRutas);
  });
};

/**
 * Inserta todas las ventas con cliente en la colección de ventas de Firebase
 */
const setAllVentasWithCliente = async () => {
  const ventas = await getAllVentasWithCliente();
  const collectionRef = db.collection("ventas");
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < ventas.length; i++) {
    const item = ventas[i];
    const docRef = collectionRef.doc(); // Genera una nueva referencia de documento
    batch.set(docRef, {
      ...item,
      ESTADO_COBRANZA: "PENDIENTE",
    });
    batchCount++;

    if (batchCount === BATCH_SIZE) {
      // Commit the batch
      await batch.commit();
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} committed`);
      batch = db.batch();
      batchCount = 0;

      // Esperar un poco antes de continuar con el siguiente lote
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 segundo de pausa
    }
  }
};

const getNextFolioCR = async (): Promise<string> => {
  const folio = await query({
    sql: QUERY_GET_NEXT_FOLIO_CR,
  });

  return folio[0].FOLIO;
};

const listeningPagos = () => {
  console.log("Listening pagos");
  db.collection("pagos").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        console.log(data);
        await insertDataToFirebird(
          data.CLIENTE_ID,
          data.FECHA_HORA_PAGO,
          data.COBRADOR,
          data.COBRADOR_ID,
          data.LAT,
          data.LNG,
          data.IMPORTE
        );
      }
    });
  });
};

const insertDataToFirebird = async (
  clienteId: number,
  fechaHoraPago: string,
  cobrador: string,
  cobradorId: number,
  lat: number,
  lng: number,
  importe: number
) => {
  try {
    const claveCliente = await getClaveCliente(clienteId);
    const result = await query({
      sql: QUERTY_INSERT_PAGO,
      params: [
        -1,
        87327,
        getNextFolioCR(),
        "R",
        225490,
        moment().format("YYYY-MM-DD"),
        moment().format("HH:mm:ss"),
        claveCliente,
        0,
        fechaHoraPago,
        clienteId,
        1,
        "N",
        "N",
        cobrador,
        234,
        null,
        cobradorId,
        "N",
        "N",
        "N",
        null,
        null,
        0,
        null,
        "CC",
        "N",
        "P",
        moment().format("YYYY-MM-DD"),
        "N",
        "N",
        "PREIMP",
        false,
        null,
        "N",
        moment().format("YYYY-MM-DD"),
        null,
        "N",
        null,
        null,
        "N",
        "N",
        null,
        null,
        null,
        null,
        null,
        "COBRANZA EN RUTA 2.0",
        moment().format("YYYY-MM-DD"),
        null,
        "COBRANZA EN RUTA 2.0",
        moment().format("YYYY-MM-DD HH:mm:ss"),
        "COBRANZA EN RUTA 2.0",
        null,
        null,
        null,
        lat,
        lng,
        null,
      ],
    });
    console.log(result[0].DOCTO_CC_ID);
    await query({
      sql: QUERY_INSERT_PAGO_IMPORTES,
      params: [
        -1,
        result[0].DOCTO_CC_ID,
        moment().format("YYYY-MM-DD"),
        "N",
        "N",
        "N",
        "C",
        result[0].DOCTO_CC_ID,
        importe,
        0,
        0,
        0,
        0,
        0,
      ],
    });
    return true;
  } catch (err) {
    console.log(err);
  }
};

const getClaveCliente = async (clienteId: number) => {
  const claveCliente = await query({
    sql: QUERY_GET_CLAVE_CLIENTE,
    params: [clienteId],
  });
  return claveCliente[0].CLAVE_CLIENTE || "";
};

export default {
  ventasByCliente: getVentasByCliente,
  ventasProductosByFolio: getVentasProductosByFolio,
  ventasByRuta: getVentasByRuta,
  ventasById: getVentasById,
  allVentasWithCliente: getAllVentasWithCliente,
  setAllVentasWithCliente,
  getNextFolioCR,
  listeningPagos,
};
