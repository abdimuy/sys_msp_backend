import moment from "moment";
import "moment-timezone";
import { query } from "../../repositories/connection";
import { IQueryConverter, pool } from "../../repositories/fbRepository";
import { db } from "../../repositories/firebase";
import Firebird from "node-firebird";
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
  QUERY_UPDATE_FOLIO_CR,
  // QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_1,
  // QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_2,
} from "./queries";
import { Timestamp } from "../../repositories/firebase";

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

const getVentasProductosByFolio = async (folios: string[]): Promise<any[]> => {
  let productos: any[] = [];

  const getProductosByFolios = async (
    foliosBatch: string[]
  ): Promise<any[]> => {
    const foliosStr = QUERY_GET_ARTICULOS_BY_FOLIO(foliosBatch.join("','"));
    const productosList = await query({
      sql: foliosStr,
      params: [],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
      ],
    });
    return productosList;
  };

  if (folios.length < 1500) {
    return await getProductosByFolios(folios);
  }

  let i = 0;
  while (i < folios.length) {
    const foliosBatch = folios.slice(i, i + 1500);
    const productosBatch = await getProductosByFolios(foliosBatch);
    productos = productos.concat(productosBatch);
    i += 1500;
  }

  return productos;
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
  const folios = ventas.map((venta) => venta.FOLIO as string);
  const productos = await getVentasProductosByFolio(folios);
  console.log("Productos: ", productos.length);
  console.log("Ventas: ", ventas.length);

  const collectionRef = db.collection("ventas");
  const collectionRefProductos = db.collection("ventas_productos");
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

  let batchProductos = db.batch();
  let batchCountProductos = 0;

  for (let i = 0; i < productos.length; i++) {
    const item = productos[i];
    const docRef = collectionRefProductos.doc(); // Genera una nueva referencia de documento
    batchProductos.set(docRef, item);
    batchCountProductos++;

    if (batchCountProductos === BATCH_SIZE) {
      // Commit the batch
      await batchProductos.commit();
      console.log(
        `Batch productos ${Math.floor(i / BATCH_SIZE) + 1} committed`
      );
      batchProductos = db.batch();
      batchCountProductos = 0;

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
  const currentDate = moment();
  console.log("Listening pagos");
  db.collection("pagos")
    .where("FECHA_HORA_PAGO", ">", currentDate.toDate())
    .onSnapshot((snapshot) => {
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
            data.IMPORTE,
            data.DOCTO_CC_ACR_ID
          );
        }
      });
    });
};

const insertDataToFirebird = async (
  clienteId: number,
  fechaHoraPago: Timestamp,
  cobrador: string,
  cobradorId: number,
  lat: number,
  lng: number,
  importe: number,
  doctoAcrId: number
) => {
  try {
    pool.get((err, db) => {
      if (err) {
        console.error(err);
        return;
      }
      db.transaction(
        Firebird.ISOLATION_READ_COMMITED,
        async (err, transaction) => {
          transaction.query(
            QUERY_GET_NEXT_FOLIO_CR,
            [clienteId],
            (err, result) => {
              console.log("result: ", result);
              const folioNumber = result[0].FOLIO;
              if (err) {
                console.error(err);
                transaction.rollback();
              }
              transaction.query(
                QUERY_UPDATE_FOLIO_CR,
                [],
                async (err, result) => {
                  if (err) {
                    console.error(err);
                    transaction.rollback();
                  }

                  const claveCliente = await getClaveCliente(clienteId);
                  const folio = "CR" + folioNumber;

                  const params = [
                    -1,
                    87327,
                    folio,
                    "R",
                    225490,
                    moment().format("YYYY-MM-DD"),
                    moment().format("HH:mm:ss"),
                    claveCliente,
                    0,
                    moment().format(
                      moment(fechaHoraPago.toDate()).format(
                        "YYYY-MM-DD HH:mm:ss"
                      )
                    ),
                    clienteId,
                    1,
                    "N",
                    "S",
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
                    "P",
                    "P",
                    null,
                    "N",
                    "N",
                    "PREIMP",
                    "false",
                    null,
                    "N",
                    moment().format("YYYY-MM-DD HH:mm:ss"),
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
                    moment().format("YYYY-MM-DD HH:mm:ss"),
                    null,
                    "COBRANZA EN RUTA 2.0",
                    moment().format("YYYY-MM-DD HH:mm:ss"),
                    "COBRANZA EN RUTA 2.0",
                    null,
                    null,
                    null,
                    lat.toString(),
                    lng.toString(),
                    null,
                  ];

                  transaction.query(
                    QUERTY_INSERT_PAGO,
                    params,
                    (err, result) => {
                      if (err) {
                        console.error(err);
                        transaction.rollback();
                      }
                      console.log("result: ", result);
                      const idDoctoCCID = (result as any).DOCTO_CC_ID;

                      let params = [
                        -1,
                        idDoctoCCID,
                        moment().format("YYYY-MM-DD"),
                        "N",
                        "S",
                        "N",
                        "R",
                        doctoAcrId,
                        importe,
                        0,
                        0,
                        0,
                        0,
                        0,
                      ];
                      transaction.query(
                        QUERY_INSERT_PAGO_IMPORTES,
                        params,
                        (err, result) => {
                          if (err) {
                            console.error(err);
                            transaction.rollback();
                          }
                          transaction.commit((err) => {
                            if (err) {
                              console.error(err);
                              transaction.rollback();
                            }
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
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
